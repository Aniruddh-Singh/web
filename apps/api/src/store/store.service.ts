import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { canTakeOrders, type StoreSettings } from "@coffeecat/shared";
import { eq } from "drizzle-orm";
import { env } from "../config/env.js";
import { DB } from "../db/db.module.js";
import type { Database } from "../db/client.js";
import { storeSettings } from "../db/schema.js";

@Injectable()
export class StoreService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getSettings(): Promise<StoreSettings> {
    const [row] = await this.db.select().from(storeSettings).where(eq(storeSettings.id, 1));
    if (!row) throw new NotFoundException("Store settings have not been set up. Run the seed.");
    const { id: _id, updatedAt: _u, ...settings } = row;
    return settings;
  }

  /** Public view: settings plus whether orders can be placed right now (India time). */
  async getPublic() {
    const settings = await this.getSettings();
    const e = env();
    return { ...settings, openNow: canTakeOrders(settings), onlinePayments: Boolean(e.RAZORPAY_KEY_ID && e.RAZORPAY_KEY_SECRET) };
  }
}
