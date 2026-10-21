import { strict as assert } from "node:assert";
import { test } from "node:test";
import { NotFoundException } from "@nestjs/common";
import type { ServiceRepository } from "./service-repository.repository";
import { ServiceService } from "./service-service.service";

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
  const service = new ServiceService(repository as unknown as ServiceRepository);
  return { service: service as any, rows };
}

function sample(): Row {
  return { name: "sample", durationMinutes: 1, price: 1.5, active: true, createdAt: "2024-01-01T00:00:00.000Z" };
}

test("createService stores the record and answers with its id", async () => {
  const { service, rows } = setup();
  const created = await service.createService(sample() as never);
  assert.notEqual(created.id, undefined);
  assert.equal(rows.size, 1);
  assert.equal(created.name, sample().name);
});

test("listServices answers with the stored records and their total", async () => {
  const { service } = setup();
  await service.createService(sample() as never);
  const page = await service.listServices({ search: undefined, sort: undefined, offset: 0, limit: undefined });
  assert.equal(page.total, 1);
  assert.equal(page.items.length, 1);
});

test("getService answers with the stored record", async () => {
  const { service } = setup();
  const created = await service.createService(sample() as never);
  const found = await service.getService(created.id);
  assert.equal(found.id, created.id);
});

test("getService answers 404 for an id that does not exist", async () => {
  const { service } = setup();
  await assert.rejects(() => service.getService("missing-id"), NotFoundException);
});

test("updateService changes the stored record", async () => {
  const { service, rows } = setup();
  const created = await service.createService(sample() as never);
  await service.updateService(created.id, { name: "updated" } as never);
  assert.equal(rows.get(created.id)?.name, "updated");
});

test("updateService answers 404 for an id that does not exist", async () => {
  const { service } = setup();
  await assert.rejects(() => service.updateService("missing-id", { name: "updated" } as never), NotFoundException);
});

test("deleteService removes the record", async () => {
  const { service, rows } = setup();
  const created = await service.createService(sample() as never);
  await service.deleteService(created.id);
  assert.equal(rows.size, 0);
});

test("deleteService answers 404 for an id that does not exist", async () => {
  const { service } = setup();
  await assert.rejects(() => service.deleteService("missing-id"), NotFoundException);
});
