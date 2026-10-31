import interior from "../../public/images/cafe/interior.jpg";
import swings from "../../public/images/cafe/swing-chairs.jpg";
import storefront from "../../public/images/cafe/storefront-night.jpg";
import logoWall from "../../public/images/cafe/logo-wall.jpg";
import latte from "../../public/images/cafe/cafe-latte.jpg";
import toast from "../../public/images/cafe/chilli-cheese-toast-poster.jpg";
import menuCard from "../../public/images/cafe/menu-card.jpg";
import lemonade from "../../public/images/cafe/mint-lemonade.jpg";
import { PhotoGallery, type GalleryPhoto } from "./photo-gallery";

/* Spans make a mosaic: big interior shot, tall portraits, one wide wall shot. */
const photos: GalleryPhoto[] = [
  { src: interior, alt: "The seating area with a hanging swing chair and the cake counter", span: "col-span-2 row-span-2" },
  { src: swings, alt: "Rattan swing chairs by the window in evening light", span: "row-span-2" },
  { src: storefront, alt: "The Coffee Cat's lit sign over the entrance at night", span: "row-span-2", position: "object-top" },
  { src: logoWall, alt: "The cat roundel on the textured wall above the tables", span: "col-span-2", position: "object-[50%_30%]" },
  { src: menuCard, alt: "The printed coffee menu", span: "row-span-2" },
  { src: lemonade, alt: "Mint lemonade in a branded cup", span: "row-span-2" },
  { src: latte, alt: "A latte in a Coffee Cat cup next to a laptop", span: "" },
  { src: toast, alt: "Chilli cheese toast with bell peppers, mozzarella and green chillies", span: "" },
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
    </section>
  );
}
