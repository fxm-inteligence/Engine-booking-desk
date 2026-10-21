// Yours: a Regenerate never overwrites this file. Each hook runs around the Service method of the same name.
import { ConflictException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import type { Hooks } from "../with-hooks";
import type { BookingService } from "./booking-service.service";
import { canChangeStatus, DEFAULT_DURATION_MINUTES, findConflict, type ExistingBooking } from "./booking-rules";

let prisma: PrismaClient | undefined;

/** Length of a service in minutes. Without a database or for an unknown id the default is used. */
async function durationOf(serviceId: string): Promise<number> {
  if (!process.env.DATABASE_URL) return DEFAULT_DURATION_MINUTES;
  try {
    prisma ??= new PrismaClient();
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    return service?.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  } catch {
    return DEFAULT_DURATION_MINUTES;
  }
}

/** Throws 409 when the master is busy at that time. */
async function ensureSlotFree(service: any, masterId: string, startsAt: Date, serviceId: string, ignoreId?: string) {
  const page = await service.bookingRepository.findPage({ search: masterId, offset: 0 });
  const sameMaster = (page.items as any[]).filter((row) => row.masterId === masterId);
  const existing: ExistingBooking[] = await Promise.all(
    sameMaster.map(async (row) => ({ ...row, durationMinutes: await durationOf(row.serviceId) })),
  );
  const slot = { masterId, startsAt, durationMinutes: await durationOf(serviceId) };
  if (findConflict(slot, existing, ignoreId)) throw new ConflictException("Мастер занят в это время");
}

export const hooks: Hooks<BookingService> = {
  before: {
    // listBookings(...) { /* throw to refuse the call */ },
    // getBooking(...) { /* throw to refuse the call */ },
    async createBooking(this: any, dto) {
      await ensureSlotFree(this, dto.masterId, new Date(dto.startsAt), dto.serviceId);
    },
    async updateBooking(this: any, id, dto) {
      const current = await this.bookingRepository.findById(id);
      if (!current) return;
      if (dto.status !== undefined && !canChangeStatus(current.status, dto.status)) {
        throw new ConflictException(`Нельзя перевести запись из «${current.status}» в «${dto.status}»`);
      }
      const moved = dto.startsAt !== undefined || dto.masterId !== undefined || dto.serviceId !== undefined;
      if (!moved || (dto.status ?? current.status) === "cancelled") return;
      await ensureSlotFree(
        this,
        dto.masterId ?? current.masterId,
        dto.startsAt === undefined ? current.startsAt : new Date(dto.startsAt),
        dto.serviceId ?? current.serviceId,
        id,
      );
    },
    // deleteBooking(...) { /* throw to refuse the call */ },
  },
  after: {
    // listBookings(result, ...) { return result; },
    // getBooking(result, ...) { return result; },
    // createBooking(result, ...) { return result; },
    // updateBooking(result, ...) { return result; },
    // deleteBooking(result, ...) { return result; },
  },
};
