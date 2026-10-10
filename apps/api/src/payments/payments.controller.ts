import { BadRequestException, Body, Controller, Headers, HttpCode, Logger, Param, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { razorpayConfirmInput, type RazorpayConfirmInput } from "@coffeecat/shared";
import type { AuthUser } from "../auth/auth.types.js";
import { CurrentUser, Public } from "../auth/decorators.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { OrdersService } from "../orders/orders.service.js";
import { RazorpayService } from "./razorpay.service.js";

type RazorpayWebhook = {
  event: string;
  payload: { payment?: { entity: { id: string; order_id: string } }; order?: { entity: { id: string } } };
};

@ApiTags("payments")
@Controller()
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly orders: OrdersService,
    private readonly razorpay: RazorpayService,
  ) {}

  /** Re-open checkout for an unpaid online order (customer closed the payment window). */
  @Public()
  @Post("orders/:code/payment")
  @HttpCode(200)
  retry(@Param("code") code: string, @Query("t") token: string | undefined, @CurrentUser() user?: AuthUser) {
    return this.orders.paymentSessionFor(code, token, user);
  }

  /** Razorpay Checkout success callback from the browser. The signature proves Razorpay sent it. */
  @Public()
  @Post("orders/:code/payment/confirm")
  @HttpCode(200)
  async confirm(@Param("code") code: string, @Query("t") token: string | undefined, @Body(new ZodPipe(razorpayConfirmInput)) body: RazorpayConfirmInput, @CurrentUser() user?: AuthUser) {
    await this.orders.getForViewer(code, token, user);
    if (!this.razorpay.checkoutSignatureValid(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)) {
      throw new BadRequestException("We couldn't verify that payment. If money was taken, it will be confirmed automatically or refunded.");
    }
    return this.orders.markOnlinePaid(body.razorpay_order_id, body.razorpay_payment_id, code);
  }

  /** Razorpay → us. Source of truth for payments, even if the customer closes the tab after paying. */
  @Public()
  @SkipThrottle()
  @Post("payments/razorpay/webhook")
  @HttpCode(200)
  async webhook(@Req() req: { rawBody?: Buffer }, @Headers("x-razorpay-signature") signature: string | undefined, @Body() body: RazorpayWebhook) {
    if (!req.rawBody || !signature || !this.razorpay.webhookSignatureValid(req.rawBody, signature)) {
      throw new BadRequestException("Invalid signature");
    }
    const payment = body.payload.payment?.entity;
    const orderId = payment?.order_id ?? body.payload.order?.entity.id;
    if (!orderId) return { ok: true };
    switch (body.event) {
      case "payment.captured":
      case "order.paid":
        await this.orders.markOnlinePaid(orderId, payment?.id ?? null);
        break;
      case "payment.failed":
        await this.orders.markOnlineFailed(orderId);
        break;
      default:
        this.logger.log(`Ignored Razorpay event ${body.event}`);
    }
    return { ok: true };
  }
}
