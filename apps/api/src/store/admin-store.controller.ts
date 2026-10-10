import { Body, Controller, ForbiddenException, Inject, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { can, storePatch, type StorePatch } from "@coffeecat/shared";
import { eq } from "drizzle-orm";
import { AuditService } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { CurrentUser, RequirePermission } from "../auth/decorators.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { DB } from "../db/db.module.js";
import type { Database } from "../db/client.js";
import { storeSettings } from "../db/schema.js";
import { RevalidateService } from "../revalidate/revalidate.service.js";
import { StoreService } from "./store.service.js";

@ApiTags("admin: store")
@ApiBearerAuth()
@Controller("admin/store")
export class AdminStoreController {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly store: StoreService,
    private readonly audit: AuditService,
    private readonly revalidate: RevalidateService,
  ) {}

  /** Hours, fees and GST need store:edit; pausing orders only needs store:pause (kitchen can). */
  @RequirePermission("store:pause")
  @Patch()
  async update(@Body(new ZodPipe(storePatch)) patch: StorePatch, @CurrentUser() user: AuthUser) {
    const onlyPause = Object.keys(patch).every((k) => k === "acceptingOrders");
    if (!onlyPause && !can(user.role!, "store:edit")) throw new ForbiddenException("Your role can only pause or resume orders.");
    const before = await this.store.getSettings();
    await this.db.update(storeSettings).set(patch).where(eq(storeSettings.id, 1));
    const after = await this.store.getPublic();
    await this.audit.log(user, onlyPause ? (patch.acceptingOrders ? "resume-orders" : "pause-orders") : "update", "store", "settings", before, after);
    this.revalidate.trigger(["store"]);
    return after;
  }
}
