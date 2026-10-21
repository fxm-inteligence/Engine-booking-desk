function pick(value: unknown, path: string): string {
  let current: unknown = value;
  for (const key of path === "" ? [] : path.split(".")) {
    if (current === null || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[key];
  }
  if (current === undefined || current === null) return "";
  return typeof current === "object" ? JSON.stringify(current) : String(current);
}

export function formatResult(result: unknown, path = ""): string {
  return Array.isArray(result)
    ? result.map((item) => pick(item, path)).join("\n")
    : pick(result, path);
}
