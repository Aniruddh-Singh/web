import { z } from "zod";

/** Customer profile and saved addresses. */
export const profilePatch = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80).optional(),
  phone: z
    .string()
    .transform((s) => s.replace(/\D/g, "").slice(-10))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number"))
    .optional(),
});
export type ProfilePatch = z.infer<typeof profilePatch>;
export type Profile = { id: string; name: string | null; phone: string | null; email: string | null };

export const addressInput = z.object({
  label: z.string().trim().min(1).max(30).default("Home"),
  line: z.string().trim().min(10, "Enter your full address, including flat and tower").max(300),
  landmark: z.string().trim().max(120).nullable().optional(),
  isDefault: z.boolean().default(false),
});
export const addressPatch = addressInput.partial();
export type AddressInput = z.infer<typeof addressInput>;
export type AddressPatch = z.infer<typeof addressPatch>;
export type Address = { id: string; label: string; line: string; landmark: string | null; isDefault: boolean };
