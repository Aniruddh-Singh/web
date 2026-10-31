import { business, pricing } from "./menu";

/*
 * Display copy for the home page (offers, ratings). The API is what actually validates coupons and
 * charges fees, so keep these in step with the admin portal's coupons and store settings.
 */

export type Offer = { id: string; title: string; detail: string; code?: string };

export const offers: Offer[] = [
  { id: "purr50", title: "₹50 off on orders above ₹399", detail: "Use code at checkout", code: "PURR50" },
  { id: "free-delivery", title: `Free delivery above ₹${pricing.freeDeliveryAbove}`, detail: "No code needed" },
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
