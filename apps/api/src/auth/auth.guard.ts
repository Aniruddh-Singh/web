import { ForbiddenException, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { can, type Permission } from "@coffeecat/shared";
import type { AuthedRequest } from "./auth.types.js";
import { IS_PUBLIC, PERMISSION } from "./decorators.js";
import { IdentityService } from "./identity.service.js";
import { TokenVerifier } from "./token-verifier.service.js";

/**
 * Global guard. Every route needs a valid Supabase token unless marked @Public().
 * Routes with @RequirePermission() also need an active staff role that grants it.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: TokenVerifier,
    private readonly identity: IdentityService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets) ?? false;
    const permission = this.reflector.getAllAndOverride<Permission | undefined>(PERMISSION, targets);
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();

    const header = req.headers.authorization;
    const token = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException("Log in to continue.");
    }

    let claims;
    try {
      claims = await this.verifier.verify(token);
    } catch (e) {
      // A stale token on a public route (e.g. guest checkout in a tab left open) shouldn't block it.
      if (isPublic) return true;
      throw e;
    }

    const email = claims.email || null;
    const phone = claims.phone || null;
    await this.identity.ensureProfile(claims.sub, email, phone);
    const role = await this.identity.roleOf(claims.sub);
    req.user = { id: claims.sub, email, phone, role };

    if (permission && !(role && can(role, permission))) {
      throw new ForbiddenException("Your role doesn't allow this.");
    }
    return true;
  }
}
