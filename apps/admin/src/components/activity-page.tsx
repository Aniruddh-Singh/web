"use client";

import { formatINR, type AuditEntry } from "@coffeecat/shared";
import { useApi } from "@/lib/use-api";
import { Notice, PageHeader } from "./ui";

type Obj = Record<string, unknown> | null;

/** One plain sentence per change. */
function describe(e: AuditEntry): string {
  const after = e.after as Obj;
  const before = e.before as Obj;
  const name = (after?.name ?? before?.name ?? e.entityId) as string;
  switch (`${e.action}:${e.entity}`) {
    case "price-change:item": return `changed the price of ${name} from ${formatINR(Number(before?.pricePaise))} to ${formatINR(Number(after?.pricePaise))}`;
    case "sold-out:item": return `marked ${e.entityId} sold out`;
    case "back-in-stock:item": return `put ${e.entityId} back in stock`;
    case "create:item": return `added ${name} to the menu`;
    case "update:item": return `edited ${name}`;
    case "archive:item": return `removed ${name} from the menu`;
    case "create:category": return `added the ${name} category`;
    case "update:category": return `edited the ${name} category`;
    case "create:section": return `added the ${name} section`;
    case "update:section": return `edited the ${name} section`;
    case "pause-orders:store": return "paused online orders";
    case "resume-orders:store": return "resumed online orders";
    case "update:store": return "changed store hours or charges";
    case "create:coupon": return `created coupon ${e.entityId}`;
    case "update:coupon": return `edited coupon ${e.entityId}`;
    case "deactivate:coupon": return `switched off coupon ${e.entityId}`;
    case "invite:staff": return `added ${e.entityId} as ${String(after?.role)}`;
    case "update:staff": return `changed a staff member's role to ${String(after?.role)}`;
    case "deactivate:staff": return "removed a staff member's access";
    default: return `${e.action} ${e.entity}${e.entityId ? ` ${e.entityId}` : ""}`;
  }
}

export function ActivityPage() {
  const { data, error } = useApi<AuditEntry[]>("/admin/audit");
  return (
    <div className="max-w-3xl px-4 py-5 md:px-8">
      <PageHeader title="Activity" description="Every change staff made to the menu, prices, store, coupons and staff, newest first." />
      {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
      <ol className="mt-6 divide-y divide-line rounded-2xl border border-line bg-paper">
        {data?.map((e) => (
          <li key={e.id} className="px-4 py-3 text-sm">
            <span className="font-semibold">{e.actorEmail ?? "Someone"}</span> {describe(e)}
            <span className="block text-xs text-muted">{new Date(e.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
          </li>
        ))}
        {data?.length === 0 && <li className="px-4 py-8 text-center text-muted">Nothing yet.</li>}
      </ol>
    </div>
  );
}
