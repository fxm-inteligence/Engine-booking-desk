// Generated from the logic blocks of the "Service" table. A Regenerate rewrites this file, so change the blocks, not the file.
// Code of your own goes in service-service.hooks.ts and in the *.custom.ts files, which a Regenerate leaves alone.
import { ConflictException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ambient, inTransaction } from "../transaction-scope";
import type { Hooks } from "../with-hooks";
import type { ServiceRepository } from "./service-repository.repository";
import type { ServiceService } from "./service-service.service";

type Row = Record<string, any>;

function toDate(value: unknown): Date | undefined {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

let prisma: PrismaClient | undefined;

/** One queue per lock key: the next request for the same key waits until the one before has been saved. */
const queues = new Map<string, Promise<void>>();

async function exclusive<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  let release!: () => void;
  const mine = new Promise<void>((resolve) => (release = resolve));
  const tail = previous.then(() => mine);
  queues.set(key, tail);
  await previous;
  try {
    return await work();
  } finally {
    release();
    if (queues.get(key) === tail) queues.delete(key);
  }
}

/**
 * Runs `work` in one transaction: what it writes through the Repositories (the record, the balance, the history, the
 * audit log) is kept or dropped together. Holding keys, the next request for the same key waits until the one before has
 * been saved: on PostgreSQL the lock also holds against other processes, and is taken in the transaction; with another
 * database it holds in this process only.
 */
async function locked<T>(keys: string[], work: () => Promise<T>): Promise<T> {
  const withDatabase = () =>
    inTransaction(async (transaction) => {
      if (transaction !== undefined && keys.length > 0 && /^postgres(ql)?:/.test(process.env.DATABASE_URL ?? "")) {
        for (const key of keys) {
          await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
        }
      }
      return work();
    });
  return keys.reduceRight<() => Promise<T>>((next, key) => () => exclusive(key, next), withDatabase)();
}

const lockedCalls: Record<string, "create" | "update" | "remove"> = {
  "deleteService": "remove",
};

/** Wraps the calls of the Service so what each writes is kept or dropped together. Apply after `withHooks`: the transaction is the outermost step. */
export function lockSlots<T extends object>(target: T): T {
  const record = target as Record<string, unknown>;
  for (const name of Object.keys(lockedCalls)) {
    const original = record[name] as (...args: unknown[]) => Promise<unknown>;
    record[name] = async function (this: any, ...args: unknown[]) {
      return locked([], () => original.apply(this, args));
    };
  }
  return target;
}

// Integrity "Service Parts"
const integrityServicePartsRules: readonly { child: string; field: string; action: "restrict" | "cascade" | "nullify" }[] = [
  { child: "booking", field: "serviceId", action: "restrict" },
];

/** The records of the other tables, reached through the database; with none to ask, there are none. */
export const integrityServicePartsStore = {
  async count(child: string, field: string, key: unknown): Promise<number> {
    if (!process.env.DATABASE_URL) return 0;
    prisma ??= ambient(new PrismaClient());
    return (prisma as any)[child].count({ where: { [field]: key } });
  },
  async remove(child: string, field: string, key: unknown): Promise<void> {
    if (!process.env.DATABASE_URL) return;
    prisma ??= ambient(new PrismaClient());
    await (prisma as any)[child].deleteMany({ where: { [field]: key } });
  },
  async clear(child: string, field: string, key: unknown): Promise<void> {
    if (!process.env.DATABASE_URL) return;
    prisma ??= ambient(new PrismaClient());
    await (prisma as any)[child].updateMany({ where: { [field]: key }, data: { [field]: null } });
  },
};

/** Before a record is deleted: refuses (409) while a restrict finds a record that depends on it, then clears and deletes the records that go with it. */
async function integrityServicePartsRelease(current: Row): Promise<void> {
  const key = current["id"];
  for (const rule of integrityServicePartsRules) {
    if (rule.action === "restrict" && (await integrityServicePartsStore.count(rule.child, rule.field, key)) > 0) {
      throw new ConflictException("На эту услугу есть записи, удалить её нельзя");
    }
  }
  for (const rule of integrityServicePartsRules) {
    if (rule.action === "nullify") await integrityServicePartsStore.clear(rule.child, rule.field, key);
  }
  for (const rule of integrityServicePartsRules) {
    if (rule.action === "cascade") await integrityServicePartsStore.remove(rule.child, rule.field, key);
  }
}

export const logicHooks: Hooks<ServiceService> = {
  before: {
    async deleteService(this: any, id: any) {
      const repository = (this as any).serviceRepository as ServiceRepository;
      const current = await repository.findById(id);
      if (!current) return;
      await integrityServicePartsRelease(current);
    },
  },
};
