import { MasterRepository } from "./master-repository.repository";
import { MasterServiceController } from "./master-service.controller";
import { MasterService } from "./master-service.service";
import { Module } from "@nestjs/common";

@Module({
  controllers: [MasterServiceController],
  providers: [MasterService, MasterRepository],
})
export class MasterServiceModule {}
