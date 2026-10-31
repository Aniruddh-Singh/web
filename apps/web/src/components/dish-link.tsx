"use client";

import Link from "next/link";
import { ui } from "@/lib/ui-state";

type Props = Omit<React.ComponentProps<typeof Link>, "href"> & { id: string };

/** Real link to the dish page (SEO, new tab), but a plain click opens the quick-view sheet instead. */
export function DishLink({ id, onClick, ...rest }: Props) {
  return (
    <Link
      href={`/dish/${id}`}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        ui.openDish(id);
      }}
      {...rest}
    />
  );
}
