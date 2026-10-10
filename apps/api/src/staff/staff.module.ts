import { BadRequestException, Body, ConflictException, Controller, Get, Inject, Injectable, Module, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { staffInvite, staffPatch, type StaffInvite, type StaffMember, type StaffPatch } from "@coffeecat/shared";
import { and, asc, eq, ne } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { AuditService } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { CurrentUser, RequirePermission } from "../auth/decorators.js";
import { IdentityService } from "../auth/identity.service.js";
import { SupabaseAdmin } from "../common/supabase-admin.service.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { DB } from "../db/db.module.js";
import type { Database } from "../db/client.js";
import { profiles, staff } from "../db/schema.js";

/** A readable one-time password, shown to the owner once to pass on. */
const tempPassword = () => `Cat-${randomBytes(9).toString("base64url")}`;

@Injectable()
export class StaffService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly supabase: SupabaseAdmin,
    private readonly identity: IdentityService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<StaffMember[]> {
    const rows = await this.db
      .select({ userId: staff.userId, email: profiles.email, name: profiles.name, role: staff.role, active: staff.active, createdAt: staff.createdAt })
      .from(staff)
      .innerJoin(profiles, eq(profiles.id, staff.userId))
      .orderBy(asc(staff.createdAt));
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  }

  /**
   * Creates the staff login with a temporary password (shown once) rather than emailing an invite,
   * so it works without an email provider. They should change it after first login.
   */
  async invite(input: StaffInvite, actor: AuthUser) {
    const password = tempPassword();
    const admin = this.supabase.get().auth.admin;
    const created = await admin.createUser({ email: input.email, password, email_confirm: true, user_metadata: { name: input.name } });
    if (!created.data.user) {
      throw new ConflictException(/already/i.test(created.error?.message ?? "") ? `${input.email} already has an account. Ask them to log in, then change their role here.` : (created.error?.message ?? "Couldn't create the login."));
    }
    const userId = created.data.user.id;
    await this.db.insert(profiles).values({ id: userId, email: input.email, name: input.name }).onConflictDoUpdate({ target: profiles.id, set: { email: input.email, name: input.name } });
    await this.db.insert(staff).values({ userId, role: input.role, invitedBy: actor.id }).onConflictDoUpdate({ target: staff.userId, set: { role: input.role, active: true } });
    await this.audit.log(actor, "invite", "staff", input.email, null, { email: input.email, role: input.role });
    return { userId, email: input.email, temporaryPassword: password };
  }

  async update(userId: string, patch: StaffPatch, actor: AuthUser) {
    const [before] = await this.db.select().from(staff).where(eq(staff.userId, userId));
    if (!before) throw new NotFoundException("That person isn't on the staff list.");
    if (userId === actor.id && (patch.active === false || (patch.role && patch.role !== "owner"))) {
      throw new BadRequestException("You can't remove or demote yourself. Ask another owner.");
    }
    if (before.role === "owner" && (patch.active === false || (patch.role && patch.role !== "owner"))) {
      const others = await this.db.select({ id: staff.userId }).from(staff).where(and(eq(staff.role, "owner"), eq(staff.active, true), ne(staff.userId, userId)));
      if (others.length === 0) throw new BadRequestException("There must always be at least one active owner.");
    }
    const [after] = await this.db.update(staff).set(patch).where(eq(staff.userId, userId)).returning();
    this.identity.forgetRole(userId);
    await this.audit.log(actor, patch.active === false ? "deactivate" : "update", "staff", userId, before, after);
    return { userId };
  }
}

@ApiTags("admin: staff")
@ApiBearerAuth()
@Controller("admin/staff")
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @RequirePermission("staff:manage")
  @Get()
  list() {
    return this.staff.list();
  }

  @RequirePermission("staff:manage")
  @Post()
  invite(@Body(new ZodPipe(staffInvite)) input: StaffInvite, @CurrentUser() user: AuthUser) {
    return this.staff.invite(input, user);
  }

  @RequirePermission("staff:manage")
  @Patch(":userId")
  update(@Param("userId") userId: string, @Body(new ZodPipe(staffPatch)) patch: StaffPatch, @CurrentUser() user: AuthUser) {
    return this.staff.update(userId, patch, user);
  }
}

@Module({ controllers: [StaffController], providers: [StaffService, SupabaseAdmin] })
export class StaffModule {}
