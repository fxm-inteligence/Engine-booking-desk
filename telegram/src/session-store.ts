import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

interface Entry {
  value: string;
  savedAt: number;
}

export interface SessionStoreOptions {
  /** Minutes after the last write when a value is forgotten; without it a value stays until it is replaced. */
  lifetimeMinutes?: number;
  /** A file the values are kept in, so they survive a restart of the bot; without it they live in memory only. */
  file?: string;
}

export class SessionStore {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly options: SessionStoreOptions = {}) {
    if (options.file && existsSync(options.file)) {
      const saved = JSON.parse(readFileSync(options.file, "utf8")) as Record<string, Entry>;
      for (const [key, entry] of Object.entries(saved)) this.entries.set(key, entry);
    }
  }

  /** The value kept for `key`, or an empty string when there is none or it has expired. */
  get(key: string): string {
    const entry = this.entries.get(key);
    if (!entry) return "";
    const { lifetimeMinutes } = this.options;
    if (lifetimeMinutes !== undefined && Date.now() - entry.savedAt > lifetimeMinutes * 60_000) {
      this.entries.delete(key);
      this.save();
      return "";
    }
    return entry.value;
  }

  set(key: string, value: string): void {
    this.entries.set(key, { value, savedAt: Date.now() });
    this.save();
  }

  private save(): void {
    const { file } = this.options;
    if (!file) return;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(Object.fromEntries(this.entries)));
  }
}
