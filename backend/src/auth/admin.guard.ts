import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { AuthService } from "./auth.service";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<{ user?: User }>().user;
    if (!user || !this.auth.isAdmin(user)) {
      throw new ForbiddenException("Solo el administrador puede ver las métricas");
    }
    return true;
  }
}
