import Link from "next/link";
import { Wordmark } from "./logo";
import { HeaderCartLink } from "./header-cart-link";
import { SearchIcon } from "./icons";

const navLink = "whitespace-nowrap rounded-lg px-3 py-2 text-muted transition-colors hover:bg-surface hover:text-ink";

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-40 border-b border-line bg-paper">
      <div className="site-header-inner mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="The Coffee Cat home">
          <Wordmark />
        </Link>
        {/* Mobile: search only; the bottom nav carries the rest. */}
        <Link href="/search" className="rounded-lg p-2 text-ink hover:bg-surface md:hidden" aria-label="Search the menu">
          <SearchIcon className="h-6 w-6" />
        </Link>
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
          <HeaderCartLink />
        </nav>
      </div>
    </header>
  );
}
