import { ServiceRepository } from "./service-repository.repository";
import { ServiceServiceController } from "./service-service.controller";
import { ServiceService } from "./service-service.service";
import { Module } from "@nestjs/common";

@Module({
  controllers: [ServiceServiceController],
  providers: [ServiceService, ServiceRepository],
})
export class ServiceServiceModule {}
