"use client";

import type { AdminMenuCategory, AdminMenuItem, FoodType } from "@coffeecat/shared";
import { useState } from "react";
import { api } from "@/lib/api";
import { uploadDishPhoto } from "@/lib/photo-upload";
import { formError } from "@/lib/use-api";
import { FoodMark } from "./food-mark";
import { Button, Drawer, Field, inputClass, Notice, paiseToRupees, photoSrc, rupeesToPaise, Select, Switch } from "./ui";

type Draft = {
  name: string;
  description: string;
  foodType: FoodType;
  price: string;
  quantityLabel: string;
  note: string;
  isBestseller: boolean;
  isAvailable: boolean;
  imageUrl: string | null;
  sectionId: string;
};

/** Create or edit one dish, including its photo. */
export function ItemEditor({
  item,
  sectionId,
  menu,
  onClose,
  onSaved,
}: {
  item: AdminMenuItem | null;
  sectionId: string;
  menu: AdminMenuCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [d, setD] = useState<Draft>({
    name: item?.name ?? "",
    description: item?.description ?? "",
    foodType: item?.foodType ?? "veg",
    price: paiseToRupees(item?.pricePaise),
    quantityLabel: item?.quantityLabel ?? "",
    note: item?.note ?? "",
    isBestseller: item?.isBestseller ?? false,
    isAvailable: item?.isAvailable ?? true,
    imageUrl: item?.imageUrl ?? null,
    sectionId,
  });
  const [busy, setBusy] = useState<"save" | "photo" | "archive" | null>(null);
  const [error, setError] = useState<string>();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [confirmArchive, setConfirmArchive] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setBusy("save");
    setError(undefined);
    setFields({});
    const body = {
      name: d.name,
      description: d.description,
      foodType: d.foodType,
      pricePaise: rupeesToPaise(d.price),
      quantityLabel: d.quantityLabel || null,
      note: d.note || null,
      isBestseller: d.isBestseller,
      isAvailable: d.isAvailable,
      imageUrl: d.imageUrl,
      sectionId: d.sectionId,
    };
    try {
      if (item) await api(`/admin/menu/items/${item.id}`, { method: "PATCH", json: body });
      else await api(`/admin/menu/items`, { method: "POST", json: body });
      onSaved();
    } catch (e) {
      const f = formError(e);
      setError(f.message);
      setFields(f.fields);
    } finally {
      setBusy(null);
    }
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy("photo");
    setError(undefined);
    try {
      set("imageUrl", await uploadDishPhoto(file));
    } catch (e) {
      setError((e as Error).message || formError(e).message);
    } finally {
      setBusy(null);
    }
  };

  const archive = async () => {
    if (!item) return;
    setBusy("archive");
    try {
      await api(`/admin/menu/items/${item.id}/archive`, { method: "POST" });
      onSaved();
    } catch (e) {
      setError(formError(e).message);
      setBusy(null);
    }
  };

  const sections = menu.flatMap((c) => c.sections.map((s) => ({ id: s.id, label: `${c.name} › ${s.name}` })));
  const src = photoSrc(d.imageUrl);

  return (
    <Drawer
      title={item ? `Edit ${item.name}` : "Add a dish"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button onClick={save} disabled={!!busy} className="flex-1">
            {busy === "save" ? "Saving…" : item ? "Save changes" : "Add dish"}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {error && <Notice tone="error">{error}</Notice>}

        <PhotoPicker
          src={src}
          hasPhoto={!!d.imageUrl}
          uploading={busy === "photo"}
          disabled={!!busy}
          onFile={(f) => void pickPhoto(f)}
          onLink={(url) => {
            setError(undefined);
            set("imageUrl", url);
          }}
          onRemove={() => set("imageUrl", null)}
          onError={setError}
        />

        <Field label="Name" error={fields.name}>
          <input className={inputClass} value={d.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!fields.name} />
        </Field>
        <Field label="Description" hint="(one or two plain lines)" error={fields.description}>
          <textarea className={`${inputClass} h-auto py-2`} rows={2} value={d.description} onChange={(e) => set("description", e.target.value)} />
        </Field>

        <fieldset>
          <legend className="text-sm font-medium">Type</legend>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {(["veg", "egg", "non_veg"] as const).map((t) => (
              <label key={t} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${d.foodType === t ? "border-roast bg-foam" : "border-line"}`}>
                <input type="radio" name="foodType" className="sr-only" checked={d.foodType === t} onChange={() => set("foodType", t)} />
                <FoodMark type={t} />
                {t === "veg" ? "Veg" : t === "egg" ? "Egg" : "Non-veg"}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₹)" error={fields.pricePaise}>
            <input className={inputClass} inputMode="decimal" value={d.price} onChange={(e) => set("price", e.target.value.replace(/[^\d.]/g, ""))} aria-invalid={!!fields.pricePaise} />
          </Field>
          <Field label="Size" hint="(optional)">
            <input className={inputClass} value={d.quantityLabel} onChange={(e) => set("quantityLabel", e.target.value)} placeholder="300 ml, 6 pcs" />
          </Field>
        </div>

        <Field label="Section">
          <Select value={d.sectionId} onChange={(e) => set("sectionId", e.target.value)}>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Note for customers" hint="(optional)">
          <input className={inputClass} value={d.note} onChange={(e) => set("note", e.target.value)} placeholder="Eggless" />
        </Field>

        <div className="space-y-3 rounded-2xl bg-surface p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">In stock</span>
            <Switch checked={d.isAvailable} onChange={(v) => set("isAvailable", v)} label="In stock" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">Bestseller tag</span>
            <Switch checked={d.isBestseller} onChange={(v) => set("isBestseller", v)} label="Bestseller tag" />
          </div>
        </div>

        {item &&
          (confirmArchive ? (
            <div className="space-y-2 rounded-xl border border-nonveg/30 p-3">
              <p className="text-sm">Remove {item.name} from the menu? Past orders keep their record. To hide it for a day, switch off &ldquo;In stock&rdquo; instead.</p>
              <div className="flex gap-2">
                <Button variant="danger" onClick={archive} disabled={!!busy}>
                  {busy === "archive" ? "Removing…" : "Remove dish"}
                </Button>
                <Button variant="secondary" onClick={() => setConfirmArchive(false)}>
                  Keep it
                </Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmArchive(true)} className="text-sm font-semibold text-nonveg">
              Remove from menu…
            </button>
          ))}
      </div>
    </Drawer>
  );
}

/** Loads an image URL in the browser; resolves if it's a real, reachable image. */
function probeImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = window.setTimeout(() => reject(new Error("timeout")), 10_000);
    img.onload = () => (window.clearTimeout(timer), img.naturalWidth ? resolve() : reject(new Error("empty")));
    img.onerror = () => (window.clearTimeout(timer), reject(new Error("load")));
    img.src = url;
  });
}

/** Dish photo: upload a file (button or drag and drop) or paste a link to an image. */
function PhotoPicker({
  src,
  hasPhoto,
  uploading,
  disabled,
  onFile,
  onLink,
  onRemove,
  onError,
}: {
  src: string | null;
  hasPhoto: boolean;
  uploading: boolean;
  disabled: boolean;
  onFile: (f: File | undefined) => void;
  onLink: (url: string) => void;
  onRemove: () => void;
  onError: (msg: string | undefined) => void;
}) {
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [link, setLink] = useState("");
  const [checking, setChecking] = useState(false);
  const [dragging, setDragging] = useState(false);

  const applyLink = async () => {
    const url = link.trim();
    if (!/^https:\/\/\S+$/i.test(url)) return onError("Paste a full image link starting with https://");
    setChecking(true);
    try {
      await probeImage(url);
      onLink(url);
      setLink("");
    } catch {
      onError("Couldn't load an image from that link. Right-click the photo and choose “Copy image address”, then paste that.");
    } finally {
      setChecking(false);
    }
  };

  const tab = (m: "upload" | "link", label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => setMode(m)}
      className={`h-9 flex-1 rounded-lg text-sm font-semibold transition-colors ${mode === m ? "bg-paper text-ink shadow-sm" : "text-muted hover:text-ink"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div
        onDragOver={(e) => (e.preventDefault(), setDragging(true))}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) onFile(e.dataTransfer.files?.[0]);
        }}
        className={`relative grid h-32 w-32 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${dragging ? "border-roast bg-foam" : src ? "border-transparent" : "border-line bg-surface"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt="Dish photo preview" className="h-full w-full object-cover" /> : (
          <span className="px-3 text-center text-xs text-muted">{uploading ? "Uploading…" : "Drop a photo here"}</span>
        )}
        {uploading && src && <span className="absolute inset-0 grid place-items-center bg-ink/50 text-xs font-semibold text-paper">Uploading…</span>}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div role="tablist" aria-label="Photo source" className="flex gap-1 rounded-xl bg-surface p-1">
          {tab("upload", "Upload")}
          {tab("link", "Paste link")}
        </div>

        {mode === "upload" ? (
          <label className={`flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-paper px-4 text-sm font-semibold transition-colors hover:border-mocha hover:bg-surface ${disabled ? "pointer-events-none opacity-50" : ""}`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </svg>
            {uploading ? "Uploading…" : hasPhoto ? "Choose another photo" : "Choose a photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={disabled} onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        ) : (
          <form className="flex gap-2" onSubmit={(e) => (e.preventDefault(), void applyLink())}>
            <label className="sr-only" htmlFor="photo-link">
              Image link
            </label>
            <input id="photo-link" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…/photo.jpg" className={`${inputClass} mt-0 min-w-0 flex-1`} />
            <Button type="submit" variant="secondary" disabled={checking || !link.trim()} className="shrink-0">
              {checking ? "Checking…" : "Use link"}
            </Button>
          </form>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted">{mode === "upload" ? "JPG, PNG or WebP. Shrunk automatically." : "Use a link to the image itself, not a web page."} Only photos of this exact dish.</p>
          {hasPhoto && (
            <button type="button" onClick={onRemove} className="text-sm font-semibold text-nonveg hover:underline">
              Remove photo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
