import raw from "@/data/coffee-cat.json";

/*
 * Client-safe, static bits. Menu content now comes from the API: use `getMenu()` from
 * "@/lib/menu-data" in server components and `useMenu()` in client components.
 */
export { countItems, type DishPhoto, type FoodType, type MenuCategory, type MenuItem, type MenuSection, type SearchHit } from "./menu-index";

/** Business details (address, phone, ratings). Moves to the API with store settings in Phase 2. */
export const business = raw.business;
export const dataStatus = raw._meta.status;

export const popularSearches = ["Cold coffee", "Momos", "Pizza", "Burger", "Pasta", "Frappe", "Brownie"];

export const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Display copy only (offers, hero). The API's store settings are what orders are charged by. */
export const pricing = {
  // From the cafe's printed menu card.
  freeDeliveryAbove: raw.business.free_delivery_above_inr,
};
