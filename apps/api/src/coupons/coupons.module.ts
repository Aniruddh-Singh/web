import { Body, ConflictException, Controller, Get, Inject, Injectable, Module, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { couponInput, couponPatch, type AdminCoupon, type CouponInput, type CouponPatch } from "@coffeecat/shared";
import { count, desc, eq } from "drizzle-orm";
import { AuditService } from "../audit/audit.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { CurrentUser, RequirePermission } from "../auth/decorators.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { DB } from "../db/db.module.js";
import type { Database } from "../db/client.js";
import { couponRedemptions, coupons } from "../db/schema.js";

const toDate = (s?: string | null) => (s ? new Date(s) : s === null ? null : undefined);

@Injectable()
export class CouponsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<AdminCoupon[]> {
    const rows = await this.db
      .select({ c: coupons, used: count(couponRedemptions.id) })
      .from(coupons)
      .leftJoin(couponRedemptions, eq(couponRedemptions.couponId, coupons.id))
      .groupBy(coupons.id)
      .orderBy(desc(coupons.createdAt));
    return rows.map(({ c, used }) => ({
      id: c.id,
      code: c.code,
      description: c.description,
      kind: c.kind,
      value: c.value,
      minOrderPaise: c.minOrderPaise,
      maxDiscountPaise: c.maxDiscountPaise,
      startsAt: c.startsAt?.toISOString() ?? null,
      endsAt: c.endsAt?.toISOString() ?? null,
      usageLimit: c.usageLimit,
      perUserLimit: c.perUserLimit,
      active: c.active,
      used,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async create(input: CouponInput, actor: AuthUser) {
    const [exists] = await this.db.select({ id: coupons.id }).from(coupons).where(eq(coupons.code, input.code));
    if (exists) throw new ConflictException(`${input.code} already exists.`);
    const [row] = await this.db
      .insert(coupons)
      .values({ ...input, maxDiscountPaise: input.maxDiscountPaise ?? null, usageLimit: input.usageLimit ?? null, perUserLimit: input.perUserLimit ?? null, startsAt: toDate(input.startsAt) ?? null, endsAt: toDate(input.endsAt) ?? null })
      .returning();
    await this.audit.log(actor, "create", "coupon", row.code, null, row);
    return { id: row.id, code: row.code };
  }

  async update(code: string, patch: CouponPatch, actor: AuthUser) {
    const [before] = await this.db.select().from(coupons).where(eq(coupons.code, code.toUpperCase()));
    if (!before) throw new NotFoundException("That coupon doesn't exist.");
    const set = { ...patch, endsAt: toDate(patch.endsAt) };
    if (set.endsAt === undefined) delete set.endsAt;
    const [after] = await this.db.update(coupons).set(set).where(eq(coupons.id, before.id)).returning();
    await this.audit.log(actor, patch.active === false ? "deactivate" : "update", "coupon", before.code, before, after);
    return { code: after.code };
  }
}

@ApiTags("admin: coupons")
@ApiBearerAuth()
@Controller("admin/coupons")
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @RequirePermission("coupons:manage")
  @Get()
  list() {
    return this.coupons.list();
  }

  @RequirePermission("coupons:manage")
  @Post()
  create(@Body(new ZodPipe(couponInput)) input: CouponInput, @CurrentUser() user: AuthUser) {
    return this.coupons.create(input, user);
  }

  @RequirePermission("coupons:manage")
  @Patch(":code")
  update(@Param("code") code: string, @Body(new ZodPipe(couponPatch)) patch: CouponPatch, @CurrentUser() user: AuthUser) {
    return this.coupons.update(code, patch, user);
  }
}

@Module({ controllers: [CouponsController], providers: [CouponsService] })
export class CouponsModule {}
