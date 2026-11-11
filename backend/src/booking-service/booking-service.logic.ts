// Generated from the logic blocks of the "Booking" table. A Regenerate rewrites this file, so change the blocks, not the file.
// Code of your own goes in booking-service.hooks.ts and in the *.custom.ts files, which a Regenerate leaves alone.
import { createHash } from "node:crypto";
import { ConflictException, HttpException } from "@nestjs/common";
import { callerId, idempotencyKey, callerRole } from "../request-context";
import { PrismaClient } from "@prisma/client";
import { ambient, inTransaction } from "../transaction-scope";
import type { Hooks } from "../with-hooks";
import type { BookingRepository } from "./booking-repository.repository";
import type { BookingAuditLogRepository } from "./booking-audit-log-repository.repository";
import type { BookingIdempotencyKeyRepository } from "./booking-idempotency-key-repository.repository";
import type { BookingStatusLogRepository } from "./booking-status-log-repository.repository";
import type { BookingService } from "./booking-service.service";

type Row = Record<string, any>;

/** The record as the call would leave it: a field the body leaves out keeps its value (a body made from a class has such fields set to undefined). */
function merged(current: Row, dto: Row): Row {
  return { ...current, ...Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined)) };
}

function toDate(value: unknown): Date | undefined {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

let prisma: PrismaClient | undefined;

export interface Span {
  start: Date;
  end: Date;
}

/**
 * True when the time of `mine` is full: at some moment of it, `capacity` of the `taken` spans already hold the time, each
 * widened by `bufferMinutes` on both sides. A span that starts when another ends is not in its way.
 */
export function slotsCrowded(mine: Span, taken: Span[], capacity: number, bufferMinutes: number): boolean {
  const widen = bufferMinutes * 60_000;
  const from = mine.start.getTime();
  const spans = taken
    .map((span) => ({ start: span.start.getTime() - widen, end: span.end.getTime() + widen }))
    .filter((span) => span.start < mine.end.getTime() && from < span.end);
  const moments = [from, ...spans.map((span) => span.start).filter((moment) => moment > from)];
  return moments.some(
    (moment) => spans.filter((span) => span.start <= moment && moment < span.end).length >= capacity,
  );
}

const zoneFormats = new Map<string, Intl.DateTimeFormat>();

/** The wall clock of `timezone` at a moment: the day number and the seconds of its date, its weekday (Monday is 0) and its date as YYYY-MM-DD. */
function localMoment(date: Date, timezone: string) {
  let format = zoneFormats.get(timezone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    zoneFormats.set(timezone, format);
  }
  const part: Record<string, string> = {};
  for (const { type, value } of format.formatToParts(date)) part[type] = value;
  const utc = Date.UTC(Number(part.year), Number(part.month) - 1, Number(part.day));
  return {
    day: utc / 86_400_000,
    seconds: (Number(part.hour) % 24) * 3600 + Number(part.minute) * 60 + Number(part.second),
    weekday: (new Date(utc).getUTCDay() + 6) % 7,
    key: part.year + "-" + part.month + "-" + part.day,
  };
}

/**
 * True when `mine` fits one interval of one day of `timezone` that is not a holiday. `days` holds the intervals of each
 * weekday as minutes of the day, Monday first; a holiday is YYYY-MM-DD for one day or MM-DD for every year.
 */
export function slotInHours(mine: Span, timezone: string, days: [number, number][][], holidays: readonly string[]): boolean {
  const from = localMoment(mine.start, timezone);
  const to = localMoment(mine.end, timezone);
  if (holidays.some((holiday) => holidayHit(holiday, from.key))) return false;
  const closing = to.day === from.day ? to.seconds : to.day === from.day + 1 && to.seconds === 0 ? 86_400 : -1;
  return (days[from.weekday] ?? []).some(([open, close]) => closing >= 0 && open * 60 <= from.seconds && closing <= close * 60);
}

/** True when the local date `key` (YYYY-MM-DD) is the holiday: that day, that day of every year (MM-DD), or a day of a stretch (YYYY-MM-DD..YYYY-MM-DD). */
function holidayHit(holiday: string, key: string): boolean {
  const [first = "", last] = holiday.split("..");
  return last === undefined ? first === key || first === key.slice(5) : first <= key && key <= last;
}

/** The hours a master writes, like `mon-fri 09:00-13:00 14:00-18:00; sat 10:00-14:00`, as the intervals of each weekday in minutes, Monday first. Nothing when it is empty or unreadable. */
export function workHoursOf(text: string): [number, number][][] | undefined {
  const names = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const days: [number, number][][] = names.map(() => []);
  let written = false;
  for (const part of text.split(/[;\n]/)) {
    const [dayNames = "", ...times] = part.trim().split(/ +/);
    if (dayNames === "") continue;
    const weekdays: number[] = [];
    for (const name of dayNames.toLowerCase().split(",")) {
      const range = name.split("-");
      const first = names.indexOf(range[0] ?? "");
      const last = range.length === 1 ? first : names.indexOf(range[1] ?? "");
      if (range.length > 2 || first < 0 || last < 0) return undefined;
      for (let day = first; ; day = (day + 1) % 7) {
        weekdays.push(day);
        if (day === last) break;
      }
    }
    if (times.length === 0) return undefined;
    for (const time of times) {
      const match = /^([0-9]{1,2}):([0-9]{2})-([0-9]{1,2}):([0-9]{2})$/.exec(time);
      const open = match ? Number(match[1]) * 60 + Number(match[2]) : -1;
      const close = match ? Number(match[3]) * 60 + Number(match[4]) : -1;
      if (!match || Number(match[2]) > 59 || Number(match[4]) > 59 || open < 0 || close > 1440 || open >= close) return undefined;
      for (const day of weekdays) days[day]?.push([open, close]);
    }
    written = true;
  }
  return written ? days.map((intervals) => intervals.sort((a, b) => a[0] - b[0])) : undefined;
}

/** The days off a master writes, like `2030-12-31, 12-31, 2030-07-01..2030-07-14`; what is not a date is left out. */
export function holidaysOf(text: string): string[] {
  return text.split(/[,; \n]+/).filter((holiday) => /^([0-9]{4}-[0-9]{2}-[0-9]{2}(\.\.[0-9]{4}-[0-9]{2}-[0-9]{2})?|[0-9]{2}-[0-9]{2})$/.test(holiday));
}

/** A start time the free route offers: the moment, when it ends, and its local date and time of day. */
export interface FreeTime {
  start: string;
  end: string;
  date: string;
  time: string;
}

/** A time that is taken, as the answer of the busy route gives it. */
export interface BusyTime {
  start: string;
  end: string;
  resource: unknown;
}

/**
 * The spans in which the time is full: where `capacity` of the `taken` spans hold it at once, each widened by
 * `bufferMinutes` on both sides, with the ones that touch joined into one.
 */
export function slotsBusy(taken: Span[], capacity: number, bufferMinutes: number): Span[] {
  const widen = bufferMinutes * 60_000;
  const changes = taken
    .flatMap((span) => [
      { at: span.start.getTime() - widen, change: 1 },
      { at: span.end.getTime() + widen, change: -1 },
    ])
    .sort((a, b) => a.at - b.at || a.change - b.change);
  const busy: Span[] = [];
  let holding = 0;
  let since = 0;
  for (const { at, change } of changes) {
    const before = holding;
    holding += change;
    if (before < capacity && holding >= capacity) {
      since = at;
    } else if (before >= capacity && holding < capacity) {
      const last = busy[busy.length - 1];
      if (last && last.end.getTime() === since) last.end = new Date(at);
      else busy.push({ start: new Date(since), end: new Date(at) });
    }
  }
  return busy;
}

// Slot Check "Master Free"
const slotMasterFreeFree: readonly unknown[] = ["cancelled"];
const slotMasterFreeRelevant: readonly string[] = ["startsAt","masterId","status","serviceId"];
const slotMasterFreeDays: [number, number][][] = [[[600,1200]],[[600,1200]],[[600,1200]],[[600,1200]],[[600,1200]],[[600,1080]],[]];
const slotMasterFreeHolidays: readonly string[] = ["01-01","01-02","01-03","01-04","01-05","01-06","01-07","01-08","02-23","03-08","05-01","05-09","06-12","11-04"];

/** The hours of the "masterId" a record is for: the "workHours" and the "daysOff" of the Master it names. The block's own hours stay when there is no such row, no hours written in it, or no database to ask. */
async function slotMasterFreeHours(resource: Row[string]): Promise<{ days: [number, number][][]; holidays: readonly string[] }> {
  const block = { days: slotMasterFreeDays, holidays: slotMasterFreeHolidays };
  if (resource === undefined || resource === null || !process.env.DATABASE_URL) return block;
  prisma ??= ambient(new PrismaClient());
  try {
    const found = (await prisma.master.findUnique({ where: { id: resource } })) as Row | null;
    return {
      days: workHoursOf(String(found?.["workHours"] ?? "")) ?? block.days,
      holidays: [...block.holidays, ...holidaysOf(String(found?.["daysOff"] ?? ""))],
    };
  } catch {
    // A key the table cannot hold (not a uuid, say) names no row: the block's hours apply.
    return block;
  }
}

/** How long a record takes: the "durationMinutes" of the Service its "serviceId" names; 60 minutes when there is no such record, or no database to ask. */
async function slotMasterFreeMinutes(row: Row): Promise<number> {
  const key = row["serviceId"];
  if (key === undefined || key === null || !process.env.DATABASE_URL) return 60;
  prisma ??= ambient(new PrismaClient());
  try {
    const found = (await prisma.service.findUnique({ where: { id: key } })) as Row | null;
    const minutes = Number(found?.["durationMinutes"]);
    return minutes > 0 ? minutes : 60;
  } catch {
    // A key the table cannot hold (not a uuid, say) names no record: the default applies.
    return 60;
  }
}

/** When a record takes place: from its start to the end of its length. */
async function slotMasterFreeSpan(row: Row): Promise<Span | undefined> {
  const start = toDate(row["startsAt"]);
  if (!start) return undefined;
  return { start, end: new Date(start.getTime() + (await slotMasterFreeMinutes(row)) * 60_000) };
}

/** Refuses (409) a record whose time is full: it overlaps another record of the same masterId. With `changed`, only when it touches what the check reads. */
async function slotMasterFreeCheck(repository: BookingRepository, next: Row, ignoreId?: unknown, changed?: Row): Promise<void> {
  if (changed && !slotMasterFreeRelevant.some((name) => changed[name] !== undefined)) return;
  const mine = await slotMasterFreeSpan(next);
  if (!mine || slotMasterFreeFree.includes(next["status"])) return;
  const resource = next["masterId"];
  const hours = await slotMasterFreeHours(resource);
  if (!slotInHours(mine, "Europe/Moscow", hours.days, hours.holidays)) {
    throw new ConflictException("Салон в это время закрыт");
  }
  const page = await repository.findPage({ search: undefined, offset: 0 });
  const taken: Span[] = [];
  for (const other of page.items as Row[]) {
    if (ignoreId !== undefined && other["id"] === ignoreId) continue;
    if ((other["masterId"] ?? null) !== (resource ?? null)) continue;
    if (slotMasterFreeFree.includes(other["status"])) continue;
    const span = await slotMasterFreeSpan(other);
    if (span) taken.push(span);
  }
  if (slotsCrowded(mine, taken, 1, 0)) {
    throw new ConflictException("Мастер занят в это время");
  }
}

/** The times this check holds among `rows`, the ones still to come, as the site draws them: `{ start, end, resource }`. */
async function slotMasterFreeBusy(rows: Row[]): Promise<BusyTime[]> {
  const groups = new Map<unknown, Span[]>();
  for (const row of rows) {
    if (slotMasterFreeFree.includes(row["status"])) continue;
    const span = await slotMasterFreeSpan(row);
    if (!span) continue;
    const resource = row["masterId"] ?? null;
    groups.set(resource, [...(groups.get(resource) ?? []), span]);
  }
  const now = Date.now();
  const busy: BusyTime[] = [];
  for (const [resource, spans] of groups) {
    for (const span of slotsBusy(spans, 1, 0)) {
      if (span.end.getTime() > now) busy.push({ start: span.start.toISOString(), end: span.end.toISOString(), resource });
    }
  }
  return busy;
}

/**
 * The start times a record could take on the local day `filters.date` (YYYY-MM-DD, "Europe/Moscow") for `filters.minutes`, or the length of the "serviceId" that `filters.lengthKey` names (60 when neither is given): every 30 minutes of
 * the clock, in the future, that the hours of the check allow and no other record crowds, tried with the same functions the check of a record uses.
 * A missing or unreadable date asks about no day: nothing is offered.
 */
async function slotMasterFreeFreeTimes(rows: Row[], filters: Record<string, string>): Promise<FreeTime[]> {
  const date = filters.date ?? "";
  const base = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date) ? Date.parse(date + "T00:00:00Z") : Number.NaN;
  if (Number.isNaN(base)) return [];
  const asked = Number(filters.minutes);
  const minutes = Number.isInteger(asked) && asked > 0 ? asked : await slotMasterFreeMinutes({ "serviceId": filters.lengthKey });
  const resource = filters["masterId"];
  const hours = await slotMasterFreeHours(resource);
  const taken: Span[] = [];
  for (const other of rows) {
    if ((other["masterId"] ?? null) !== (resource ?? null)) continue;
    if (slotMasterFreeFree.includes(other["status"])) continue;
    const span = await slotMasterFreeSpan(other);
    if (span) taken.push(span);
  }
  const now = Date.now();
  const offered: FreeTime[] = [];
  for (let at = base - 14 * 3_600_000; at <= base + 36 * 3_600_000; at += 300_000) {
    const start = new Date(at);
    const local = localMoment(start, "Europe/Moscow");
    if (local.key !== date || local.seconds % 1800 !== 0 || at <= now) continue;
    const mine = { start, end: new Date(at + minutes * 60_000) };
    if (!slotInHours(mine, "Europe/Moscow", hours.days, hours.holidays)) continue;
    if (slotsCrowded(mine, taken, 1, 0)) continue;
    offered.push({
      start: start.toISOString(),
      end: mine.end.toISOString(),
      date: local.key,
      time: String(Math.floor(local.seconds / 3600)).padStart(2, "0") + ":" + String(Math.floor((local.seconds % 3600) / 60)).padStart(2, "0"),
    });
  }
  return offered;
}

function limitWindow(date: Date, period: "day" | "week" | "month"): [string, string] {
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const [from, to] =
    period === "day"
      ? [day, day + 86_400_000]
      : period === "week"
        ? [day - ((date.getUTCDay() + 6) % 7) * 86_400_000, day - ((date.getUTCDay() + 6) % 7) * 86_400_000 + 7 * 86_400_000]
        : [Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1), Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)];
  return [new Date(from).toISOString(), new Date(to - 1).toISOString()];
}

// Limit "Per Phone Per Day"
const limitPerPhonePerDayFree: readonly unknown[] = ["cancelled"];
const limitPerPhonePerDayRelevant: readonly string[] = ["clientPhone","startsAt","status"];

/** Refuses (409) a record once 3 records of the same clientPhone in the same day already exist. With `changed`, only when it touches what the limit reads. */
async function limitPerPhonePerDayCheck(repository: BookingRepository, next: Row, ignoreId?: unknown, changed?: Row): Promise<void> {
  if (changed && !limitPerPhonePerDayRelevant.some((name) => changed[name] !== undefined)) return;
  if (limitPerPhonePerDayFree.includes(next["status"])) return;
  const filters: Record<string, string> = {};
  const group = next["clientPhone"];
  if (group === undefined || group === null || group === "") return;
  filters["clientPhone"] = String(group);
  const at = toDate(next["startsAt"]);
  if (!at) return;
  const [from, to] = limitWindow(at, "day");
  filters["startsAt_from"] = from;
  filters["startsAt_to"] = to;
  let count = 0;
  for (let offset = 0; count < 3; offset += 100) {
    const page = (await repository.findPage({ offset, limit: 100, filters })).items as Row[];
    for (const other of page) {
      if (ignoreId !== undefined && other["id"] === ignoreId) continue;
      if (String(other["clientPhone"] ?? "") !== filters["clientPhone"]) continue;
      const when = toDate(other["startsAt"]);
      if (!when || when.toISOString() < from || when.toISOString() > to) continue;
      if (limitPerPhonePerDayFree.includes(other["status"])) continue;
      count += 1;
    }
    if (page.length < 100) break;
  }
  if (count >= 3) throw new ConflictException("На этот номер уже три записи на этот день");
}

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

/** The [lock name, resource field] of each slot check; a record's key is the name and the value of its resource. */
const slotResources: readonly (readonly [string, string | null])[] = [
  ["Booking:slotMasterFree", "masterId"],
  ["Booking:limitPerPhonePerDay", "clientPhone"],
];

/** The keys to lock for a body, and for the record it changes: both resources when an update moves a record. */
function slotKeys(body: Row, current: Row | null): string[] {
  const keys = new Set<string>();
  for (const [name, resource] of slotResources) {
    if (resource === null) {
      keys.add(name);
      continue;
    }
    for (const source of [current, body]) {
      if (source !== null && source[resource] !== undefined) {
        keys.add(`${name}:${String(source[resource] ?? "")}`);
      }
    }
  }
  return [...keys].sort();
}

const lockedCalls: Record<string, "create" | "update" | "remove"> = {
  "createBooking": "create",
  "updateBooking": "update",
  "patchBooking": "update",
  "deleteBooking": "remove",
};

/** Wraps the calls of the Service so what each writes is kept or dropped together, and a slot check and its write cannot interleave with another's. Apply after `withHooks`: the transaction is the outermost step. */
export function lockSlots<T extends object>(target: T): T {
  const record = target as Record<string, unknown>;
  for (const [name, kind] of Object.entries(lockedCalls)) {
    const original = record[name] as (...args: unknown[]) => Promise<unknown>;
    record[name] = async function (this: any, ...args: unknown[]) {
      const body = (kind === "create" ? args[0] : kind === "update" ? args[1] : undefined) as Row | undefined;
      let keys: string[] = [];
      if (body !== undefined) {
        const repository = (this as any).bookingRepository as BookingRepository;
        const current = kind === "update" ? ((await repository.findById(args[0] as any)) as Row | null) : null;
        keys = slotKeys(body, current);
      }
      return locked(keys, () => original.apply(this, args));
    };
  }
  return target;
}

// Status Flow "Booking Steps"
const flowBookingStepsNext: Record<string, readonly string[]> = {
  "new": ["confirmed","cancelled"],
  "confirmed": ["done","cancelled"],
  "done": [],
  "cancelled": [],
};

/** True when "status" may change from `from` to `to`; a status the flow does not list is not checked. */
export function flowBookingStepsAllows(from: unknown, to: unknown): boolean {
  if (typeof from !== "string" || typeof to !== "string" || from === to) return true;
  const known = (status: string) => Object.prototype.hasOwnProperty.call(flowBookingStepsNext, status);
  if (!known(from) || !known(to)) return true;
  return flowBookingStepsNext[from].includes(to);
}

/** Refuses (409) a change of "status" the flow does not allow. */
function flowBookingStepsCheck(current: Row, changed: Row): void {
  const to = changed["status"];
  if (to === undefined) return;
  const from = current["status"];
  if (!flowBookingStepsAllows(from, to)) {
    throw new ConflictException("Нельзя перевести запись из «{from}» в «{to}»".split("{from}").join(String(from)).split("{to}").join(String(to)));
  }
}

/** The statuses a record as `current` may change to now: the ones flowBookingStepsCheck lets through for this caller, in the order the flow lists them. */
export function flowBookingStepsTransitions(current: Row): string[] {
  const statuses = new Set<string>([...Object.keys(flowBookingStepsNext), ...Object.values(flowBookingStepsNext).flat()]);
  return [...statuses].filter((to) => {
    if (to === current["status"]) return false;
    try {
      flowBookingStepsCheck(current, { ["status"]: to });
      return true;
    } catch {
      return false;
    }
  });
}

/** A value as text: nothing is an empty text. */
function text(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

// Reaction "New Booking Notice"
/** True when the record, saved by a call that left it as `after` (and found it as `before`), is one this Reaction follows. */
export function reactionNewBookingNoticeFires(before: Row | null, after: Row): boolean {
  return true;
}

/** The tables a Reaction writes to, reached through the database; with none to write to, nothing is written. */
export const reactionNewBookingNoticeStore = {
  async create(table: string, data: Row): Promise<void> {
    if (!process.env.DATABASE_URL) return;
    prisma ??= ambient(new PrismaClient());
    await (prisma as any)[table].create({ data });
  },
};

/** What the Reaction does: the `integration` is the client it sends through (none for a record in another table). */
export async function reactionNewBookingNoticeRun(integration: any, record: Row): Promise<void> {
  await reactionNewBookingNoticeStore.create("notice", { "masterId": record["masterId"], "clientName": record["clientName"], "clientPhone": record["clientPhone"], "startsAt": record["startsAt"], "kind": "new" });
}

// Reaction "Booking Reminder Notice"
/** True when the record, saved by a call that left it as `after` (and found it as `before`), is one this Reaction follows. */
export function reactionBookingReminderNoticeFires(before: Row | null, after: Row): boolean {
  if (text(after["status"]) !== "confirmed") return false;
  return true;
}

/** The tables a Reaction writes to, reached through the database; with none to write to, nothing is written. */
export const reactionBookingReminderNoticeStore = {
  async create(table: string, data: Row): Promise<void> {
    if (!process.env.DATABASE_URL) return;
    prisma ??= ambient(new PrismaClient());
    await (prisma as any)[table].create({ data });
  },
};

/** What the Reaction does: the `integration` is the client it sends through (none for a record in another table). */
export async function reactionBookingReminderNoticeRun(integration: any, record: Row): Promise<void> {
  await reactionBookingReminderNoticeStore.create("notice", { "masterId": record["masterId"], "clientName": record["clientName"], "clientPhone": record["clientPhone"], "startsAt": record["startsAt"], "kind": "reminder" });
}

// Reaction "Telegram Confirmed"
/** True when the record, saved by a call that left it as `after` (and found it as `before`), is one this Reaction follows. */
export function reactionTelegramConfirmedFires(before: Row | null, after: Row): boolean {
  if (text(after["status"]) !== "confirmed") return false;
  return true;
}

export function reactionTelegramConfirmedSubject(record: Row): string {
  return "";
}

/** The text with each Field made safe by `fill`: for a letter it is written as HTML. */
export function reactionTelegramConfirmedMessage(record: Row, fill: (value: unknown) => string): string {
  return "Ваша запись подтверждена: " + fill(record["startsAt"]) + ". Ждём вас!";
}

/** What the Reaction does: the `integration` is the client it sends through (none for a record in another table). */
export async function reactionTelegramConfirmedRun(integration: any, record: Row): Promise<void> {
  const chat = text(record["clientTelegramId"]);
  if (chat === "") return;
  await integration.sendMessage({ to: chat, text: reactionTelegramConfirmedMessage(record, text) });
}

// Reaction "Telegram Reminder"
/** True when the record, saved by a call that left it as `after` (and found it as `before`), is one this Reaction follows. */
export function reactionTelegramReminderFires(before: Row | null, after: Row): boolean {
  if (text(after["status"]) !== "confirmed") return false;
  return true;
}

export function reactionTelegramReminderSubject(record: Row): string {
  return "";
}

/** The text with each Field made safe by `fill`: for a letter it is written as HTML. */
export function reactionTelegramReminderMessage(record: Row, fill: (value: unknown) => string): string {
  return "Напоминаем: вы записаны на " + fill(record["startsAt"]) + ".";
}

/** What the Reaction does: the `integration` is the client it sends through (none for a record in another table). */
export async function reactionTelegramReminderRun(integration: any, record: Row): Promise<void> {
  const chat = text(record["clientTelegramId"]);
  if (chat === "") return;
  await integration.sendMessage({ to: chat, text: reactionTelegramReminderMessage(record, text) });
}

const reactionCalls: Record<string, "create" | "update" | "remove"> = {
  "createBooking": "create",
  "updateBooking": "update",
  "patchBooking": "update",
};

/** Wraps the calls of the Service that create, change or delete a record so each Reaction follows the record they save. Apply after `withHooks`, inside `lockSlots`. */
export function keepReactions<T extends object>(target: T): T {
  const record = target as Record<string, unknown>;
  for (const [name, kind] of Object.entries(reactionCalls)) {
    const original = record[name] as (...args: unknown[]) => Promise<unknown>;
    record[name] = async function (this: any, ...args: unknown[]) {
      const repository = (this as any).bookingRepository as BookingRepository;
      const before = kind === "create" ? null : ((await repository.findById(args[0] as any)) as Row | null);
      const result = (await original.apply(this, args)) as Row | null;
      const after = kind === "remove" ? before : result;
      if (after) {
        if (kind === "create") {
        if (reactionNewBookingNoticeFires(before, after)) {
          await reactionNewBookingNoticeRun(undefined, after);
        }
      }
        if (kind === "update") {
        if (reactionTelegramConfirmedFires(before, after)) {
          reactionTelegramConfirmedRun((this as any).telegramBot, after).catch((error) => console.error("Reaction Telegram Confirmed failed", error));
        }
      }
      }
      return result;
    };
  }
  return target;
}

/** The row of the history a call leaves: the status a created record starts with, or the one a changed record moves to. Nothing when the status stayed. */
export function flowBookingStepsHistory(kind: "create" | "update", before: Row | null, after: Row | null, id: unknown): Row | undefined {
  const to = after?.["status"];
  if (to === undefined || to === null || String(to) === "") return undefined;
  const from = kind === "update" ? String(before?.["status"] ?? "") : "";
  if (kind === "update" && from === String(to)) return undefined;
  return {
    "recordId": String(after?.["id"] ?? id),
    "fromStatus": from,
    "toStatus": String(to),
    "changedAt": Date.now() / 1000,
  };
}

const historyCalls: Record<string, "create" | "update"> = {
  "createBooking": "create",
  "updateBooking": "update",
  "patchBooking": "update",
};

/** Wraps the create and update calls of the Service so each change of status is kept as a row of the history. Apply after `withHooks`, inside `lockSlots`. */
export function keepHistory<T extends object>(target: T): T {
  const record = target as Record<string, unknown>;
  for (const [name, kind] of Object.entries(historyCalls)) {
    const original = record[name] as (...args: unknown[]) => Promise<unknown>;
    record[name] = async function (this: any, ...args: unknown[]) {
      const repository = (this as any).bookingRepository as BookingRepository;
      const before = kind === "update" ? ((await repository.findById(args[0] as any)) as Row | null) : null;
      const result = (await original.apply(this, args)) as Row | null;
      const entry = flowBookingStepsHistory(kind, before, result, args[0]);
      if (entry) await ((this as any).bookingStatusLogRepository as BookingStatusLogRepository).create(entry as any);
      return result;
    };
  }
  return target;
}

// Audit "Booking Trail"
const auditBookingTrailExcluded = new Set<string>([]);

/** JSON for the `changes` of a row: a Date is its ISO text and a bigint its digits. */
const auditBookingTrailJson = (value: unknown): string =>
  JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? item.toString() : item));

/** The fields a call changed, as `{ field: { from, to } }`: a created record has no `from`, a deleted one no `to`; the fields the Audit leaves out are not in it. */
export function auditBookingTrailChanges(kind: "create" | "update" | "remove", before: Row | null, after: Row | null): Record<string, { from?: unknown; to?: unknown }> {
  const changes: Record<string, { from?: unknown; to?: unknown }> = {};
  const names = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const name of names) {
    if (auditBookingTrailExcluded.has(name)) continue;
    const was = before?.[name];
    const now = after?.[name];
    if (kind === "create") {
      if (now !== undefined && now !== null) changes[name] = { to: now };
    } else if (kind === "remove") {
      if (was !== undefined && was !== null) changes[name] = { from: was };
    } else if (auditBookingTrailJson(was ?? null) !== auditBookingTrailJson(now ?? null)) {
      changes[name] = { from: was ?? null, to: now ?? null };
    }
  }
  return changes;
}

/** The row of the audit log a call leaves. Nothing when a change changed nothing, or a deletion found nothing to delete. */
export function auditBookingTrailEntry(kind: "create" | "update" | "remove", before: Row | null, after: Row | null, id: unknown, actor: string): Row | undefined {
  if (kind === "remove" && !before) return undefined;
  const changes = auditBookingTrailChanges(kind, before, after);
  if (kind === "update" && Object.keys(changes).length === 0) return undefined;
  const record = kind === "remove" ? before : after;
  return {
    "recordId": String(record?.["id"] ?? id),
    "action": kind === "remove" ? "delete" : kind,
    "actor": actor,
    "changes": auditBookingTrailJson(changes),
    "changedAt": Date.now() / 1000,
  };
}

const auditCalls: Record<string, "create" | "update" | "remove"> = {
  "createBooking": "create",
  "updateBooking": "update",
  "patchBooking": "update",
  "deleteBooking": "remove",
};

/** The updates that take no body: what they changed is what the record is afterwards, so it is read again. */
const auditRead = new Set<string>([]);

/** Wraps the calls of the Service that create, change or delete a record so each one is kept as a row of the audit log, with the id of whoever called it (empty for the system's own call). Apply after `withHooks`, inside `lockSlots`. */
export function keepAudit<T extends object>(target: T): T {
  const record = target as Record<string, unknown>;
  for (const [name, kind] of Object.entries(auditCalls)) {
    const original = record[name] as (...args: unknown[]) => Promise<unknown>;
    record[name] = async function (this: any, ...args: unknown[]) {
      const repository = (this as any).bookingRepository as BookingRepository;
      const before = kind === "create" ? null : ((await repository.findById(args[0] as any)) as Row | null);
      const result = (await original.apply(this, args)) as Row | null;
      const after = auditRead.has(name) ? ((await repository.findById(args[0] as any)) as Row | null) : result;
      const entry = auditBookingTrailEntry(kind, before, kind === "remove" ? null : after, args[0], callerId() ?? "");
      if (entry) await ((this as any).bookingAuditLogRepository as BookingAuditLogRepository).create(entry as any);
      return result;
    };
  }
  return target;
}

// Idempotency "Booking Once"
const idempotencyBookingOnceSeconds = 86400;
const idempotencyBookingOnceCalls = ["createBooking"];
const idempotencyBookingOnceBusy = new Map<string, Promise<unknown>>();

/** Orders the keys of every object, so the same body always gives the same text. */
function idempotencyBookingOnceCanonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(idempotencyBookingOnceCanonical);
  if (value instanceof Date) return value.toISOString();
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Row)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([name, item]) => [name, idempotencyBookingOnceCanonical(item)]),
    );
  }
  return value;
}

/** A hash of the body of a call. */
const idempotencyBookingOnceHash = (body: unknown): string =>
  createHash("sha256").update(JSON.stringify(idempotencyBookingOnceCanonical(body)) ?? "").digest("hex");

/** Wraps the calls of the Service that create a record: a repeat of the key a caller sent within the hours of the block gets the record the first call made. A call without the header is made as it is. Apply last, so a repeat runs none of the other blocks. */
export function keepIdempotency<T extends object>(target: T): T {
  const record = target as Record<string, unknown>;
  for (const name of idempotencyBookingOnceCalls) {
    const original = record[name] as (...args: unknown[]) => Promise<unknown>;
    record[name] = async function (this: any, ...args: unknown[]) {
      const header = idempotencyKey();
      if (!header) return original.apply(this, args);
      const scoped = `${callerId() ?? ""}:${header}`;
      const hash = idempotencyBookingOnceHash(args[0]);
      const earlier = idempotencyBookingOnceBusy.get(scoped) ?? Promise.resolve();
      const mine = earlier
        .catch(() => undefined)
        .then(() => inTransaction(async (transaction) => {
          // On PostgreSQL the key is also held against other processes, until the record and the key are saved together.
          if (transaction !== undefined && /^postgres(ql)?:/.test(process.env.DATABASE_URL ?? "")) {
            await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"idempotency:" + scoped}, 0))`;
          }
          const keys = (this as any).bookingIdempotencyKeyRepository as BookingIdempotencyKeyRepository;
          const seen = (await keys.findByField("requestKey", scoped)) as Row | null;
          if (seen) {
            if (Date.now() / 1000 - Number(seen["createdAt"]) < idempotencyBookingOnceSeconds) {
              const first = seen["requestHash"];
              if (typeof first === "string" && first !== "" && first !== hash) throw new HttpException("This Idempotency-Key was already used with a different request body", 422);
              const found = await ((this as any).bookingRepository as BookingRepository).findById(seen["recordId"] as any);
              if (found) return found;
            }
            await keys.remove(seen.id as any);
          }
          const result = (await original.apply(this, args)) as Row;
          await keys.create({
            "requestKey": scoped,
            "recordId": String(result["id"]),
            "createdAt": Date.now() / 1000,
            "requestHash": hash,
          } as any);
          // The keys past their hours are of no use: a page of them goes with each key that is saved.
          const expired = (await keys.findPage({
            offset: 0,
            limit: 100,
            filters: { "createdAt_to": String(Date.now() / 1000 - idempotencyBookingOnceSeconds) },
          })).items as Row[];
          for (const old of expired) await keys.remove(old.id as any);
          return result;
        }));
      idempotencyBookingOnceBusy.set(scoped, mine);
      try {
        return await mine;
      } finally {
        if (idempotencyBookingOnceBusy.get(scoped) === mine) idempotencyBookingOnceBusy.delete(scoped);
      }
    };
  }
  return target;
}

/** A time the owner may change in the environment: "90m", "24h", "2d", "45s" or a number of seconds. Empty or unreadable keeps the Block's own time. */
function durationEnv(name: string, fallback: number): number {
  const match = /^([0-9]+) *([smhd]?)$/i.exec((process.env[name] ?? "").trim());
  const unit = (match?.[2] ?? "s").toLowerCase();
  const seconds = match ? Number(match[1]) * (unit === "d" ? 86400 : unit === "h" ? 3600 : unit === "m" ? 60 : 1) : 0;
  return seconds > 0 ? seconds : fallback;
}

// Timers of Status Flow "Booking Steps"; each time can be changed in the environment
const flowBookingStepsTimers = (): readonly { from: string; to: string; seconds: number }[] => [
  { from: "new", to: "cancelled", seconds: durationEnv("FLOW_BOOKING_STEPS_NEW_TO_CANCELLED_AFTER", 86400) },
];

/** True when a record that moved into its status at `since` (seconds since the epoch) has stayed in it for `seconds`. A record the history knows nothing about never is. */
export function flowBookingStepsOverdue(since: number | undefined, now: number, seconds: number): boolean {
  return since !== undefined && now - since >= seconds;
}

/** Moves each record whose time in a status is up to the status of its timer; a change the flow or a condition refuses is left for the next look. */
async function flowBookingStepsSweep(this: any): Promise<void> {
  const repository = (this as any).bookingRepository as BookingRepository;
  const log = (this as any).bookingStatusLogRepository as BookingStatusLogRepository;
  const now = Date.now() / 1000;
  for (const timer of flowBookingStepsTimers()) {
    const since = new Map<string, number>();
    const entries = (await log.findPage({ search: timer.from, offset: 0 })).items as Row[];
    for (const entry of entries) {
      if (entry["toStatus"] !== timer.from) continue;
      const id = String(entry["recordId"]);
      since.set(id, Math.max(since.get(id) ?? 0, Number(entry["changedAt"])));
    }
    const records = (await repository.findPage({ search: timer.from, offset: 0 })).items as Row[];
    for (const record of records) {
      if (record["status"] !== timer.from) continue;
      if (!flowBookingStepsOverdue(since.get(String(record["id"])), now, timer.seconds)) continue;
      try {
        await this.patchBooking(record["id"], { ["status"]: timer.to });
      } catch (error) {
        if (!(error instanceof ConflictException)) console.error("Timer flowBookingSteps:", error);
      }
    }
  }
}

// Reaction "Booking Reminder Notice" before the time in startsAt
/** Gives the Reaction to each record whose startsAt is within 86400 seconds and that has not had it yet. */
async function reactionBookingReminderNoticeSweep(this: any): Promise<void> {
  const repository = (this as any).bookingRepository as BookingRepository;
  const filters = {
    "startsAt_from": new Date().toISOString(),
    "startsAt_to": new Date(Date.now() + durationEnv("REACTION_BOOKING_REMINDER_NOTICE_BEFORE", 86400) * 1000).toISOString(),
  };
  for (let offset = 0; ; offset += 100) {
    const page = (await repository.findPage({ offset, limit: 100, filters })).items as Row[];
    for (const record of page) {
      if (text(record["remindedAt"]) !== "" || !reactionBookingReminderNoticeFires(null, record)) continue;
      try {
        await this.patchBooking(record["id"], { ["remindedAt"]: new Date() });
      } catch (error) {
        console.error("Reaction Booking Reminder Notice could not mark a record:", error);
        continue;
      }
      reactionBookingReminderNoticeRun(undefined, record).catch((error) => console.error("Reaction Booking Reminder Notice failed", error));
    }
    if (page.length < 100) break;
  }
}

// Reaction "Telegram Reminder" before the time in startsAt
/** Gives the Reaction to each record whose startsAt is within 86400 seconds and that has not had it yet. */
async function reactionTelegramReminderSweep(this: any): Promise<void> {
  const repository = (this as any).bookingRepository as BookingRepository;
  const filters = {
    "startsAt_from": new Date().toISOString(),
    "startsAt_to": new Date(Date.now() + durationEnv("REACTION_TELEGRAM_REMINDER_BEFORE", 86400) * 1000).toISOString(),
  };
  for (let offset = 0; ; offset += 100) {
    const page = (await repository.findPage({ offset, limit: 100, filters })).items as Row[];
    for (const record of page) {
      if (text(record["tgRemindedAt"]) !== "" || !reactionTelegramReminderFires(null, record)) continue;
      try {
        await this.patchBooking(record["id"], { ["tgRemindedAt"]: new Date() });
      } catch (error) {
        console.error("Reaction Telegram Reminder could not mark a record:", error);
        continue;
      }
      reactionTelegramReminderRun((this as any).telegramBot, record).catch((error) => console.error("Reaction Telegram Reminder failed", error));
    }
    if (page.length < 100) break;
  }
}

export async function sweepTimers(this: any): Promise<void> {
  await flowBookingStepsSweep.call(this);
  await reactionBookingReminderNoticeSweep.call(this);
  await reactionTelegramReminderSweep.call(this);
}

/** Looks every 60 seconds, one look at a time, for records whose time in a status is up, that have grown old or whose time a Reaction waits for is near. */
function lookEvery(service: any): ReturnType<typeof setInterval> {
  let looking = false;
  const timer = setInterval(() => {
    if (looking) return;
    looking = true;
    sweepTimers
      .call(service)
      .catch((error: unknown) => console.error("Timers:", error))
      .finally(() => {
        looking = false;
      });
  }, 60000);
  timer.unref();
  return timer;
}

/** Starts the look when the module starts and stops it when the module stops. Apply to the Service's prototype. */
export function runTimers<T extends object>(target: T): T {
  const record = target as Record<string, any>;
  record.onModuleInit = function (this: any) {
    this.timerLook = lookEvery(this);
  };
  record.onModuleDestroy = function (this: any) {
    clearInterval(this.timerLook);
  };
  return target;
}

export const logicHooks: Hooks<BookingService> = {
  before: {
    async createBooking(this: any, dto: any) {
      const repository = (this as any).bookingRepository as BookingRepository;
      await slotMasterFreeCheck(repository, dto);
      await limitPerPhonePerDayCheck(repository, dto);
    },
    async updateBooking(this: any, id: any, dto: any) {
      const repository = (this as any).bookingRepository as BookingRepository;
      const current = await repository.findById(id);
      if (!current) return;
      flowBookingStepsCheck(current, dto);
      await slotMasterFreeCheck(repository, merged(current, dto), id, dto);
      await limitPerPhonePerDayCheck(repository, merged(current, dto), id, dto);
    },
    async patchBooking(this: any, id: any, dto: any) {
      const repository = (this as any).bookingRepository as BookingRepository;
      const current = await repository.findById(id);
      if (!current) return;
      flowBookingStepsCheck(current, dto);
      await slotMasterFreeCheck(repository, merged(current, dto), id, dto);
      await limitPerPhonePerDayCheck(repository, merged(current, dto), id, dto);
    },
  },
  after: {
    async getBookingTransitions(this: any, result: any, id: any) {
      const repository = (this as any).bookingRepository as BookingRepository;
      result = { "status": result["status"], transitions: flowBookingStepsTransitions(result) };
      return result;
    },
    async getBookingBusy(this: any, result: any): Promise<any> {
      const busy = (await Promise.all([slotMasterFreeBusy(result.items)])).flat();
      return busy.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    },
    async getBookingFree(this: any, result: any, query: any): Promise<any> {
      const lists: FreeTime[][] = await Promise.all([slotMasterFreeFreeTimes(result.items, query?.filters ?? {})]);
      const others = lists.slice(1).map((list) => new Set(list.map((time) => time.start)));
      const times = (lists[0] ?? []).filter((time) => others.every((starts) => starts.has(time.start)));
      return { items: times, total: times.length };
    },
  },
};
