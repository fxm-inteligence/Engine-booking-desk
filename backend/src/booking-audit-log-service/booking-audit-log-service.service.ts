import { ListQuery } from "../list-query";
import { withHooks } from "../with-hooks";
import { BookingAuditLogRepository } from "./booking-audit-log-repository.repository";
import { hooks } from "./booking-audit-log-service.hooks";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class BookingAuditLogService {
  constructor(private readonly bookingAuditLogRepository: BookingAuditLogRepository) {}

  listBookingAuditLogs(query: ListQuery) {
    return this.bookingAuditLogRepository.findPage(query);
  }

  async getBookingAuditLog(id: string) {
    const record = await this.bookingAuditLogRepository.findById(id);
    if (!record) throw new NotFoundException();
    return record;
  }
}

withHooks(BookingAuditLogService.prototype, hooks);
