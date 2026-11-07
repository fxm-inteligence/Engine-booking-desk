import { strict as assert } from "node:assert";
import { test } from "node:test";
import { ConflictException } from "@nestjs/common";
import { runWithKey } from "../request-context";
import { withHooks } from "../with-hooks";
import { flowBookingStepsAllows, flowBookingStepsOverdue, keepAudit, keepHistory, keepIdempotency, lockSlots, logicHooks, reactionBookingReminderNoticeFires, reactionBookingReminderNoticeRun, reactionBookingReminderNoticeStore, reactionNewBookingNoticeFires, reactionNewBookingNoticeRun, reactionNewBookingNoticeStore, slotInHours, slotsCrowded, sweepTimers } from "./booking-service.logic";

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
  return { bookingRepository: repository };
}

async function slotMasterFreeAttempt(rows: Row[], candidate: Row, id?: unknown): Promise<void> {
  await withoutDatabase(() => (logicHooks.before as any)["createBooking"].call(serviceWith(rows), candidate));
}

test("slotMasterFree: slotInHours: an hour inside a working day fits", () => {
  const span = { start: new Date("2030-07-01T14:00:00.000Z"), end: new Date("2030-07-01T15:00:00.000Z") };
  assert.equal(slotInHours(span, "America/New_York", [[[540,1020]],[[540,720],[780,1020]],[[540,1020]],[[540,1020]],[[540,1020]],[],[]], ["2030-07-04","12-25"]), true);
});

test("slotMasterFree: slotInHours: summer time is told from the zone: nine in the morning is 13:00 UTC", () => {
  const span = { start: new Date("2030-07-01T13:00:00.000Z"), end: new Date("2030-07-01T14:00:00.000Z") };
  assert.equal(slotInHours(span, "America/New_York", [[[540,1020]],[[540,720],[780,1020]],[[540,1020]],[[540,1020]],[[540,1020]],[],[]], ["2030-07-04","12-25"]), true);
});

test("slotMasterFree: slotInHours: winter time is told from the zone: nine in the morning is 14:00 UTC", () => {
  const span = { start: new Date("2030-01-14T14:00:00.000Z"), end: new Date("2030-01-14T15:00:00.000Z") };
  assert.equal(slotInHours(span, "America/New_York", [[[540,1020]],[[540,720],[780,1020]],[[540,1020]],[[540,1020]],[[540,1020]],[],[]], ["2030-07-04","12-25"]), true);
});

test("slotMasterFree: slotInHours: a start before the opening does not fit", () => {
  const span = { start: new Date("2030-07-01T12:30:00.000Z"), end: new Date("2030-07-01T13:30:00.000Z") };
  assert.equal(slotInHours(span, "America/New_York", [[[540,1020]],[[540,720],[780,1020]],[[540,1020]],[[540,1020]],[[540,1020]],[],[]], ["2030-07-04","12-25"]), false);
});

test("slotMasterFree: slotInHours: an end after the closing does not fit", () => {
  const span = { start: new Date("2030-07-01T20:30:00.000Z"), end: new Date("2030-07-01T21:30:00.000Z") };
  assert.equal(slotInHours(span, "America/New_York", [[[540,1020]],[[540,720],[780,1020]],[[540,1020]],[[540,1020]],[[540,1020]],[],[]], ["2030-07-04","12-25"]), false);
});

test("slotMasterFree: slotInHours: an end exactly at the closing fits", () => {
  const span = { start: new Date("2030-07-01T20:00:00.000Z"), end: new Date("2030-07-01T21:00:00.000Z") };
  assert.equal(slotInHours(span, "America/New_York", [[[540,1020]],[[540,720],[780,1020]],[[540,1020]],[[540,1020]],[[540,1020]],[],[]], ["2030-07-04","12-25"]), true);
});

test("slotMasterFree: slotInHours: a day off does not fit", () => {
  const span = { start: new Date("2030-07-06T15:00:00.000Z"), end: new Date("2030-07-06T16:00:00.000Z") };
  assert.equal(slotInHours(span, "America/New_York", [[[540,1020]],[[540,720],[780,1020]],[[540,1020]],[[540,1020]],[[540,1020]],[],[]], ["2030-07-04","12-25"]), false);
});

test("slotMasterFree: slotInHours: a holiday of one date does not fit", () => {
  const span = { start: new Date("2030-07-04T15:00:00.000Z"), end: new Date("2030-07-04T16:00:00.000Z") };
  assert.equal(slotInHours(span, "America/New_York", [[[540,1020]],[[540,720],[780,1020]],[[540,1020]],[[540,1020]],[[540,1020]],[],[]], ["2030-07-04","12-25"]), false);
});

test("slotMasterFree: slotInHours: a holiday of every year does not fit", () => {
  const span = { start: new Date("2031-12-25T15:00:00.000Z"), end: new Date("2031-12-25T16:00:00.000Z") };
  assert.equal(slotInHours(span, "America/New_York", [[[540,1020]],[[540,720],[780,1020]],[[540,1020]],[[540,1020]],[[540,1020]],[],[]], ["2030-07-04","12-25"]), false);
});

test("slotMasterFree: slotInHours: the break of a day does not fit", () => {
  const span = { start: new Date("2030-07-02T16:30:00.000Z"), end: new Date("2030-07-02T17:30:00.000Z") };
  assert.equal(slotInHours(span, "America/New_York", [[[540,1020]],[[540,720],[780,1020]],[[540,1020]],[[540,1020]],[[540,1020]],[],[]], ["2030-07-04","12-25"]), false);
});

test("slotMasterFree: slotInHours: the hour after the break fits", () => {
  const span = { start: new Date("2030-07-02T17:00:00.000Z"), end: new Date("2030-07-02T18:00:00.000Z") };
  assert.equal(slotInHours(span, "America/New_York", [[[540,1020]],[[540,720],[780,1020]],[[540,1020]],[[540,1020]],[[540,1020]],[],[]], ["2030-07-04","12-25"]), true);
});

test("slotMasterFree: slotInHours: the day is the day of the zone, not of UTC", () => {
  const span = { start: new Date("2030-07-02T01:00:00.000Z"), end: new Date("2030-07-02T02:00:00.000Z") };
  assert.equal(slotInHours(span, "America/New_York", [[[540,1020]],[[540,720],[780,1020]],[[540,1020]],[[540,1020]],[[540,1020]],[],[]], ["2030-07-04","12-25"]), false);
});

test("slotMasterFree: slotInHours: a record that crosses the interval is refused", () => {
  const span = { start: new Date("2030-07-02T15:30:00.000Z"), end: new Date("2030-07-02T17:30:00.000Z") };
  assert.equal(slotInHours(span, "America/New_York", [[[540,1020]],[[540,720],[780,1020]],[[540,1020]],[[540,1020]],[[540,1020]],[],[]], ["2030-07-04","12-25"]), false);
});

test("slotMasterFree: slotsCrowded: time shared with another is crowded", () => {
  const span = (start: string, end: string) => ({ start: new Date(start), end: new Date(end) });
  const taken = [span("2030-01-01T10:30:00.000Z", "2030-01-01T11:30:00.000Z")];
  assert.equal(slotsCrowded(span("2030-01-01T10:00:00.000Z", "2030-01-01T11:00:00.000Z"), taken, 1, 0), true);
});

test("slotMasterFree: slotsCrowded: a start right when the other ends is not", () => {
  const span = (start: string, end: string) => ({ start: new Date(start), end: new Date(end) });
  const taken = [span("2030-01-01T11:00:00.000Z", "2030-01-01T12:00:00.000Z")];
  assert.equal(slotsCrowded(span("2030-01-01T10:00:00.000Z", "2030-01-01T11:00:00.000Z"), taken, 1, 0), false);
});

test("slotMasterFree: slotsCrowded: one taken place of two leaves room", () => {
  const span = (start: string, end: string) => ({ start: new Date(start), end: new Date(end) });
  const taken = [span("2030-01-01T10:00:00.000Z", "2030-01-01T11:00:00.000Z")];
  assert.equal(slotsCrowded(span("2030-01-01T10:00:00.000Z", "2030-01-01T11:00:00.000Z"), taken, 2, 0), false);
});

test("slotMasterFree: slotsCrowded: two records at the same time fill a capacity of two", () => {
  const span = (start: string, end: string) => ({ start: new Date(start), end: new Date(end) });
  const taken = [span("2030-01-01T10:00:00.000Z", "2030-01-01T11:00:00.000Z"), span("2030-01-01T10:30:00.000Z", "2030-01-01T11:30:00.000Z")];
  assert.equal(slotsCrowded(span("2030-01-01T10:00:00.000Z", "2030-01-01T11:00:00.000Z"), taken, 2, 0), true);
});

test("slotMasterFree: slotsCrowded: records one after the other never fill a capacity of two", () => {
  const span = (start: string, end: string) => ({ start: new Date(start), end: new Date(end) });
  const taken = [span("2030-01-01T09:30:00.000Z", "2030-01-01T10:30:00.000Z"), span("2030-01-01T10:30:00.000Z", "2030-01-01T11:30:00.000Z")];
  assert.equal(slotsCrowded(span("2030-01-01T10:00:00.000Z", "2030-01-01T11:00:00.000Z"), taken, 2, 0), false);
});

test("slotMasterFree: slotsCrowded: a buffer widens every taken span on both sides", () => {
  const span = (start: string, end: string) => ({ start: new Date(start), end: new Date(end) });
  const taken = [span("2030-01-01T11:10:00.000Z", "2030-01-01T11:40:00.000Z")];
  assert.equal(slotsCrowded(span("2030-01-01T10:00:00.000Z", "2030-01-01T11:00:00.000Z"), taken, 1, 15), true);
});

test("slotMasterFree: slotsCrowded: a gap as wide as the buffer is enough", () => {
  const span = (start: string, end: string) => ({ start: new Date(start), end: new Date(end) });
  const taken = [span("2030-01-01T11:15:00.000Z", "2030-01-01T11:40:00.000Z")];
  assert.equal(slotsCrowded(span("2030-01-01T10:00:00.000Z", "2030-01-01T11:00:00.000Z"), taken, 1, 15), false);
});

test("slotMasterFree: a record that overlaps another is refused with 409", async () => {
  await assert.rejects(() => slotMasterFreeAttempt([{"id":"existing","startsAt":"2030-01-14T07:00:00.000Z","masterId":"resource-a","serviceId":"length-key"}], {"id":"new","startsAt":"2030-01-14T07:30:00.000Z","masterId":"resource-a","serviceId":"length-key"}), ConflictException);
});

test("slotMasterFree: a record that starts when the other ends is accepted", async () => {
  await slotMasterFreeAttempt([{"id":"existing","startsAt":"2030-01-14T07:00:00.000Z","masterId":"resource-a","serviceId":"length-key"}], {"id":"new","startsAt":"2030-01-14T08:00:00.000Z","masterId":"resource-a","serviceId":"length-key"});
});

test("slotMasterFree: another masterId is free at the same time", async () => {
  await slotMasterFreeAttempt([{"id":"existing","startsAt":"2030-01-14T07:00:00.000Z","masterId":"resource-a","serviceId":"length-key"}], {"id":"new","startsAt":"2030-01-14T07:00:00.000Z","masterId":"resource-b","serviceId":"length-key"});
});

test("slotMasterFree: a record with the status cancelled does not block the time", async () => {
  await slotMasterFreeAttempt([{"id":"existing","startsAt":"2030-01-14T07:00:00.000Z","masterId":"resource-a","serviceId":"length-key","status":"cancelled"}], {"id":"new","startsAt":"2030-01-14T07:00:00.000Z","masterId":"resource-a","serviceId":"length-key"});
});

test("slotMasterFree: a record inside the working hours is accepted", async () => {
  await slotMasterFreeAttempt([], {"id":"new","startsAt":"2030-01-14T07:00:00.000Z","masterId":"resource-a","serviceId":"length-key"});
});

test("slotMasterFree: a record before the working hours is refused with 409", async () => {
  await assert.rejects(() => slotMasterFreeAttempt([], {"id":"new","startsAt":"2030-01-14T06:30:00.000Z","masterId":"resource-a","serviceId":"length-key"}), ConflictException);
});

test("slotMasterFree: a record on a holiday is refused with 409", async () => {
  await assert.rejects(() => slotMasterFreeAttempt([], {"id":"new","startsAt":"2030-01-01T07:00:00.000Z","masterId":"resource-a","serviceId":"length-key"}), ConflictException);
});

test("slotMasterFree: two requests for the same time at once, one is saved and the other refused with 409", async () => {
  const rows: Row[] = [];
  const repository = serviceWith(rows).bookingRepository;
  const service = lockSlots(
    withHooks(
      {
    bookingRepository: repository,
    async createBooking(body: Row) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      rows.push(body);
      return body;
    },
      },
      logicHooks as any,
    ),
  );
  const settled = await withoutDatabase(() => Promise.allSettled([service.createBooking({"id":"first","startsAt":"2030-01-14T07:00:00.000Z","masterId":"resource-a","serviceId":"length-key"}), service.createBooking({"id":"second","startsAt":"2030-01-14T07:30:00.000Z","masterId":"resource-a","serviceId":"length-key"})]));
  assert.equal(settled.filter((result) => result.status === "fulfilled").length, 1);
  const refused = settled.find((result) => result.status === "rejected") as PromiseRejectedResult;
  assert.ok(refused.reason instanceof ConflictException);
});

async function limitPerPhonePerDayAttempt(rows: Row[], candidate: Row, id?: unknown): Promise<void> {
  await withoutDatabase(() => (logicHooks.before as any)["createBooking"].call(serviceWith(rows), candidate));
}

test("limitPerPhonePerDay: a record over the limit of 3 is refused with 409", async () => {
  await assert.rejects(() => limitPerPhonePerDayAttempt([{"id":"existing-0","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"counted-status"}, {"id":"existing-1","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"counted-status"}, {"id":"existing-2","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"counted-status"}], {"id":"new","clientPhone":"group-a","startsAt":"2030-01-15T11:00:00.000Z","status":"counted-status"}), ConflictException);
});

test("limitPerPhonePerDay: the last of the 3 places is accepted", async () => {
  await limitPerPhonePerDayAttempt([{"id":"existing-0","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"counted-status"}, {"id":"existing-1","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"counted-status"}], {"id":"new","clientPhone":"group-a","startsAt":"2030-01-15T11:00:00.000Z","status":"counted-status"});
});

test("limitPerPhonePerDay: another clientPhone has its own 3", async () => {
  await limitPerPhonePerDayAttempt([{"id":"existing-0","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"counted-status"}, {"id":"existing-1","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"counted-status"}, {"id":"existing-2","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"counted-status"}], {"id":"new","clientPhone":"group-b","startsAt":"2030-01-15T11:00:00.000Z","status":"counted-status"});
});

test("limitPerPhonePerDay: the records of another day do not count", async () => {
  await limitPerPhonePerDayAttempt([{"id":"existing-0","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"counted-status"}, {"id":"existing-1","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"counted-status"}, {"id":"existing-2","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"counted-status"}], {"id":"new","clientPhone":"group-a","startsAt":"2030-04-15T10:00:00.000Z","status":"counted-status"});
});

test("limitPerPhonePerDay: a record with the status cancelled does not count", async () => {
  await limitPerPhonePerDayAttempt([{"id":"existing-0","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"cancelled"}, {"id":"existing-1","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"cancelled"}, {"id":"existing-2","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"cancelled"}], {"id":"new","clientPhone":"group-a","startsAt":"2030-01-15T11:00:00.000Z","status":"counted-status"});
});

test("limitPerPhonePerDay: a record with the status cancelled is accepted at any time", async () => {
  await limitPerPhonePerDayAttempt([{"id":"existing-0","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"counted-status"}, {"id":"existing-1","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"counted-status"}, {"id":"existing-2","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"counted-status"}], {"id":"new","clientPhone":"group-a","startsAt":"2030-01-15T11:00:00.000Z","status":"cancelled"});
});

test("limitPerPhonePerDay: two requests for the last place at once, one is saved and the other refused with 409", async () => {
  const rows: Row[] = [{"id":"existing-0","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"counted-status"},{"id":"existing-1","clientPhone":"group-a","startsAt":"2030-01-15T10:00:00.000Z","status":"counted-status"}];
  const repository = serviceWith(rows).bookingRepository;
  const service = lockSlots(
    withHooks(
      {
    bookingRepository: repository,
    async createBooking(body: Row) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      rows.push(body);
      return body;
    },
      },
      logicHooks as any,
    ),
  );
  const settled = await withoutDatabase(() => Promise.allSettled([service.createBooking({"id":"first","clientPhone":"group-a","startsAt":"2030-01-15T11:00:00.000Z","status":"counted-status"}), service.createBooking({"id":"second","clientPhone":"group-a","startsAt":"2030-01-15T11:00:00.000Z","status":"counted-status"})]));
  assert.equal(settled.filter((result) => result.status === "fulfilled").length, 1);
  const refused = settled.find((result) => result.status === "rejected") as PromiseRejectedResult;
  assert.ok(refused.reason instanceof ConflictException);
});

test("flowBookingSteps: new may change to confirmed", () => {
  assert.equal(flowBookingStepsAllows("new", "confirmed"), true);
});

test("flowBookingSteps: new may not change to done", () => {
  assert.equal(flowBookingStepsAllows("new", "done"), false);
});

test("flowBookingSteps: a status the flow does not list is not checked", () => {
  assert.equal(flowBookingStepsAllows("not-in-the-flow", "new"), true);
  assert.equal(flowBookingStepsAllows(undefined, "new"), true);
});

test("flowBookingSteps: updateBooking: a change the flow does not allow is refused with 409", async () => {
  const service = serviceWith([{ "id": "a", "status": "new" }]);
  await assert.rejects(async () => (logicHooks.before as any)["updateBooking"].call(service, "a", { "status": "done" }), ConflictException);
});

test("flowBookingSteps: updateBooking: a change the flow allows goes through", async () => {
  const service = serviceWith([{ "id": "a", "status": "new" }]);
  await (logicHooks.before as any)["updateBooking"].call(service, "a", { "status": "confirmed" });
});

test("flowBookingSteps: patchBooking: a change the flow does not allow is refused with 409", async () => {
  const service = serviceWith([{ "id": "a", "status": "new" }]);
  await assert.rejects(async () => (logicHooks.before as any)["patchBooking"].call(service, "a", { "status": "done" }), ConflictException);
});

test("flowBookingSteps: patchBooking: a change the flow allows goes through", async () => {
  const service = serviceWith([{ "id": "a", "status": "new" }]);
  await (logicHooks.before as any)["patchBooking"].call(service, "a", { "status": "confirmed" });
});

test("reactionNewBookingNotice: New Booking Notice: follows a record that meets its conditions", () => {
  assert.equal(reactionNewBookingNoticeFires(null, {"id":"r1","masterId":"copied","clientName":"copied","clientPhone":"copied","startsAt":"copied"}), true);
});

test("reactionNewBookingNotice: New Booking Notice: creates the record in the other table", async () => {
  const made: { table: string; data: Row }[] = [];
  Object.assign(reactionNewBookingNoticeStore, { create: async (table: string, data: Row) => void made.push({ table, data }) });
  await reactionNewBookingNoticeRun(undefined, {"id":"r1","masterId":"copied","clientName":"copied","clientPhone":"copied","startsAt":"copied"});
  assert.equal(made.length, 1);
  assert.equal(made[0]?.table, "notice");
});

test("reactionBookingReminderNotice: Booking Reminder Notice: follows a record that meets its conditions", () => {
  assert.equal(reactionBookingReminderNoticeFires({"id":"r1","status":"confirmed","masterId":"copied","clientName":"copied","clientPhone":"copied","startsAt":"copied"}, {"id":"r1","status":"confirmed","masterId":"copied","clientName":"copied","clientPhone":"copied","startsAt":"copied"}), true);
});

test("reactionBookingReminderNotice: Booking Reminder Notice: does not follow a record that breaks a condition", () => {
  assert.equal(reactionBookingReminderNoticeFires({"id":"r1","status":"confirmed","masterId":"copied","clientName":"copied","clientPhone":"copied","startsAt":"copied"}, {"id":"r1","status":"confirmed-other","masterId":"copied","clientName":"copied","clientPhone":"copied","startsAt":"copied"}), false);
});

test("reactionBookingReminderNotice: Booking Reminder Notice: creates the record in the other table", async () => {
  const made: { table: string; data: Row }[] = [];
  Object.assign(reactionBookingReminderNoticeStore, { create: async (table: string, data: Row) => void made.push({ table, data }) });
  await reactionBookingReminderNoticeRun(undefined, {"id":"r1","status":"confirmed","masterId":"copied","clientName":"copied","clientPhone":"copied","startsAt":"copied"});
  assert.equal(made.length, 1);
  assert.equal(made[0]?.table, "notice");
});

test("flowBookingSteps: history: a created record starts it, a changed status adds a row, an unchanged one adds nothing", async () => {
  const rows: Row[] = [{ "id": "a", "status": "new" }];
  const kept: Row[] = [];
  const log = { create: async (row: Row) => (kept.push(row), row) };
  const service = keepHistory({
    ...serviceWith(rows),
    bookingStatusLogRepository: log,
    async createBooking(body: Row) {
      const created = { "id": "b", ...body };
      rows.push(created);
      return created;
    },
    async updateBooking(id: unknown, body: Row) {
      // A new object, not a change in place: the history reads the old record before the call and must see the old status.
      const index = rows.findIndex((row) => row["id"] === id);
      rows[index] = { ...(rows[index] as Row), ...body };
      return rows[index];
    },
  });
  await service.createBooking({ "status": "new" });
  await service.updateBooking("a", { "status": "not-in-the-flow" });
  await service.updateBooking("a", { "status": "not-in-the-flow" });
  const withoutTime = kept.map(({ "changedAt": changedAt, ...rest }) => (assert.equal(typeof changedAt, "number"), rest));
  assert.deepEqual(withoutTime, [{ "recordId": "b", "fromStatus": "", "toStatus": "new" }, { "recordId": "a", "fromStatus": "new", "toStatus": "not-in-the-flow" }]);
});

test("auditBookingTrail: audit: a created record, a changed field, an unchanged call and a deleted record each leave a row; a field left out never does", async () => {
  const auditauditBookingTrailRows: Row[] = [{ "id": "a", "clientName": "old" }];
  const kept: Row[] = [];
  const log = { create: async (entry: Row) => (kept.push(entry), entry) };
  const service = keepAudit({
    ...serviceWith(auditauditBookingTrailRows),
    bookingAuditLogRepository: log,
    async createBooking(body: Row) {
      const created = { "id": "b", ...body };
      auditauditBookingTrailRows.push(created);
      return created;
    },
    async updateBooking(id: unknown, body: Row) {
      const index = auditauditBookingTrailRows.findIndex((row) => row["id"] === id);
      auditauditBookingTrailRows[index] = { ...(auditauditBookingTrailRows[index] as Row), ...body };
      return auditauditBookingTrailRows[index];
    },
    async deleteBooking(id: unknown) {
      auditauditBookingTrailRows.splice(auditauditBookingTrailRows.findIndex((row) => row["id"] === id), 1);
      return true;
    },
  });
  await service.createBooking({ "clientName": "fresh" });
  await service.updateBooking("a", { "clientName": "new" });
  await service.updateBooking("a", { "clientName": "new" });
  await service.deleteBooking("a");
  const withoutTime = kept.map(({ "changedAt": changedAt, ...rest }) => (assert.equal(typeof changedAt, "number"), rest));
  assert.deepEqual(withoutTime, [{ "recordId": "b", "action": "create", "actor": "", "changes": JSON.stringify({ "id": { to: "b" }, "clientName": { to: "fresh" } }) }, { "recordId": "a", "action": "update", "actor": "", "changes": JSON.stringify({ "clientName": { from: "old", to: "new" } }) }, { "recordId": "a", "action": "delete", "actor": "", "changes": JSON.stringify({ "id": { from: "a" }, "clientName": { from: "new" } }) }]);
});

test("idempotencyBookingOnce: idempotency: a repeated key answers the record the first call made, and with another body is refused (422); another key, another caller, an old key and no key make new ones", async () => {
  const idemRows: Row[] = [];
  const stored: Row[] = [];
  const log = {
    findByField: async (field: string, value: unknown) => stored.find((row) => row[field] === value) ?? null,
    findPage: async (query: { filters: Record<string, string> }) => ({
      items: stored.filter((row) => Number(row["createdAt"]) <= Number(query.filters["createdAt_to"])),
    }),
    create: async (row: Row) => (stored.push({ id: String(stored.length + 1), ...row }), row),
    remove: async (id: unknown) => (stored.splice(stored.findIndex((row) => row.id === id), 1), true),
  };
  const service = keepIdempotency({
    ...serviceWith(idemRows),
    bookingIdempotencyKeyRepository: log,
    async createBooking(body: Row) {
      const created = { "id": String(idemRows.length + 1), ...body };
      idemRows.push(created);
      return created;
    },
  });
  const make = (token: string | undefined, caller = "") =>
    token === undefined
      ? service.createBooking({})
      : runWithKey(token, caller, () => service.createBooking({}));
  const first = await make("one");
  const again = await make("one");
  assert.equal(again["id"], first["id"]);
  assert.equal(idemRows.length, 1);
  await assert.rejects(
    () => runWithKey("one", "", () => service.createBooking({ other: 1 })),
    (error: any) => (error.status ?? error.getStatus?.()) === 422,
  );
  assert.equal(idemRows.length, 1);
  await make("two");
  await make("one", "someone");
  await make(undefined);
  await make(undefined);
  assert.equal(idemRows.length, 5);
  assert.equal(stored.length, 3);
  assert.equal(stored[0]?.["requestKey"], ":one");
  assert.equal(stored[2]?.["requestKey"], "someone:one");
  const old = stored[0] as Row;
  old["createdAt"] = Date.now() / 1000 - 86405;
  (stored[1] as Row)["createdAt"] = Date.now() / 1000 - 86405;
  const renewed = await make("one");
  assert.notEqual(renewed["id"], first["id"]);
  assert.equal(idemRows.length, 6);
  assert.equal(stored.filter((row) => row["requestKey"] === ":one").length, 1);
  assert.equal(stored.filter((row) => row["requestKey"] === ":two").length, 0);
});

test("flowBookingSteps: timers: a record is overdue once its time in the status is up, and never without a row of the history", () => {
  assert.equal(flowBookingStepsOverdue(100, 100 + 86400, 86400), true);
  assert.equal(flowBookingStepsOverdue(100, 100 + 86400 - 1, 86400), false);
  assert.equal(flowBookingStepsOverdue(undefined, 100 + 86400, 86400), false);
});

test("flowBookingSteps: timers: a sweep moves the records whose time is up and leaves the others", async () => {
  const now = Date.now() / 1000;
  const rows: Row[] = [
    { "id": "late", "status": "new" },
    { "id": "early", "status": "new" },
    { "id": "unknown", "status": "new" },
    { "id": "elsewhere", "status": "cancelled" },
  ];
  const entries: Row[] = [
    { "recordId": "late", "toStatus": "new", "changedAt": now - 86400 - 5 },
    { "recordId": "early", "toStatus": "new", "changedAt": now },
    { "recordId": "elsewhere", "toStatus": "cancelled", "changedAt": now - 86400 - 5 },
  ];
  const log = { findPage: async () => ({ items: entries, total: entries.length }) };
  const moved: unknown[][] = [];
  const service = {
    ...serviceWith(rows),
    bookingStatusLogRepository: log,
    async patchBooking(id: unknown, body: Row) {
      moved.push([id, body]);
    },
  };
  await sweepTimers.call(service);
  assert.deepEqual(moved, [["late", { "status": "cancelled" }]]);
});
