const API_URL = process.env.API_URL ?? "http://localhost:3000";

function apiUrl(path: string): string {
  return path.startsWith("http://") || path.startsWith("https://") ? path : `${API_URL}${path}`;
}

export interface RequestOptions {
  method?: string;
  /** Sent as the JSON request body. */
  json?: unknown;
  /** The user's token, sent as a Bearer header. */
  token?: string;
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
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;
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
