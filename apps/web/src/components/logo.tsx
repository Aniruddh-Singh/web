import Image from "next/image";
import logo from "../../public/images/cafe/logo.png";

/** The cafe's cat roundel, cropped from its printed menu card. Swap for the original vector file when the owner shares it. */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return <Image src={logo} alt="" className={`rounded-full ${className}`} sizes="40px" />;
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <LogoMark className="h-8 w-8 sm:h-9 sm:w-9" />
      <span className="font-display text-lg font-extrabold tracking-tight text-ink sm:text-xl">The Coffee Cat</span>
    </span>
  );
}
