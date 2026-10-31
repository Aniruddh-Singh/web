import interior from "../../public/images/cafe/interior.jpg";
import swings from "../../public/images/cafe/swing-chairs.jpg";
import storefront from "../../public/images/cafe/storefront-night.jpg";
import logoWall from "../../public/images/cafe/logo-wall.jpg";
import latte from "../../public/images/cafe/cafe-latte.jpg";
import toast from "../../public/images/cafe/chilli-cheese-toast-poster.jpg";
import menuCard from "../../public/images/cafe/menu-card.jpg";
import lemonade from "../../public/images/cafe/mint-lemonade.jpg";
import { business } from "@/lib/menu";
import { PhotoGallery, type GalleryPhoto } from "./photo-gallery";

const handle = `@${business.social.instagram.split("/").filter(Boolean).pop()}`;

const photos: GalleryPhoto[] = [
  { src: interior, alt: "The seating area with a hanging swing chair and the cake counter" },
  { src: swings, alt: "Rattan swing chairs by the window in evening light" },
  { src: storefront, alt: "The Coffee Cat's lit sign over the entrance at night", position: "object-top" },
  { src: logoWall, alt: "The cat roundel on the textured wall above the tables", position: "object-[50%_30%]" },
  { src: menuCard, alt: "The printed coffee menu" },
  { src: lemonade, alt: "Mint lemonade in a branded cup" },
  { src: latte, alt: "A latte in a Coffee Cat cup next to a laptop" },
  { src: toast, alt: "Chilli cheese toast with bell peppers, mozzarella and green chillies" },
];

export function CafePhotos() {
  return (
    <section id="photos" aria-labelledby="photos-heading" className="mx-auto max-w-6xl scroll-mt-20 px-4">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-mocha">Come say hello</p>
      <h2 id="photos-heading" className="mt-1.5 font-display text-3xl font-bold sm:text-4xl">
        Inside our cafe
      </h2>
      <p className="mt-1 text-muted">Swing chairs, plants and a cat on every cup.</p>
      <PhotoGallery photos={photos} />
      <div className="mt-5 flex flex-col items-start justify-between gap-4 rounded-2xl bg-ink p-5 text-paper sm:flex-row sm:items-center sm:px-6">
        <div>
          <p className="font-display text-xl font-bold">Share your experience</p>
          <p className="mt-0.5 text-sm text-foam/80">Snapped the swings or your cat cup? Tag {handle} on Instagram.</p>
        </div>
        <a
          href={business.social.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-crema px-5 font-bold text-ink transition-colors hover:bg-[#c9a985]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
          </svg>
          Follow {handle}
        </a>
      </div>
    </section>
  );
}
