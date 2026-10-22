import { NO_RECORD_PASSWORD_HASH, REFRESH_LIFETIME_SECONDS, accessClaims, hashPassword, issueToken, passwordFingerprint, signToken, takeToken, verifyPassword } from "../auth-crypto";
import { withHooks } from "../with-hooks";
import { hooks } from "./auth-service.hooks";
import { AuthTokenRepository } from "./auth-token-repository.repository";
import { AuthUserRepository } from "./auth-user-repository.repository";
import { AuthLoginRequestDto } from "./dto/auth-login-request.dto";
import { AuthLogoutRequestDto } from "./dto/auth-logout-request.dto";
import { AuthRefreshRequestDto } from "./dto/auth-refresh-request.dto";
import { AuthRegisterRequestDto } from "./dto/auth-register-request.dto";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class AuthService {
  constructor(private readonly authUserRepository: AuthUserRepository, private readonly authTokenRepository: AuthTokenRepository) {}

  async authRegister(dto: AuthRegisterRequestDto) {
    if (await this.authUserRepository.findByField("email", dto.email)) {
      throw new ConflictException("Already registered");
    }
    const { role: _role, ...signUp } = dto as typeof dto & { role?: unknown };
    const record = await this.authUserRepository.create({
      ...signUp,
      password: await hashPassword(dto.password),
    } as Parameters<typeof this.authUserRepository.create>[0]);
    const { password: _hash, ...user } = record;
    return {
      token: signToken({ sub: String(record.id), ...accessClaims(record) }),
      refreshToken: await issueToken(this.authTokenRepository, String(record.id), `refresh:${passwordFingerprint(String(record.password))}`, REFRESH_LIFETIME_SECONDS),
      user,
    };
  }

  async authLogin(dto: AuthLoginRequestDto) {
    const record = await this.authUserRepository.findByField("email", dto.email);
    const passwordMatches = await verifyPassword(
      dto.password,
      record ? String(record.password) : NO_RECORD_PASSWORD_HASH,
    );
    if (!record || !passwordMatches) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const { password: _hash, ...user } = record;
    return {
      token: signToken({ sub: String(record.id), ...accessClaims(record) }),
      refreshToken: await issueToken(this.authTokenRepository, String(record.id), `refresh:${passwordFingerprint(String(record.password))}`, REFRESH_LIFETIME_SECONDS),
      user,
    };
  }

  async authRefresh(dto: AuthRefreshRequestDto) {
    const row = await takeToken(this.authTokenRepository, dto.refreshToken, "refresh");
    if (!row) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const record = await this.authUserRepository.findById(row.userId);
    if (!record || row.kind !== `refresh:${passwordFingerprint(String(record.password))}`) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const { password: _hash, ...user } = record;
    return {
      token: signToken({ sub: String(record.id), ...accessClaims(record) }),
      refreshToken: await issueToken(this.authTokenRepository, String(record.id), `refresh:${passwordFingerprint(String(record.password))}`, REFRESH_LIFETIME_SECONDS),
      user,
    };
  }

  async authLogout(dto: AuthLogoutRequestDto) {
    await takeToken(this.authTokenRepository, dto.refreshToken, "refresh");
    return { loggedOut: true };
  }
}

withHooks(AuthService.prototype, hooks);
