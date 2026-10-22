import { createHmac, pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";

const ITERATIONS = 100_000;
const TOKEN_LIFETIME_SECONDS = 60 * 60 * 8;

const JWT_SECRET_MISSING =
  "JWT_SECRET is not set. Generate one with: openssl rand -hex 32 — and set it in the environment. Without a stable secret every restart invalidates all issued tokens, and each replica signs with a different key.";

let cachedSecret: string | undefined;

/** The HS256 signing secret. Resolved on first use so a project without tokens still boots. */
function secret(): string {
  if (cachedSecret === undefined) {
    const configured = process.env.JWT_SECRET;
    if (!configured) throw new Error(JWT_SECRET_MISSING);
    cachedSecret = configured;
  }
  return cachedSecret;
}

function derive(password: string, salt: Buffer, iterations: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    pbkdf2(password, salt, iterations, 32, "sha256", (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

/** `pbkdf2$<iterations>$<salt>$<hash>`, base64 parts. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterations || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await derive(password, Buffer.from(salt, "base64"), Number(iterations));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** A well-formed hash that no password matches, verified when the lookup found nothing so that "no such user" costs the same as "wrong password". Returning before the derivation skipped ~100k PBKDF2 rounds, which is a user-enumeration oracle on every generated login endpoint. */
export const NO_RECORD_PASSWORD_HASH =
  "pbkdf2$100000$23q2CC8EDlCE6IAE6AWUkA==$Sw3CSkd4xdMrJorbOsYSExuHZIb+3rvTGfKm/OS+pDw=";

function base64Url(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

/** An HS256 JWT carrying `payload` plus an expiry. */
export function signToken(payload: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const exp = Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS;
  const body = base64Url(JSON.stringify({ ...payload, exp }));
  return `${header}.${body}.${sign(`${header}.${body}`)}`;
}

/** What a guard reads from a token: the signed-in record's string `role` and its list of string `permissions`, and the `tenant_id` of the tenant its row belongs to, when it has them. */
export function accessClaims(record: object): Record<string, unknown> {
  const fields = record as Record<string, unknown>;
  const claims: Record<string, unknown> = {};
  if (typeof fields.tenantId === "string") claims.tenant_id = fields.tenantId;
  if (typeof fields.role === "string") claims.role = fields.role;
  if (Array.isArray(fields.permissions)) {
    claims.permissions = fields.permissions.filter((item) => typeof item === "string");
  }
  return claims;
}

/** The token's payload when its signature and expiry hold, otherwise undefined. */
export function verifyToken(token: string): Record<string, unknown> | undefined {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return undefined;
  const expected = Buffer.from(sign(`${header}.${body}`));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<string, unknown>;
    return typeof payload.exp === "number" && payload.exp > Date.now() / 1000 ? payload : undefined;
  } catch {
    return undefined;
  }
}

const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";

/** The `Set-Cookie` value that signs a web client in: the token in an HttpOnly cookie page scripts cannot read. */
export function sessionCookie(token: string): string {
  return `session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${COOKIE_SECURE ? "; Secure" : ""}`;
}

/** The `Set-Cookie` value that signs a web client out. */
export function clearedSessionCookie(): string {
  return `session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${COOKIE_SECURE ? "; Secure" : ""}`;
}

export interface Authentication {
  /** The token's claims; absent when the request is refused. */
  payload?: Record<string, unknown>;
  /** 200 when the request is let through, else the 401 / 403 to answer with. */
  status: number;
}

function headerValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value.join(", ") : (value ?? "");
}

function cookieValue(cookies: string, name: string): string | undefined {
  for (const part of cookies.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

/**
 * Who sent a request: a valid Bearer token wins; otherwise the session cookie's token, which on a
 * method that changes data must come with the X-Requested-With header (403 without it). A missing or
 * invalid token is a 401.
 */
export function authenticate(
  headers: Record<string, string | string[] | undefined>,
  method: string,
): Authentication {
  const authorization = headerValue(headers.authorization);
  if (authorization.startsWith("Bearer ")) {
    const payload = verifyToken(authorization.slice(7));
    return payload ? { payload, status: 200 } : { status: 401 };
  }
  const token = cookieValue(headerValue(headers.cookie), "session");
  const payload = token ? verifyToken(token) : undefined;
  if (!payload) return { status: 401 };
  const readOnly = ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
  return readOnly || headerValue(headers["x-requested-with"]) !== "" ? { payload, status: 200 } : { status: 403 };
}

export type BusinessRule = [field: string, kind: string, argument: string];

/** The problems record has against rules; partial skips absent values (a PATCH). */
export function checkRules(record: object, rules: BusinessRule[], partial: boolean): string[] {
  const values = record as Record<string, unknown>;
  const problems: string[] = [];
  for (const [field, kind, argument] of rules) {
    const value = values[field];
    const present = value !== undefined && value !== null;
    if (kind === "required") {
      if (present ? typeof value === "string" && value.trim() === "" : !partial) {
        problems.push(field + " is required");
      }
      continue;
    }
    if (!present) continue;
    const text = String(value);
    const limit = Number(argument);
    if (kind === "min" && Number(value) < limit) {
      problems.push(field + " must be at least " + argument);
    } else if (kind === "max" && Number(value) > limit) {
      problems.push(field + " must be at most " + argument);
    } else if (kind === "minLength" && text.length < limit) {
      problems.push(field + " must be at least " + argument + " characters long");
    } else if (kind === "maxLength" && text.length > limit) {
      problems.push(field + " must be at most " + argument + " characters long");
    } else if (kind === "pattern" && !new RegExp(argument).test(text)) {
      problems.push(field + " is invalid");
    }
  }
  return problems;
}

import { createHash } from "node:crypto";

export const REFRESH_LIFETIME_SECONDS = 2592000;
export const RESET_LIFETIME_SECONDS = 3600;
export const VERIFY_LIFETIME_SECONDS = 86400;

interface TokenRow {
  id: string;
  userId: string;
  kind: string;
  expiresAt: number;
}

/** What the token Repository offers; its generated object has it. */
export interface TokenStore {
  create(data: { userId: string; kind: string; tokenHash: string; expiresAt: number }): Promise<unknown>;
  findByField(field: "tokenHash", value: unknown): Promise<TokenRow | null>;
  remove(id: string): Promise<unknown>;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Stops a token working once the password it was issued under has changed. */
export function passwordFingerprint(passwordHash: string): string {
  return sha256(passwordHash).slice(0, 16);
}

/** Saves a new token of `kind` for the user and returns it; this is the only time it can be read. */
export async function issueToken(
  store: TokenStore,
  userId: string,
  kind: string,
  lifetimeSeconds: number,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await store.create({
    userId,
    kind,
    tokenHash: sha256(token),
    expiresAt: Math.floor(Date.now() / 1000) + lifetimeSeconds,
  });
  return token;
}

/**
 * The row of a token of `purpose` that has not expired, spent by the call. A token that does not
 * exist, has expired or is being spent by another request at the same moment answers undefined; one
 * made for another purpose answers undefined too and stays valid for its own.
 */
export async function takeToken(
  store: TokenStore,
  token: string,
  purpose: string,
): Promise<TokenRow | undefined> {
  const row = await store.findByField("tokenHash", sha256(token));
  if (!row || row.kind.split(":")[0] !== purpose) return undefined;
  try {
    await store.remove(row.id);
  } catch {
    return undefined;
  }
  return row.expiresAt > Date.now() / 1000 ? row : undefined;
}

const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** The mail that carries a confirmation or reset token to the user, as a link to the app. */
export function authMail(purpose: "verify" | "reset", token: string): { subject: string; html: string } {
  const link = `${APP_URL}/${purpose === "verify" ? "verify-email" : "reset-password"}?token=${encodeURIComponent(token)}`;
  return purpose === "verify"
    ? { subject: "Confirm your email", html: `<p>Confirm your email address: <a href="${link}">${link}</a></p>` }
    : { subject: "Reset your password", html: `<p>Reset your password: <a href="${link}">${link}</a></p>` };
}
