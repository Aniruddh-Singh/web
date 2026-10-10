import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  availabilityInput,
  categoryInput,
  categoryPatch,
  itemInput,
  itemPatch,
  reorderInput,
  sectionInput,
  sectionPatch,
  type CategoryInput,
  type CategoryPatch,
  type ItemInput,
  type ItemPatch,
  type ReorderInput,
  type SectionInput,
  type SectionPatch,
} from "@coffeecat/shared";
import type { AuthUser } from "../auth/auth.types.js";
import { CurrentUser, RequirePermission } from "../auth/decorators.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { AdminMenuService } from "./admin-menu.service.js";

@ApiTags("admin: menu")
@ApiBearerAuth()
@Controller("admin/menu")
export class AdminMenuController {
  constructor(private readonly menu: AdminMenuService) {}

  @RequirePermission("menu:availability")
  @Get()
  full() {
    return this.menu.full();
  }

  @RequirePermission("menu:edit")
  @Post("categories")
  createCategory(@Body(new ZodPipe(categoryInput)) input: CategoryInput, @CurrentUser() user: AuthUser) {
    return this.menu.createCategory(input, user);
  }

  @RequirePermission("menu:edit")
  @Patch("categories/:id")
  updateCategory(@Param("id") id: string, @Body(new ZodPipe(categoryPatch)) patch: CategoryPatch, @CurrentUser() user: AuthUser) {
    return this.menu.updateCategory(id, patch, user);
  }

  @RequirePermission("menu:edit")
  @Post("categories/order")
  reorderCategories(@Body(new ZodPipe(reorderInput)) input: ReorderInput, @CurrentUser() user: AuthUser) {
    return this.menu.reorder("categories", null, input.ids, user);
  }

  @RequirePermission("menu:edit")
  @Post("sections")
  createSection(@Body(new ZodPipe(sectionInput)) input: SectionInput, @CurrentUser() user: AuthUser) {
    return this.menu.createSection(input, user);
  }

  @RequirePermission("menu:edit")
  @Patch("sections/:id")
  updateSection(@Param("id") id: string, @Body(new ZodPipe(sectionPatch)) patch: SectionPatch, @CurrentUser() user: AuthUser) {
    return this.menu.updateSection(id, patch, user);
  }

  @RequirePermission("menu:edit")
  @Post("categories/:id/sections/order")
  reorderSections(@Param("id") id: string, @Body(new ZodPipe(reorderInput)) input: ReorderInput, @CurrentUser() user: AuthUser) {
    return this.menu.reorder("sections", id, input.ids, user);
  }

  @RequirePermission("menu:edit")
  @Post("items")
  createItem(@Body(new ZodPipe(itemInput)) input: ItemInput, @CurrentUser() user: AuthUser) {
    return this.menu.createItem(input, user);
  }

  @RequirePermission("menu:edit")
  @Patch("items/:id")
  updateItem(@Param("id") id: string, @Body(new ZodPipe(itemPatch)) patch: ItemPatch, @CurrentUser() user: AuthUser) {
    return this.menu.updateItem(id, patch, user);
  }

  /** Sold out / back in stock. Kitchen staff can do this too. */
  @RequirePermission("menu:availability")
  @Patch("items/:id/availability")
  availability(@Param("id") id: string, @Body(new ZodPipe(availabilityInput)) input: { isAvailable: boolean }, @CurrentUser() user: AuthUser) {
    return this.menu.setAvailability(id, input.isAvailable, user);
  }

  @RequirePermission("menu:edit")
  @Post("items/:id/archive")
  archive(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.menu.archiveItem(id, user);
  }

  @RequirePermission("menu:edit")
  @Post("sections/:id/items/order")
  reorderItems(@Param("id") id: string, @Body(new ZodPipe(reorderInput)) input: ReorderInput, @CurrentUser() user: AuthUser) {
    return this.menu.reorder("items", id, input.ids, user);
  }
}
