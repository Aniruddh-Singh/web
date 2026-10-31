import { business, pricing } from "./menu";

/*
 * Display copy for the home page (offers, ratings). The API is what actually validates coupons and
 * charges fees, so keep these in step with the admin portal's coupons and store settings.
 */

/** `value`/`unit` is the big stamp on the ticket ("₹50" / "OFF"); `title` the full line used in details. */
export type Offer = { id: string; value: string; unit: string; title: string; condition: string; code?: string; terms: string[] };

export const offers: Offer[] = [
  {
    id: "purr50",
    value: "₹50",
    unit: "OFF",
    title: "₹50 off on orders above ₹399",
    condition: "On orders above ₹399",
    code: "PURR50",
    terms: [
      "Flat ₹50 off when your item total is ₹399 or more (before delivery, packaging and GST).",
      "One coupon per order; it can't be exchanged for cash.",
      "The discount is confirmed by the cafe's system at checkout before you pay.",
      "The cafe may change or end this offer at any time.",
    ],
  },
  {
    id: "free-delivery",
    value: "FREE",
    unit: "DELIVERY",
    title: `Free delivery above ₹${pricing.freeDeliveryAbove}`,
    condition: `On orders above ₹${pricing.freeDeliveryAbove}`,
    terms: [
      `Delivery is free when your item total is ₹${pricing.freeDeliveryAbove} or more; below that a small delivery fee applies.`,
      "Applies to delivery orders within the cafe's delivery area. Takeaway never has a delivery fee.",
    ],
  },
];

export type Rating = { source: string; value: string; count: string };

/** Public listing snapshot (October 2026). Update from the platforms; never invent numbers. */
export const ratings: Rating[] = [
  { source: "Google", value: "4.4", count: "400+ ratings" },
  { source: "Zomato delivery", value: "4.0", count: "1,300+ ratings" },
  { source: "Swiggy Dineout", value: "4.4", count: "360+ ratings" },
  { source: "Justdial", value: "4.3", count: "370+ ratings" },
];

export const headlineRating = ratings[0];

/** What reviewers mention most, from the public listings. */
export const highlights: string[] = business.reported_highlights;

export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${business.geo.lat},${business.geo.lng}`;
export const telUrl = `tel:${business.phone.primary.replace(/\s/g, "")}`;
