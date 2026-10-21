import { strict as assert } from "node:assert";
import { test } from "node:test";
import { NotFoundException } from "@nestjs/common";
import type { MasterRepository } from "./master-repository.repository";
import { MasterService } from "./master-service.service";

type Row = Record<string, any>;

/** A Repository that keeps its rows in memory, so the Service is tested without a database. */
function setup() {
  const rows = new Map<any, Row>();
  let next = 1;
  const repository = {
    findPage: async () => ({ items: [...rows.values()], total: rows.size }),
    findById: async (id: any) => rows.get(id) ?? null,
    findByField: async (field: string, value: unknown) =>
      [...rows.values()].find((row) => row[field] === value) ?? null,
    create: async (data: Row) => {
      const row = { id: String(next++), ...data };
      rows.set(row.id, row);
      return row;
    },
    update: async (id: any, data: Row) => {
      const row = { ...rows.get(id), ...data };
      rows.set(id, row);
      return row;
    },
    remove: async (id: any) => {
      const row = rows.get(id);
      rows.delete(id);
      return row;
    },
  };
  const service = new MasterService(repository as unknown as MasterRepository);
  return { service: service as any, rows };
}

function sample(): Row {
  return { name: "sample", specialty: "sample", phone: "sample", createdAt: "2024-01-01T00:00:00.000Z" };
}

test("createMaster stores the record and answers with its id", async () => {
  const { service, rows } = setup();
  const created = await service.createMaster(sample() as never);
  assert.notEqual(created.id, undefined);
  assert.equal(rows.size, 1);
  assert.equal(created.name, sample().name);
});

test("listMasters answers with the stored records and their total", async () => {
  const { service } = setup();
  await service.createMaster(sample() as never);
  const page = await service.listMasters({ search: undefined, sort: undefined, offset: 0, limit: undefined });
  assert.equal(page.total, 1);
  assert.equal(page.items.length, 1);
});

test("getMaster answers with the stored record", async () => {
  const { service } = setup();
  const created = await service.createMaster(sample() as never);
  const found = await service.getMaster(created.id);
  assert.equal(found.id, created.id);
});

test("getMaster answers 404 for an id that does not exist", async () => {
  const { service } = setup();
  await assert.rejects(() => service.getMaster("missing-id"), NotFoundException);
});

test("updateMaster changes the stored record", async () => {
  const { service, rows } = setup();
  const created = await service.createMaster(sample() as never);
  await service.updateMaster(created.id, { name: "updated" } as never);
  assert.equal(rows.get(created.id)?.name, "updated");
});

test("updateMaster answers 404 for an id that does not exist", async () => {
  const { service } = setup();
  await assert.rejects(() => service.updateMaster("missing-id", { name: "updated" } as never), NotFoundException);
});

test("deleteMaster removes the record", async () => {
  const { service, rows } = setup();
  const created = await service.createMaster(sample() as never);
  await service.deleteMaster(created.id);
  assert.equal(rows.size, 0);
});

test("deleteMaster answers 404 for an id that does not exist", async () => {
  const { service } = setup();
  await assert.rejects(() => service.deleteMaster("missing-id"), NotFoundException);
});
