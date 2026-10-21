// Where the backend listens. The Android emulator reaches the host machine at
// http://10.0.2.2:<port>; a phone reaches it at the computer's address on the network.
export const API_URL = "http://localhost:3000";

// The key that opens the backend's guarded routes, sent as `x-api-key`: set EXPO_PUBLIC_API_KEY to
// the same text as the key in the backend's .env. Anyone can take a key out of an installed app, so use it only for routes that hold nothing secret; for a person's own data sign the person in instead, and the token goes with every request.
export const API_KEY: string = process.env.EXPO_PUBLIC_API_KEY ?? "";

let sessionToken: string | null = null;

export function getToken(): string | null {
  return sessionToken;
}

export function setToken(token: string | null): void {
  sessionToken = token;
}

function apiUrl(path: string): string {
  return path.startsWith("http://") || path.startsWith("https://") ? path : `${API_URL}${path}`;
}

export interface RequestOptions {
  method?: string;
  /** Sent as the JSON request body. */
  json?: unknown;
}

/** A backend that wraps its answer as `{ "data": ... }` is read the same as one that answers with the value itself. */
function unwrap(value: unknown): unknown {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === "data") {
      return (value as { data: unknown }).data;
    }
  }
  return value;
}

export async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (options.json !== undefined) headers["Content-Type"] = "application/json";
  if (API_KEY) headers["x-api-key"] = API_KEY;
  if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
  const response = await fetch(apiUrl(path), {
    method: options.method ?? "GET",
    headers,
    body: options.json === undefined ? undefined : JSON.stringify(options.json),
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const text = await response.text();
  return text ? unwrap(JSON.parse(text)) : undefined;
}

/** Keeps the token an auth endpoint answered with — `token`, `accessToken` or `access_token`. */
export function storeSessionFrom(result: unknown): void {
  if (result === null || typeof result !== "object") return;
  const fields = result as Record<string, unknown>;
  const token = fields["token"] ?? fields["accessToken"] ?? fields["access_token"];
  if (typeof token === "string" && token.length > 0) setToken(token);
}
