import { business } from "@/lib/menu";
import { RestaurantHeader } from "@/components/restaurant-header";
import { BestsellerRail, CategoryTiles, FavouritesCoverflow } from "@/components/home-sections";
import { CartBar } from "@/components/cart-bar";
import { PrototypeNotice } from "@/components/prototype-notice";
import { CafePhotos } from "@/components/cafe-photos";
import { HomeHero } from "@/components/motion/home-hero";
import { StorySection } from "@/components/motion/story-section";
import { StatsStrip } from "@/components/motion/stats-strip";
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
      <HomeHero />
      <PrototypeNotice />
      <RestaurantHeader />
      <FavouritesCoverflow />
      <StorySection />
      <StatsStrip />
      <div className="space-y-20 pt-20 pb-24">
        <CategoryTiles />
        <PromiseCards />
        <BestsellerRail />
      </div>
      <VisitNight />
      <CafePhotos />
      <FloatingCta />
      <CartBar />
    </>
  );
}
