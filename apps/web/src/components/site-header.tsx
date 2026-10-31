import Link from "next/link";
import { Wordmark } from "./logo";
import { HeaderCartLink } from "./header-cart-link";
import { SearchIcon } from "./icons";
import { AccountLink } from "./account-link";

const navLink = "whitespace-nowrap rounded-lg px-3 py-2 text-foam/80 transition-colors hover:bg-paper/10 hover:text-paper";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-ink text-paper shadow-[0_2px_12px_rgba(34,24,19,0.25)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="The Coffee Cat home">
          <Wordmark tone="dark" />
        </Link>
        {/* Mobile: search and account; the bottom nav carries the rest. */}
        <div className="flex items-center md:hidden">
          <Link href="/search" className="grid h-11 w-11 place-items-center rounded-lg text-paper hover:bg-paper/10" aria-label="Search the menu">
            <SearchIcon className="h-6 w-6" />
          </Link>
          <AccountLink compact />
        </div>
        <nav aria-label="Main" className="hidden items-center gap-1 text-sm font-medium md:flex">
          <Link href="/menu" className={navLink}>
            Menu
          </Link>
          <Link href="/search" className={`${navLink} flex items-center gap-2`}>
            <SearchIcon className="h-4 w-4" /> Search
          </Link>
          <Link href="/order" className={navLink}>
            Your orders
          </Link>
          <AccountLink />
          <HeaderCartLink />
        </nav>
      </div>
    </header>
  );
}
