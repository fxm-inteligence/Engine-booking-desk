import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { authenticate } from "../auth-crypto";

@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const auth = authenticate(request.headers, request.method);
    if (!auth.payload) {
      throw auth.status === 401 ? new UnauthorizedException() : new ForbiddenException();
    }
    const payload = auth.payload;
    if (!(payload.role === "admin")) {
      throw new ForbiddenException();
    }
    request.auth = payload;
    return true;
  }
}
