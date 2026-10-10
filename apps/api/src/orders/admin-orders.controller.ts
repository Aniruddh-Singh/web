import { Body, Controller, Get, Param, Patch, Post, Query, Sse, type MessageEvent } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { cancelOrderInput, updateOrderStatusInput, type CancelOrderInput, type UpdateOrderStatusInput } from "@coffeecat/shared";
import type { Observable } from "rxjs";
import type { AuthUser } from "../auth/auth.types.js";
import { CurrentUser, RequirePermission } from "../auth/decorators.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { OrderEventsService } from "./order-events.service.js";
import { OrdersService } from "./orders.service.js";

@ApiTags("admin: orders")
@ApiBearerAuth()
@Controller("admin/orders")
export class AdminOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly events: OrderEventsService,
  ) {}

  @RequirePermission("orders:view")
  @Get()
  list(@Query("scope") scope: "active" | "today" | "recent" = "active") {
    return this.orders.listForStaff(["active", "today", "recent"].includes(scope) ? scope : "active");
  }

  /** Every order change, live, for the board. */
  @RequirePermission("orders:view")
  @SkipThrottle()
  @Sse("stream")
  stream(): Observable<MessageEvent> {
    return this.events.all();
  }

  @RequirePermission("orders:view")
  @Get(":code")
  get(@Param("code") code: string) {
    return this.orders.getForStaff(code);
  }

  @RequirePermission("orders:update")
  @Patch(":code/status")
  setStatus(@Param("code") code: string, @Body(new ZodPipe(updateOrderStatusInput)) input: UpdateOrderStatusInput, @CurrentUser() user: AuthUser) {
    return this.orders.updateStatus(code, input.status, user, input.note);
  }

  @RequirePermission("orders:cancel")
  @Post(":code/cancel")
  cancel(@Param("code") code: string, @Body(new ZodPipe(cancelOrderInput)) input: CancelOrderInput, @CurrentUser() user: AuthUser) {
    return this.orders.cancel(code, input.reason, user);
  }

  @RequirePermission("orders:update")
  @Post(":code/mark-paid")
  markPaid(@Param("code") code: string, @CurrentUser() user: AuthUser) {
    return this.orders.markPaid(code, user);
  }
}
