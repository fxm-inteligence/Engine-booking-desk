import { BookingAuditLogRepository } from "./booking-audit-log-repository.repository";
import { BookingAuditLogServiceController } from "./booking-audit-log-service.controller";
import { BookingAuditLogService } from "./booking-audit-log-service.service";
import { Module } from "@nestjs/common";

@Module({
  controllers: [BookingAuditLogServiceController],
  providers: [BookingAuditLogService, BookingAuditLogRepository],
})
export class BookingAuditLogServiceModule {}
