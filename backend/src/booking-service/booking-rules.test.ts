import { strict as assert } from "node:assert";
import { test } from "node:test";
import { ConflictException } from "@nestjs/common";
import type { BookingRepository } from "./booking-repository.repository";
import { canChangeStatus, findConflict, type ExistingBooking } from "./booking-rules";
import { BookingService } from "./booking-service.service";

const at = (time: string) => new Date(`2030-05-01T${time}:00.000Z`);
const booked = (over: Partial<ExistingBooking> = {}): ExistingBooking => ({
  id: "b1", masterId: "m1", startsAt: at("10:00"), status: "new", durationMinutes: 60, ...over,
});

test("findConflict: overlap with the same master is a conflict", () => {
  assert.ok(findConflict({ masterId: "m1", startsAt: at("10:30"), durationMinutes: 60 }, [booked()]));
  assert.ok(findConflict({ masterId: "m1", startsAt: at("09:30"), durationMinutes: 60 }, [booked()]));
});

test("findConflict: back-to-back bookings do not overlap", () => {
  assert.equal(findConflict({ masterId: "m1", startsAt: at("11:00"), durationMinutes: 60 }, [booked()]), undefined);
  assert.equal(findConflict({ masterId: "m1", startsAt: at("09:00"), durationMinutes: 60 }, [booked()]), undefined);
});

test("findConflict: another master, a cancelled booking and the booking itself are ignored", () => {
  const slot = { masterId: "m1", startsAt: at("10:00"), durationMinutes: 60 };
  assert.equal(findConflict({ ...slot, masterId: "m2" }, [booked()]), undefined);
  assert.equal(findConflict(slot, [booked({ status: "cancelled" })]), undefined);
  assert.equal(findConflict(slot, [booked()], "b1"), undefined);
});

test("canChangeStatus follows new, confirmed, done and allows cancelling", () => {
  assert.equal(canChangeStatus("new", "confirmed"), true);
  assert.equal(canChangeStatus("confirmed", "done"), true);
  assert.equal(canChangeStatus("new", "cancelled"), true);
  assert.equal(canChangeStatus("new", "done"), false);
  assert.equal(canChangeStatus("cancelled", "new"), false);
  assert.equal(canChangeStatus("done", "cancelled"), false);
  assert.equal(canChangeStatus(undefined, "confirmed"), true);
});

/** The generated Service with the hooks of booking-service.hooks.ts, over an in-memory repository. */
function setup() {
  const rows = new Map<string, any>();
  let next = 1;
  const repository = {
    findPage: async () => ({ items: [...rows.values()], total: rows.size }),
    findById: async (id: string) => rows.get(id) ?? null,
    create: async (data: any) => {
      const row = { id: String(next++), ...data };
      rows.set(row.id, row);
      return row;
    },
    update: async (id: string, data: any) => {
      const row = { ...rows.get(id), ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) };
      rows.set(id, row);
      return row;
    },
  };
  return new BookingService(repository as unknown as BookingRepository) as any;
}

const dto = (startsAt: string, over: Record<string, unknown> = {}) => ({
  serviceId: "s1", masterId: "m1", clientName: "Анна", clientPhone: "+70000000000", startsAt, ...over,
});

test("createBooking refuses a busy slot with 409 and accepts a free one", async () => {
  const service = setup();
  await service.createBooking(dto("2030-05-01T10:00:00.000Z"));
  await assert.rejects(() => service.createBooking(dto("2030-05-01T10:30:00.000Z")), ConflictException);
  await service.createBooking(dto("2030-05-01T11:00:00.000Z"));
  await service.createBooking(dto("2030-05-01T10:00:00.000Z", { masterId: "m2" }));
});

test("a cancelled booking frees the slot", async () => {
  const service = setup();
  const first = await service.createBooking(dto("2030-05-01T10:00:00.000Z"));
  await service.updateBooking(first.id, { status: "cancelled" });
  await service.createBooking(dto("2030-05-01T10:00:00.000Z"));
});

test("updateBooking refuses moving into a busy slot and a wrong status step", async () => {
  const service = setup();
  const first = await service.createBooking(dto("2030-05-01T10:00:00.000Z", { status: "new" }));
  const second = await service.createBooking(dto("2030-05-01T12:00:00.000Z", { status: "new" }));
  await assert.rejects(() => service.updateBooking(second.id, { startsAt: "2030-05-01T10:15:00.000Z" }), ConflictException);
  await service.updateBooking(first.id, { notes: "без изменения времени" });
  await service.updateBooking(first.id, { startsAt: "2030-05-01T10:00:00.000Z" });
  await assert.rejects(() => service.updateBooking(first.id, { status: "done" }), ConflictException);
  await service.updateBooking(first.id, { status: "confirmed" });
});
