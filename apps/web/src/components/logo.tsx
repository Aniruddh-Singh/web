import Image from "next/image";
import logo from "../../public/images/cafe/logo.png";

/** The cafe's cat roundel, cropped from its printed menu card. Swap for the original vector file when the owner shares it. */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return <Image src={logo} alt="" className={`rounded-full ${className}`} sizes="40px" />;
}

export function Wordmark({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <LogoMark className={`h-8 w-8 sm:h-9 sm:w-9 ${tone === "dark" ? "ring-2 ring-crema/60" : ""}`} />
      <span className="leading-none">
        <span className={`block font-display text-lg font-bold tracking-wide sm:text-xl ${tone === "dark" ? "text-paper" : "text-ink"}`}>The Coffee Cat</span>
        <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.25em] text-crema">Coffee · Food · Good vibes</span>
      </span>
    </span>
  );
}
