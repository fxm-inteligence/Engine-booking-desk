import { AsyncLocalStorage } from "node:async_hooks";
import { authenticate } from "./auth-crypto";

type Headers = Record<string, string | string[] | undefined>;

const storage = new AsyncLocalStorage<{ headers: Headers; method: string; role?: string; id?: string }>();

/** Runs `work` — and everything it starts — as the handling of a request with these headers. */
export function runWithRequest<T>(headers: Headers, method: string, work: () => T): T {
  return storage.run({ headers, method }, work);
}

/** Runs `work` as a request whose token carries `role`, for the tests of the logic that asks for it. */
export function runAsRole<T>(role: string, work: () => T): T {
  return storage.run({ headers: {}, method: "GET", role }, work);
}

/** Runs `work` as a request of the person `id` whose token carries `role`, for the tests of the logic that asks who calls. */
export function runAsCaller<T>(role: string, id: string, work: () => T): T {
  return storage.run({ headers: {}, method: "GET", role, id }, work);
}

/** Runs `work` as a request of the person `id` that carries the header `Idempotency-Key: key`, for the tests of the logic that answers a repeated key. */
export function runWithKey<T>(key: string, id: string, work: () => T): T {
  return storage.run({ headers: { "idempotency-key": key }, method: "POST", role: "", id }, work);
}

/** Runs `work` as the system's own call: outside any request, so no role and no owner is asked of it (a payment notification moves an order this way). */
export function runAsSystem<T>(work: () => T): T {
  return storage.exit(work);
}

/** The `role` claim of the verified token of the request being served; an empty text when there is none, `undefined` outside a request. */
export function callerRole(): string | undefined {
  const request = storage.getStore();
  if (request === undefined) return undefined;
  if (request.role !== undefined) return request.role;
  const role = authenticate(request.headers, request.method).payload?.role;
  return typeof role === "string" ? role : "";
}

/** The `Idempotency-Key` header of the request being served; `undefined` when there is none, and outside a request. */
export function idempotencyKey(): string | undefined {
  const header = storage.getStore()?.headers["idempotency-key"];
  const key = Array.isArray(header) ? header[0] : header;
  return typeof key === "string" && key.trim() !== "" ? key.trim() : undefined;
}

/** The `sub` claim (the id of the person) of the verified token of the request being served; an empty text when there is none, `undefined` outside a request. */
export function callerId(): string | undefined {
  const request = storage.getStore();
  if (request === undefined) return undefined;
  if (request.id !== undefined) return request.id;
  const sub = authenticate(request.headers, request.method).payload?.sub;
  return typeof sub === "string" || typeof sub === "number" ? String(sub) : "";
}
