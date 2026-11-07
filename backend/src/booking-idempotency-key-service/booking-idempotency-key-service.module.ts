import { BookingIdempotencyKeyRepository } from "./booking-idempotency-key-repository.repository";
import { BookingIdempotencyKeyServiceController } from "./booking-idempotency-key-service.controller";
import { BookingIdempotencyKeyService } from "./booking-idempotency-key-service.service";
import { Module } from "@nestjs/common";

@Module({
  controllers: [BookingIdempotencyKeyServiceController],
  providers: [BookingIdempotencyKeyService, BookingIdempotencyKeyRepository],
})
export class BookingIdempotencyKeyServiceModule {}
