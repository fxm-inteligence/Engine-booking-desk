import { NoticeRepository } from "./notice-repository.repository";
import { NoticeServiceController } from "./notice-service.controller";
import { NoticeService } from "./notice-service.service";
import { Module } from "@nestjs/common";

@Module({
  controllers: [NoticeServiceController],
  providers: [NoticeService, NoticeRepository],
})
export class NoticeServiceModule {}
