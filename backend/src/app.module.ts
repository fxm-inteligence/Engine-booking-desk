import { AuthServiceModule } from "./auth-service/auth-service.module";
import { BookingAuditLogServiceModule } from "./booking-audit-log-service/booking-audit-log-service.module";
import { BookingIdempotencyKeyServiceModule } from "./booking-idempotency-key-service/booking-idempotency-key-service.module";
import { BookingServiceModule } from "./booking-service/booking-service.module";
import { BookingStatusLogServiceModule } from "./booking-status-log-service/booking-status-log-service.module";
import { ClientServiceModule } from "./client-service/client-service.module";
import { MasterServiceModule } from "./master-service/master-service.module";
import { NoticeServiceModule } from "./notice-service/notice-service.module";
import { ServiceServiceModule } from "./service-service/service-service.module";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: Number(process.env.RATE_LIMIT_MAX ?? 100) }]), AuthServiceModule, ServiceServiceModule, MasterServiceModule, ClientServiceModule, BookingServiceModule, NoticeServiceModule, BookingStatusLogServiceModule, BookingAuditLogServiceModule, BookingIdempotencyKeyServiceModule],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
