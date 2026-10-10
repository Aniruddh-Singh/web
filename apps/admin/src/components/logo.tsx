/** Cat roundel, served from the customer site's public folder copy. */
export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="" className={`rounded-full ${className}`} />;
}
