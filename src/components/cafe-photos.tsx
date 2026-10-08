import Image, { type StaticImageData } from "next/image";
import interior from "../../public/images/cafe/interior.jpg";
import swings from "../../public/images/cafe/swing-chairs.jpg";
import storefront from "../../public/images/cafe/storefront-night.jpg";
import logoWall from "../../public/images/cafe/logo-wall.jpg";
import latte from "../../public/images/cafe/cafe-latte.jpg";
import toast from "../../public/images/cafe/chilli-cheese-toast-poster.jpg";
import menuCard from "../../public/images/cafe/menu-card.jpg";
import lemonade from "../../public/images/cafe/mint-lemonade.jpg";

type Photo = { src: StaticImageData; alt: string; span: string; position?: string; href?: string; caption?: string };

/* Spans make a mosaic: big interior shot, tall portraits, one wide wall shot. */
const photos: Photo[] = [
  { src: interior, alt: "The seating area with a hanging swing chair and the cake counter", span: "col-span-2 row-span-2" },
  { src: swings, alt: "Rattan swing chairs by the window in evening light", span: "row-span-2" },
  { src: storefront, alt: "The Coffee Cat's lit sign over the entrance at night", span: "row-span-2", position: "object-top" },
  { src: logoWall, alt: "The cat roundel on the textured wall above the tables", span: "col-span-2", position: "object-[50%_30%]" },
  { src: menuCard, alt: "The printed coffee menu", span: "row-span-2", href: "/images/cafe/menu-card.jpg", caption: "Printed coffee menu" },
  { src: lemonade, alt: "Mint lemonade in a branded cup", span: "row-span-2" },
  { src: latte, alt: "A latte in a Coffee Cat cup next to a laptop", span: "" },
  { src: toast, alt: "Chilli cheese toast with bell peppers, mozzarella and green chillies", span: "" },
];

export function CafePhotos() {
  return (
    <section id="photos" aria-labelledby="photos-heading" className="mx-auto mt-16 max-w-6xl scroll-mt-20 px-4">
      <h2 id="photos-heading" className="font-display text-2xl font-bold">
        Inside the cafe
      </h2>
      <p className="mt-1 text-muted">Swing chairs, plants and a cat on every cup.</p>
      <ul className="mt-5 grid auto-rows-[150px] grid-cols-2 gap-2 sm:auto-rows-[190px] md:grid-cols-4">
        {photos.map((p) => {
          const img = (
            <Image
              src={p.src}
              alt={p.alt}
              fill
              sizes="(min-width: 768px) 25vw, 50vw"
              className={`object-cover ${p.position ?? ""}`}
              placeholder="blur"
            />
          );
          return (
            <li key={p.src.src} className={`relative overflow-hidden rounded-xl bg-surface ${p.span}`}>
              {p.href ? (
                <a href={p.href} target="_blank" rel="noopener" className="group block h-full">
                  {img}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-3 text-sm font-semibold text-paper">
                    {p.caption} (opens full size)
                  </span>
                </a>
              ) : (
                img
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
