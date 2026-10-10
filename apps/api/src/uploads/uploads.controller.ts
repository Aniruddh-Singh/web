import { Body, Controller, Injectable, Module, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { uploadRequest, type UploadRequest, type UploadTicket } from "@coffeecat/shared";
import { randomUUID } from "node:crypto";
import { RequirePermission } from "../auth/decorators.js";
import { SupabaseAdmin } from "../common/supabase-admin.service.js";
import { ZodPipe } from "../common/zod.pipe.js";

export const MENU_PHOTO_BUCKET = "menu-photos";
const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

@Injectable()
export class UploadsService {
  constructor(private readonly supabase: SupabaseAdmin) {}

  /** Makes sure the public photo bucket exists with type and size limits. */
  async ensureBucket() {
    const storage = this.supabase.get().storage;
    const { data } = await storage.getBucket(MENU_PHOTO_BUCKET);
    if (!data) {
      const { error } = await storage.createBucket(MENU_PHOTO_BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024, allowedMimeTypes: Object.keys(ext) });
      if (error && !/already exists/i.test(error.message)) throw error;
    }
  }

  /** One-time signed URL so the browser uploads straight to Storage; the API never handles the file bytes. */
  async ticket(req: UploadRequest): Promise<UploadTicket> {
    await this.ensureBucket();
    const path = `dishes/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext[req.contentType]}`;
    const storage = this.supabase.get().storage.from(MENU_PHOTO_BUCKET);
    const { data, error } = await storage.createSignedUploadUrl(path);
    if (error || !data) throw error ?? new Error("Could not create upload URL");
    return { path, token: data.token, bucket: MENU_PHOTO_BUCKET, publicUrl: storage.getPublicUrl(path).data.publicUrl };
  }
}

@ApiTags("admin: uploads")
@ApiBearerAuth()
@Controller("admin/uploads")
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @RequirePermission("menu:edit")
  @Post("menu-photo")
  menuPhoto(@Body(new ZodPipe(uploadRequest)) req: UploadRequest) {
    return this.uploads.ticket(req);
  }
}

@Module({ controllers: [UploadsController], providers: [UploadsService, SupabaseAdmin] })
export class UploadsModule {}
