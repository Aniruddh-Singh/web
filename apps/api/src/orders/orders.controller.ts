import { Body, Controller, Get, HttpCode, Param, Post, Query, Sse, type MessageEvent } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { createOrderInput, quoteInput, type CreateOrderInput, type QuoteInput } from "@coffeecat/shared";
import { concat, defer, from, type Observable } from "rxjs";
import { map } from "rxjs/operators";
import type { AuthUser } from "../auth/auth.types.js";
import { CurrentUser, Public } from "../auth/decorators.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { OrderEventsService } from "./order-events.service.js";
import { OrdersService } from "./orders.service.js";

@ApiTags("orders")
@Controller()
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly events: OrderEventsService,
  ) {}

  /** Checkout preview: the server's bill for a cart, coupon result and sold-out items. */
  @Public()
  @Post("orders/quote")
  @HttpCode(200)
  quote(@Body(new ZodPipe(quoteInput)) input: QuoteInput, @CurrentUser() user?: AuthUser) {
    return this.orders.quote(input, user);
  }

  /** Place an order as a guest or a logged-in customer. */
  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post("orders")
  create(@Body(new ZodPipe(createOrderInput)) input: CreateOrderInput, @CurrentUser() user?: AuthUser) {
    return this.orders.create(input, user);
  }

  /** Track an order with its tracking token (guests) or while logged in as its owner. */
  @Public()
  @Get("orders/:code")
  get(@Param("code") code: string, @Query("t") token: string | undefined, @CurrentUser() user?: AuthUser) {
    return this.orders.getForViewer(code, token, user);
  }

  /** Live status for one order. Sends the current state first, then every change. */
  @Public()
  @Sse("orders/:code/events")
  stream(@Param("code") code: string, @Query("t") token: string | undefined, @CurrentUser() user?: AuthUser): Observable<MessageEvent> {
    return concat(
      defer(() => from(this.orders.getForViewer(code, token, user))).pipe(map((order) => ({ type: "order", data: order }) as MessageEvent)),
      defer(() => this.events.forOrder(code.toUpperCase())),
    );
  }

  @ApiBearerAuth()
  @Get("me/orders")
  mine(@CurrentUser() user: AuthUser) {
    return this.orders.listMine(user.id);
  }
}
