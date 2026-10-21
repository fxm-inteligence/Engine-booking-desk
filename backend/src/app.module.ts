import { BookingServiceModule } from "./booking-service/booking-service.module";
import { ClientServiceModule } from "./client-service/client-service.module";
import { MasterServiceModule } from "./master-service/master-service.module";
import { ServiceServiceModule } from "./service-service/service-service.module";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: Number(process.env.RATE_LIMIT_MAX ?? 100) }]), ServiceServiceModule, MasterServiceModule, ClientServiceModule, BookingServiceModule],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
