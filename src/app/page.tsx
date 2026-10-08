import { business } from "@/lib/menu";
import { RestaurantHeader } from "@/components/restaurant-header";
import { HomeSections } from "@/components/home-sections";
import { CartBar } from "@/components/cart-bar";
import { PrototypeNotice } from "@/components/prototype-notice";
import { CafePhotos } from "@/components/cafe-photos";

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
      <RestaurantHeader />
      <HomeSections />
      <CafePhotos />
      <CartBar />
    </>
  );
}
