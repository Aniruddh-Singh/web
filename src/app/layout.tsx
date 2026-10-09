import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Caveat, Figtree } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BottomNav } from "@/components/bottom-nav";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { MotionProvider } from "@/components/motion/reveal";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

// Script face for sign-offs only; not preloaded so it never competes with the hero.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["600", "700"],
  preload: false,
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://thecoffeecat.example"),
  title: {
    default: "The Coffee Cat — Order online | Cafe in Sector 77, Noida",
    template: "%s | The Coffee Cat",
  },
  description:
    "Order cold coffee, momos, pizza, burgers and more from The Coffee Cat, Antriksh Forest Market, Sector 77, Noida. Delivery and takeaway.",
  openGraph: {
    type: "website",
    siteName: "The Coffee Cat",
    images: [{ url: "/images/cafe/interior.jpg", width: 1080, height: 720 }],
  },
  // Prototype: keep it out of search results until launch.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${bricolage.variable} ${figtree.variable} ${caveat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <MotionProvider>
          <SmoothScroll />
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <BottomNav />
        </MotionProvider>
      </body>
    </html>
  );
}
