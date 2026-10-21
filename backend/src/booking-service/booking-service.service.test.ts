import { strict as assert } from "node:assert";
import { test } from "node:test";
import { NotFoundException } from "@nestjs/common";
import type { BookingRepository } from "./booking-repository.repository";
import { BookingService } from "./booking-service.service";

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
  const service = new BookingService(repository as unknown as BookingRepository);
  return { service: service as any, rows };
}

function sample(): Row {
  return { serviceId: "sample", masterId: "sample", clientName: "sample", clientPhone: "sample", startsAt: "2024-01-01T00:00:00.000Z", status: "sample", notes: "sample", createdAt: "2024-01-01T00:00:00.000Z" };
}

test("createBooking stores the record and answers with its id", async () => {
  const { service, rows } = setup();
  const created = await service.createBooking(sample() as never);
  assert.notEqual(created.id, undefined);
  assert.equal(rows.size, 1);
  assert.equal(created.serviceId, sample().serviceId);
});

test("listBookings answers with the stored records and their total", async () => {
  const { service } = setup();
  await service.createBooking(sample() as never);
  const page = await service.listBookings({ search: undefined, sort: undefined, offset: 0, limit: undefined });
  assert.equal(page.total, 1);
  assert.equal(page.items.length, 1);
});

test("getBooking answers with the stored record", async () => {
  const { service } = setup();
  const created = await service.createBooking(sample() as never);
  const found = await service.getBooking(created.id);
  assert.equal(found.id, created.id);
});

test("getBooking answers 404 for an id that does not exist", async () => {
  const { service } = setup();
  await assert.rejects(() => service.getBooking("missing-id"), NotFoundException);
});

test("updateBooking changes the stored record", async () => {
  const { service, rows } = setup();
  const created = await service.createBooking(sample() as never);
  await service.updateBooking(created.id, { serviceId: "updated" } as never);
  assert.equal(rows.get(created.id)?.serviceId, "updated");
});

test("updateBooking answers 404 for an id that does not exist", async () => {
  const { service } = setup();
  await assert.rejects(() => service.updateBooking("missing-id", { serviceId: "updated" } as never), NotFoundException);
});

test("deleteBooking removes the record", async () => {
  const { service, rows } = setup();
  const created = await service.createBooking(sample() as never);
  await service.deleteBooking(created.id);
  assert.equal(rows.size, 0);
});

test("deleteBooking answers 404 for an id that does not exist", async () => {
  const { service } = setup();
  await assert.rejects(() => service.deleteBooking("missing-id"), NotFoundException);
});
