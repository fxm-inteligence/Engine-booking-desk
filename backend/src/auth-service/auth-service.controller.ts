import { sessionCookie } from "../auth-crypto";
import { AuthService } from "./auth-service.service";
import { AuthLoginRequestDto } from "./dto/auth-login-request.dto";
import { AuthLogoutRequestDto } from "./dto/auth-logout-request.dto";
import { AuthRefreshRequestDto } from "./dto/auth-refresh-request.dto";
import { AuthRegisterRequestDto } from "./dto/auth-register-request.dto";
import { Body, Controller, Post, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";

@ApiTags("AuthService")
@Controller()
export class AuthServiceController {
  constructor(private readonly authService: AuthService) {}

  @Post("/auth/register")
  async authRegister(@Body() dto: AuthRegisterRequestDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.authService.authRegister(dto);
    response.setHeader("Set-Cookie", sessionCookie(session.token));
    return session;
  }

  @Post("/auth/login")
  async authLogin(@Body() dto: AuthLoginRequestDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.authService.authLogin(dto);
    response.setHeader("Set-Cookie", sessionCookie(session.token));
    return session;
  }

  @Post("/auth/refresh")
  authRefresh(@Body() dto: AuthRefreshRequestDto) {
    return this.authService.authRefresh(dto);
  }

  @Post("/auth/logout")
  authLogout(@Body() dto: AuthLogoutRequestDto) {
    return this.authService.authLogout(dto);
  }
}
