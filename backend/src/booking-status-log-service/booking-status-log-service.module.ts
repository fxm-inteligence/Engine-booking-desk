import { BookingStatusLogRepository } from "./booking-status-log-repository.repository";
import { BookingStatusLogServiceController } from "./booking-status-log-service.controller";
import { BookingStatusLogService } from "./booking-status-log-service.service";
import { Module } from "@nestjs/common";

@Module({
  controllers: [BookingStatusLogServiceController],
  providers: [BookingStatusLogService, BookingStatusLogRepository],
})
export class BookingStatusLogServiceModule {}
