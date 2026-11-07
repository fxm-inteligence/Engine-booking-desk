const API_URL = process.env.API_URL ?? "http://localhost:3000";

// The key that opens the backend's guarded routes, sent as `x-api-key`: the same text as the key in
// the backend's .env. The bot runs on your server, so the key stays with you. Left empty, none is sent.
const API_KEY = process.env.API_KEY ?? "";

function apiUrl(path: string): string {
  return path.startsWith("http://") || path.startsWith("https://") ? path : `${API_URL}${path}`;
}

/** An answer with an error status: `status` is the HTTP status, `message` the words to show the person. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** What a refusal says when the backend gave no words of its own. */
const REFUSALS: Record<number, string> = {
  403: "You are not allowed to do this.",
  409: "This conflicts with a record that is already there.",
  422: "The data was not accepted.",
};

/** The words in an error body: a text, the texts of a list, or the `message` of an object. */
function wordsOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(wordsOf).filter(Boolean).join("; ");
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return wordsOf(record.message ?? record.msg);
  }
  return "";
}

/**
 * The words of a failed request. Each backend puts its own text in a different key (`message`,
 * `detail`, `error`, `title`), so the first one that holds words is shown; with none, a plain
 * sentence for the refusals logic gives (403, 409, 422), else the bare status.
 */
async function refusalText(response: Response): Promise<string> {
  let words = "";
  if (response.status < 500) {
    try {
      const body: unknown = JSON.parse(await response.text());
      if (body !== null && typeof body === "object") {
        const record = body as Record<string, unknown>;
        words = [record.message, record.detail, record.error, record.title]
          .map(wordsOf)
          .find((candidate) => candidate.length > 0) ?? "";
      }
    } catch {
      // A body that is not JSON carries no words.
    }
  }
  return words || REFUSALS[response.status] || `Request failed with status ${response.status}`;
}

/**
 * The words to tell a person when a call failed: the backend's own words for a refusal it gave (a time
 * that is taken, a right that is missing), and `fallback` for everything else — a server failure, a key
 * the bot lacks (401), an API that does not answer.
 */
export function refusalFor(error: unknown, fallback: string): string {
  const refused = error instanceof ApiError && error.status >= 400 && error.status < 500;
  return refused && error.status !== 401 ? error.message : fallback;
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
  if (API_KEY) headers["x-api-key"] = API_KEY;
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;
  const response = await fetch(apiUrl(path), {
    method: options.method ?? "GET",
    headers,
    body: options.json === undefined ? undefined : JSON.stringify(options.json),
  });
  if (!response.ok) {
    throw new ApiError(response.status, await refusalText(response));
  }
  const text = await response.text();
  return text ? unwrap(JSON.parse(text)) : undefined;
}
