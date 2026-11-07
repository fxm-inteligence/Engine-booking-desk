import { strict as assert } from "node:assert";
import { test } from "node:test";
import { ConflictException } from "@nestjs/common";
import { integrityMasterPartsStore, logicHooks } from "./master-service.logic";

type Row = Record<string, any>;

/** Runs `work` the way a test without a database runs: a length that lives in another table is the default. */
async function withoutDatabase<T>(work: () => Promise<T>): Promise<T> {
  const saved = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    return await work();
  } finally {
    if (saved !== undefined) process.env.DATABASE_URL = saved;
  }
}

/** A Service whose Repository keeps `rows` in memory. */
function serviceWith(rows: Row[]) {
  const repository = {
    findPage: async () => ({ items: rows, total: rows.length }),
    findById: async (id: unknown) => rows.find((row) => row["id"] === id) ?? null,
  };
  return { masterRepository: repository };
}

test("integrityMasterParts: deleteMaster: asks every restrict first, then clears and deletes the records that go with the record, and refuses while a restrict has records", async () => {
  const asked: string[] = [];
  const dependents: Record<string, number> = {};
  Object.assign(integrityMasterPartsStore, {
    count: async (child: string, field: string) => (asked.push(`count ${child}.${field}`), dependents[`${child}.${field}`] ?? 0),
    clear: async (child: string, field: string, key: unknown) => void asked.push(`clear ${child}.${field}=${key}`),
    remove: async (child: string, field: string, key: unknown) => void asked.push(`remove ${child}.${field}=${key}`),
  });
  const service = serviceWith([{ "id": "a" }]);
  await (logicHooks.before as any)["deleteMaster"].call(service, "a");
  assert.deepEqual(asked, ["count booking.masterId"]);
  asked.length = 0;
  dependents["booking.masterId"] = 1;
  await assert.rejects(() => (logicHooks.before as any)["deleteMaster"].call(service, "a"), ConflictException);
  assert.deepEqual(asked.filter((entry) => !entry.startsWith("count ")), []);
  delete dependents["booking.masterId"];
  asked.length = 0;
  await (logicHooks.before as any)["deleteMaster"].call(service, "missing");
  assert.deepEqual(asked, []);
});
