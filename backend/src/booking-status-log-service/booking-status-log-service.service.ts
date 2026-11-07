import { ListQuery } from "../list-query";
import { withHooks } from "../with-hooks";
import { BookingStatusLogRepository } from "./booking-status-log-repository.repository";
import { hooks } from "./booking-status-log-service.hooks";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class BookingStatusLogService {
  constructor(private readonly bookingStatusLogRepository: BookingStatusLogRepository) {}

  listBookingStatusLogs(query: ListQuery) {
    return this.bookingStatusLogRepository.findPage(query);
  }

  async getBookingStatusLog(id: string) {
    const record = await this.bookingStatusLogRepository.findById(id);
    if (!record) throw new NotFoundException();
    return record;
  }
}

withHooks(BookingStatusLogService.prototype, hooks);
