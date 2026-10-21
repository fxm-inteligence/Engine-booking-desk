import { BookingRepository } from "./booking-repository.repository";
import { BookingServiceController } from "./booking-service.controller";
import { BookingService } from "./booking-service.service";
import { Module } from "@nestjs/common";

@Module({
  controllers: [BookingServiceController],
  providers: [BookingService, BookingRepository],
})
export class BookingServiceModule {}
