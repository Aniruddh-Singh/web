import { Body, Controller, Delete, Get, HttpCode, Inject, Injectable, Module, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { addressInput, addressPatch, profilePatch, type Address, type AddressInput, type AddressPatch, type Profile, type ProfilePatch } from "@coffeecat/shared";
import { and, asc, count, desc, eq } from "drizzle-orm";
import type { AuthUser } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/decorators.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { DB } from "../db/db.module.js";
import type { Database } from "../db/client.js";
import { addresses, profiles } from "../db/schema.js";

const MAX_ADDRESSES = 10;

@Injectable()
export class CustomersService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async profile(user: AuthUser): Promise<Profile> {
    const [p] = await this.db.select().from(profiles).where(eq(profiles.id, user.id));
    // Phone logins carry "91XXXXXXXXXX"; show the 10-digit number.
    const phone = p?.phone ? p.phone.replace(/\D/g, "").slice(-10) : null;
    return { id: user.id, name: p?.name ?? null, phone, email: p?.email ?? null };
  }

  async updateProfile(user: AuthUser, patch: ProfilePatch) {
    await this.db.update(profiles).set(patch).where(eq(profiles.id, user.id));
    return this.profile(user);
  }

  async listAddresses(user: AuthUser): Promise<Address[]> {
    const rows = await this.db.select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(desc(addresses.isDefault), asc(addresses.createdAt));
    return rows.map(({ id, label, line, landmark, isDefault }) => ({ id, label, line, landmark, isDefault }));
  }

  /** The first address, or one marked default, becomes the only default. */
  private async setDefault(tx: Database, userId: string, id: string) {
    await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    await tx.update(addresses).set({ isDefault: true }).where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  }

  async addAddress(user: AuthUser, input: AddressInput) {
    const [{ n }] = await this.db.select({ n: count() }).from(addresses).where(eq(addresses.userId, user.id));
    if (n >= MAX_ADDRESSES) throw new NotFoundException(`You can save up to ${MAX_ADDRESSES} addresses.`);
    await this.db.transaction(async (tx) => {
      const [row] = await tx.insert(addresses).values({ userId: user.id, label: input.label, line: input.line, landmark: input.landmark ?? null }).returning();
      if (input.isDefault || n === 0) await this.setDefault(tx as unknown as Database, user.id, row.id);
    });
    return this.listAddresses(user);
  }

  async updateAddress(user: AuthUser, id: string, patch: AddressPatch) {
    const { isDefault, ...rest } = patch;
    await this.db.transaction(async (tx) => {
      const [row] = await tx.update(addresses).set(rest).where(and(eq(addresses.id, id), eq(addresses.userId, user.id))).returning();
      if (!row) throw new NotFoundException("That address doesn't exist.");
      if (isDefault) await this.setDefault(tx as unknown as Database, user.id, id);
    });
    return this.listAddresses(user);
  }

  async removeAddress(user: AuthUser, id: string) {
    const [row] = await this.db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, user.id))).returning();
    if (!row) throw new NotFoundException("That address doesn't exist.");
    const rest = await this.listAddresses(user);
    if (row.isDefault && rest.length) {
      await this.setDefault(this.db, user.id, rest[0].id);
      return this.listAddresses(user);
    }
    return rest;
  }
}

/** The logged-in customer's own profile and saved addresses. Users can only ever reach their own rows. */
@ApiTags("customers")
@ApiBearerAuth()
@Controller("me")
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get("profile")
  profile(@CurrentUser() user: AuthUser) {
    return this.customers.profile(user);
  }

  @Patch("profile")
  updateProfile(@CurrentUser() user: AuthUser, @Body(new ZodPipe(profilePatch)) patch: ProfilePatch) {
    return this.customers.updateProfile(user, patch);
  }

  @Get("addresses")
  addresses(@CurrentUser() user: AuthUser) {
    return this.customers.listAddresses(user);
  }

  @Post("addresses")
  addAddress(@CurrentUser() user: AuthUser, @Body(new ZodPipe(addressInput)) input: AddressInput) {
    return this.customers.addAddress(user, input);
  }

  @Patch("addresses/:id")
  updateAddress(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body(new ZodPipe(addressPatch)) patch: AddressPatch) {
    return this.customers.updateAddress(user, id, patch);
  }

  @Delete("addresses/:id")
  @HttpCode(200)
  removeAddress(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.customers.removeAddress(user, id);
  }
}

@Module({ controllers: [CustomersController], providers: [CustomersService] })
export class CustomersModule {}
