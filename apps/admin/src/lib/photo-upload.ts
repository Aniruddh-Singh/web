import type { UploadTicket } from "@coffeecat/shared";
import { api } from "./api";
import { supabase } from "./supabase";

/** Shrinks a photo to at most 1600 px on the long side as WebP, so uploads are fast on cafe Wi-Fi. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process the photo"))), "image/webp", 0.85));
}

/** Uploads a dish photo straight to Supabase Storage with a one-time ticket from the API. Returns its public URL. */
export async function uploadDishPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo (JPG, PNG or WebP).");
  const blob = await shrink(file);
  const ticket = await api<UploadTicket>("/admin/uploads/menu-photo", { method: "POST", json: { contentType: "image/webp", size: blob.size } });
  const { error } = await supabase.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, blob, { contentType: "image/webp" });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return ticket.publicUrl;
}
