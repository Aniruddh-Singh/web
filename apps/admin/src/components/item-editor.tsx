"use client";

import type { AdminMenuCategory, AdminMenuItem, FoodType } from "@coffeecat/shared";
import { useState } from "react";
import { api } from "@/lib/api";
import { uploadDishPhoto } from "@/lib/photo-upload";
import { formError } from "@/lib/use-api";
import { FoodMark } from "./food-mark";
import { Button, Drawer, Field, inputClass, Notice, paiseToRupees, photoSrc, rupeesToPaise, Switch } from "./ui";

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

        <div className="flex items-center gap-4">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-muted">No photo</span>}
          </div>
          <div className="space-y-2">
            <label className={`inline-flex h-10 cursor-pointer items-center rounded-xl border border-line px-4 text-sm font-semibold hover:bg-surface ${busy === "photo" ? "opacity-50" : ""}`}>
              {busy === "photo" ? "Uploading…" : d.imageUrl ? "Replace photo" : "Upload photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!!busy} onChange={(e) => void pickPhoto(e.target.files?.[0])} />
            </label>
            {d.imageUrl && (
              <button type="button" onClick={() => set("imageUrl", null)} className="block text-sm font-semibold text-nonveg">
                Remove photo
              </button>
            )}
            <p className="text-xs text-muted">Only photos of this exact dish. Shrunk automatically.</p>
          </div>
        </div>

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
          <select className={inputClass} value={d.sectionId} onChange={(e) => set("sectionId", e.target.value)}>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
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
