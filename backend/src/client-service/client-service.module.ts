import { ClientRepository } from "./client-repository.repository";
import { ClientServiceController } from "./client-service.controller";
import { ClientService } from "./client-service.service";
import { Module } from "@nestjs/common";

@Module({
  controllers: [ClientServiceController],
  providers: [ClientService, ClientRepository],
})
export class ClientServiceModule {}
