import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "./auth.types.js";
import { CurrentUser } from "./decorators.js";

@ApiTags("auth")
@ApiBearerAuth()
@Controller("me")
export class AuthController {
  /** Who am I, and am I staff? Used by the admin app to decide what to show. */
  @Get()
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
