import { BadGatewayException, Injectable } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Minimal Razorpay client: create orders and check signatures. Uses the REST API directly
 * (no SDK) so tests can point it at a fake server via RAZORPAY_API_BASE.
 */
@Injectable()
export class RazorpayService {
  enabled() {
    const e = env();
    return Boolean(e.RAZORPAY_KEY_ID && e.RAZORPAY_KEY_SECRET);
  }

  keyId() {
    return env().RAZORPAY_KEY_ID!;
  }

  async createOrder(amountPaise: number, receipt: string, notes: Record<string, string>): Promise<{ id: string }> {
    const { RAZORPAY_KEY_ID: id, RAZORPAY_KEY_SECRET: secret, RAZORPAY_API_BASE: base } = env();
    const res = await fetch(`${base}/v1/orders`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}` },
      body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (!res?.ok) throw new BadGatewayException("Couldn't start the payment. Try again, or choose pay on delivery.");
    return (await res.json()) as { id: string };
  }

  /** Checkout success callback: HMAC-SHA256 of "order_id|payment_id" with the key secret. */
  checkoutSignatureValid(orderId: string, paymentId: string, signature: string) {
    const expected = createHmac("sha256", env().RAZORPAY_KEY_SECRET ?? "").update(`${orderId}|${paymentId}`).digest("hex");
    return safeEqual(expected, signature);
  }

  /** Webhook: HMAC-SHA256 of the raw request body with the webhook secret. */
  webhookSignatureValid(rawBody: Buffer, signature: string) {
    const secret = env().RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return false;
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    return safeEqual(expected, signature);
  }
}
