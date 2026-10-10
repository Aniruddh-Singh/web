import { Inject, Injectable, Logger } from "@nestjs/common";
import type { AuditEntry } from "@coffeecat/shared";
import { desc, eq } from "drizzle-orm";
import type { AuthUser } from "../auth/auth.types.js";
import { DB } from "../db/db.module.js";
import type { Database } from "../db/client.js";
import { auditLog, profiles } from "../db/schema.js";

/** Who changed what, for every staff edit. Never blocks the edit itself if logging fails. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(DB) private readonly db: Database) {}

  async log(actor: AuthUser, action: string, entity: string, entityId: string | null, before: unknown, after: unknown) {
    try {
      await this.db.insert(auditLog).values({ actorUserId: actor.id, action, entity, entityId, before: before ?? null, after: after ?? null });
    } catch (e) {
      this.logger.error(`Audit write failed for ${action} ${entity}:${entityId}`, e as Error);
    }
  }

  async recent(limit = 200): Promise<AuditEntry[]> {
    const rows = await this.db
      .select({ id: auditLog.id, at: auditLog.at, actorEmail: profiles.email, action: auditLog.action, entity: auditLog.entity, entityId: auditLog.entityId, before: auditLog.before, after: auditLog.after })
      .from(auditLog)
      .leftJoin(profiles, eq(profiles.id, auditLog.actorUserId))
      .orderBy(desc(auditLog.at))
      .limit(limit);
    return rows.map((r) => ({ ...r, at: r.at.toISOString() }));
  }
}
