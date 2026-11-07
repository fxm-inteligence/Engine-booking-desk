import { ListQuery } from "../list-query";
import { withHooks } from "../with-hooks";
import { BookingIdempotencyKeyRepository } from "./booking-idempotency-key-repository.repository";
import { hooks } from "./booking-idempotency-key-service.hooks";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class BookingIdempotencyKeyService {
  constructor(private readonly bookingIdempotencyKeyRepository: BookingIdempotencyKeyRepository) {}

  listBookingIdempotencyKeys(query: ListQuery) {
    return this.bookingIdempotencyKeyRepository.findPage(query);
  }

  async getBookingIdempotencyKey(id: string) {
    const record = await this.bookingIdempotencyKeyRepository.findById(id);
    if (!record) throw new NotFoundException();
    return record;
  }
}

withHooks(BookingIdempotencyKeyService.prototype, hooks);
