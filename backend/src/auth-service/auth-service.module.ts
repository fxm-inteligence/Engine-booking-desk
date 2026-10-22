import { AuthServiceController } from "./auth-service.controller";
import { AuthService } from "./auth-service.service";
import { AuthTokenRepository } from "./auth-token-repository.repository";
import { AuthUserRepository } from "./auth-user-repository.repository";
import { Module } from "@nestjs/common";

@Module({
  controllers: [AuthServiceController],
  providers: [AuthService, AuthUserRepository, AuthTokenRepository],
})
export class AuthServiceModule {}
