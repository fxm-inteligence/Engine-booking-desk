// Yours: business rules for bookings. Generated code never touches this file.
// Pure functions, so they are tested without a database (booking-rules.test.ts).

export const DEFAULT_DURATION_MINUTES = 60;

/** Which status may follow which. `done` and `cancelled` are final. */
const NEXT: Record<string, readonly string[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["done", "cancelled"],
  done: [],
  cancelled: [],
};

export interface Slot {
  masterId: string;
  startsAt: Date;
  durationMinutes: number;
}

export interface ExistingBooking {
  id: string;
  masterId: string;
  startsAt: Date;
  status?: string | null;
  durationMinutes: number;
}

/** The first booking of the same master that overlaps `slot`; cancelled bookings and `ignoreId` do not count. */
export function findConflict(slot: Slot, existing: ExistingBooking[], ignoreId?: string): ExistingBooking | undefined {
  const start = slot.startsAt.getTime();
  const end = start + slot.durationMinutes * 60_000;
  return existing.find((other) => {
    if (other.id === ignoreId || other.masterId !== slot.masterId || other.status === "cancelled") return false;
    const otherStart = other.startsAt.getTime();
    const otherEnd = otherStart + other.durationMinutes * 60_000;
    return start < otherEnd && otherStart < end;
  });
}

/** True when the status change is allowed. A status outside the known list is not checked. */
export function canChangeStatus(from: string | null | undefined, to: string): boolean {
  if (!from || from === to || !(from in NEXT) || !(to in NEXT)) return true;
  return NEXT[from].includes(to);
}
