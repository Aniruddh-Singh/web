import { business } from "@/lib/menu";
import { CategoryTiles, CoffeeExperience, OffersSection, PopularPicks, ReviewsSection } from "@/components/home-sections";
import { HomeHero } from "@/components/home-hero";
import { CartBar } from "@/components/cart-bar";
import { PrototypeNotice } from "@/components/prototype-notice";
import { CafePhotos } from "@/components/cafe-photos";
import { StorySection } from "@/components/motion/story-section";
import { PromiseCards } from "@/components/motion/promise-cards";
import { VisitNight } from "@/components/motion/visit-night";
import { FloatingCta } from "@/components/motion/floating-cta";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CafeOrCoffeeShop",
  name: business.name,
  servesCuisine: business.cuisines,
  telephone: business.phone.primary,
  priceRange: "₹₹",
  image: "/images/cafe/interior.jpg",
  email: business.email,
  sameAs: [business.social.instagram],
  address: {
    "@type": "PostalAddress",
    streetAddress: "G-07, Ground Floor, Antriksh Forest Market, Sector 77",
    addressLocality: "Noida",
    addressRegion: "Uttar Pradesh",
    postalCode: "201301",
    addressCountry: "IN",
  },
  geo: { "@type": "GeoCoordinates", latitude: business.geo.lat, longitude: business.geo.lng },
  hasMenu: "/menu",
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PrototypeNotice />
      <HomeHero />
      <OffersSection />
      <div className="space-y-20 pb-20 pt-14">
        <CategoryTiles />
        <PopularPicks />
      </div>
      <CoffeeExperience />
      <StorySection />
      <div className="space-y-20 pb-24 pt-4">
        <PromiseCards />
        <ReviewsSection />
        <CafePhotos />
      </div>
      <VisitNight />
      <FloatingCta />
      <CartBar />
    </>
  );
}
