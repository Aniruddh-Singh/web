import type { Metadata } from "next";
import credits from "@/data/photo-credits.json";

export const metadata: Metadata = {
  title: "Photo credits",
  description: "Credits for the openly licensed dish photos used on The Coffee Cat's menu.",
  alternates: { canonical: "/credits" },
};

type Credit = { dish: string; title?: string | null; creator?: string | null; creator_url?: string | null; license: string; license_version?: string | null; license_url?: string | null; landing_url?: string | null };

// Licence names come from Wikimedia Commons as written there ("CC BY-SA 4.0", "CC0", "Public domain").
const licenseName = (c: Credit) => c.license;

/** Attribution for every representative dish photo (required by CC BY / BY-SA). The cafe's own photos aren't listed. */
export default function CreditsPage() {
  const rows = Object.values(credits as Record<string, Credit>).sort((a, b) => a.dish.localeCompare(b.dish));
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold">Photo credits</h1>
      <p className="mt-3 text-muted">
        Dishes marked &ldquo;Representative photo&rdquo; use openly licensed photos until the cafe photographs its own. Thank you to these photographers. Photos were cropped to
        a square.
      </p>
      <ul className="mt-8 divide-y divide-line rounded-2xl border border-line bg-paper px-5">
        {rows.map((c) => (
          <li key={c.dish} className="py-3 text-sm">
            <p className="font-semibold">{c.dish}</p>
            <p className="mt-0.5 text-muted">
              {c.landing_url ? (
                <a href={c.landing_url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-ink hover:underline">
                  &ldquo;{c.title || "Photo"}&rdquo;
                </a>
              ) : (
                <>&ldquo;{c.title || "Photo"}&rdquo;</>
              )}
              {c.creator && <> by {c.creator_url ? <a href={c.creator_url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-ink hover:underline">{c.creator}</a> : c.creator}</>}
              {" · "}
              {c.license_url ? (
                <a href={c.license_url} target="_blank" rel="noopener noreferrer license" className="underline-offset-2 hover:text-ink hover:underline">
                  {licenseName(c)}
                </a>
              ) : (
                licenseName(c)
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
