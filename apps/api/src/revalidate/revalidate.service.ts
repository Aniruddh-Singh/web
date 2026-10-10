import { Injectable, Logger } from "@nestjs/common";
import { env } from "../config/env.js";

/** Tells the customer site to refresh its cached pages after staff edits. Fire-and-forget. */
@Injectable()
export class RevalidateService {
  private readonly logger = new Logger(RevalidateService.name);

  trigger(tags: ("menu" | "store")[]) {
    const { WEB_REVALIDATE_URL: url, REVALIDATE_SECRET: secret } = env();
    if (!url || !secret || env().NODE_ENV === "test") return;
    fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-revalidate-secret": secret }, body: JSON.stringify({ tags }) })
      .then((r) => !r.ok && this.logger.warn(`Site refresh returned ${r.status}`))
      .catch((e) => this.logger.warn(`Site refresh failed: ${(e as Error).message}`));
  }
}
