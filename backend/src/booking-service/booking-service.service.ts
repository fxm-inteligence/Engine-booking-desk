import { ListQuery } from "../list-query";
import { withHooks } from "../with-hooks";
import { BookingAuditLogRepository } from "./booking-audit-log-repository.repository";
import { BookingIdempotencyKeyRepository } from "./booking-idempotency-key-repository.repository";
import { BookingRepository } from "./booking-repository.repository";
import { hooks } from "./booking-service.hooks";
import { keepAudit, keepHistory, keepIdempotency, keepReactions, lockSlots, logicHooks, runTimers } from "./booking-service.logic";
import { BookingStatusLogRepository } from "./booking-status-log-repository.repository";
import { CreateBookingRequestDto } from "./dto/create-booking-request.dto";
import { PatchBookingRequestDto } from "./dto/patch-booking-request.dto";
import { UpdateBookingRequestDto } from "./dto/update-booking-request.dto";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class BookingService {
  constructor(private readonly bookingRepository: BookingRepository, private readonly bookingStatusLogRepository: BookingStatusLogRepository, private readonly bookingAuditLogRepository: BookingAuditLogRepository, private readonly bookingIdempotencyKeyRepository: BookingIdempotencyKeyRepository) {}

  listBookings(query: ListQuery) {
    return this.bookingRepository.findPage(query);
  }

  getBookingBusy() {
    return this.bookingRepository.findPage({ offset: 0 });
  }

  async getBooking(id: string) {
    const record = await this.bookingRepository.findById(id);
    if (!record) throw new NotFoundException();
    return record;
  }

  createBooking(dto: CreateBookingRequestDto) {
    return this.bookingRepository.create({ ...dto, startsAt: new Date(dto.startsAt), createdAt: dto.createdAt === undefined ? undefined : new Date(dto.createdAt), remindedAt: dto.remindedAt === undefined ? undefined : new Date(dto.remindedAt) });
  }

  async updateBooking(id: string, dto: UpdateBookingRequestDto) {
    const record = await this.bookingRepository.findById(id);
    if (!record) throw new NotFoundException();
    return this.bookingRepository.update(id, { ...dto, startsAt: dto.startsAt === undefined ? undefined : new Date(dto.startsAt), createdAt: dto.createdAt === undefined ? undefined : new Date(dto.createdAt), remindedAt: dto.remindedAt === undefined ? undefined : new Date(dto.remindedAt) });
  }

  async patchBooking(id: string, dto: PatchBookingRequestDto) {
    const record = await this.bookingRepository.findById(id);
    if (!record) throw new NotFoundException();
    return this.bookingRepository.update(id, { ...dto, startsAt: dto.startsAt === undefined ? undefined : new Date(dto.startsAt), createdAt: dto.createdAt === undefined ? undefined : new Date(dto.createdAt), remindedAt: dto.remindedAt === undefined ? undefined : new Date(dto.remindedAt) });
  }

  async deleteBooking(id: string) {
    const record = await this.bookingRepository.findById(id);
    if (!record) throw new NotFoundException();
    return this.bookingRepository.remove(id);
  }

  async getBookingTransitions(id: string) {
    const record = await this.bookingRepository.findById(id);
    if (!record) throw new NotFoundException();
    return record;
  }
}

withHooks(BookingService.prototype, hooks);
withHooks(BookingService.prototype, logicHooks);
keepHistory(BookingService.prototype);
keepAudit(BookingService.prototype);
keepReactions(BookingService.prototype);
lockSlots(BookingService.prototype);
runTimers(BookingService.prototype);
keepIdempotency(BookingService.prototype);
