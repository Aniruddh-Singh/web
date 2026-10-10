"use client";

import type { MenuResponse } from "@coffeecat/shared";
import { createContext, useContext } from "react";
import { indexMenu, type MenuIndex } from "@/lib/menu-index";

const MenuContext = createContext<MenuIndex | null>(null);

/** Hands the server-loaded menu to client components. */
export function MenuProvider({ data, children }: { data: MenuResponse; children: React.ReactNode }) {
  return <MenuContext.Provider value={indexMenu(data)}>{children}</MenuContext.Provider>;
}

export function useMenu(): MenuIndex {
  const menu = useContext(MenuContext);
  if (!menu) throw new Error("useMenu must be used inside <MenuProvider>");
  return menu;
}
