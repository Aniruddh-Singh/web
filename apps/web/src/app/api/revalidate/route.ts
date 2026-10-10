import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";

const tags = new Set(["menu", "store"]);

/** Called by the API after staff edits so prerendered pages pick up the change. */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET ?? "";
  const given = request.headers.get("x-revalidate-secret") ?? "";
  const ok = secret.length > 0 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { tags?: string[] };
  const requested = (body.tags ?? ["menu"]).filter((t) => tags.has(t));
  requested.forEach((t) => revalidateTag(t, "max"));
  return Response.json({ revalidated: requested });
}
