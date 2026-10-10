import type { StaffRole } from "@coffeecat/shared";

export type AuthUser = {
  id: string;
  email: string | null;
  phone: string | null;
  /** Present only for active staff. */
  role: StaffRole | null;
};

export type AuthedRequest = { user?: AuthUser; headers: Record<string, string | string[] | undefined> };
