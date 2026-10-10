import { createParamDecorator, SetMetadata, type ExecutionContext } from "@nestjs/common";
import type { Permission } from "@coffeecat/shared";
import type { AuthedRequest, AuthUser } from "./auth.types.js";

export const IS_PUBLIC = "auth:public";
export const PERMISSION = "auth:permission";

/** No login needed. If a valid token is sent anyway, the user is still attached. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Staff-only route that needs this permission (see `can` in @coffeecat/shared). */
export const RequirePermission = (permission: Permission) => SetMetadata(PERMISSION, permission);

/** The logged-in user, or undefined on public routes without a token. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser | undefined => {
  return ctx.switchToHttp().getRequest<AuthedRequest>().user;
});
