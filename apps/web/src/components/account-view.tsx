"use client";

import { formatINR, statusLabel, type Address, type OrderView } from "@coffeecat/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api-client";
import { actions } from "@/lib/store";
import { useCustomer } from "./customer-auth";
import { useMenu } from "./menu-provider";
import { PageSkeleton } from "./empty-state";

const field = "mt-1 h-11 w-full rounded-xl border border-line bg-paper px-3 text-[16px] focus:border-roast focus:outline-none";

export function AccountView() {
  const router = useRouter();
  const menu = useMenu();
  const { session, profile, refreshProfile, signOut } = useCustomer();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [orders, setOrders] = useState<OrderView[] | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [newAddr, setNewAddr] = useState<{ label: string; line: string; landmark: string } | null>(null);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<string>();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Not logged in: send to login. (Skipped while logging out, which goes home instead.)
    if (session === null && !leaving) router.replace("/login?next=/account");
  }, [session, router, leaving]);

  useEffect(() => {
    if (!session) return;
    const t = setTimeout(async () => {
      try {
        const [a, o] = await Promise.all([apiFetch<Address[]>("/me/addresses"), apiFetch<OrderView[]>("/me/orders")]);
        setAddresses(a);
        setOrders(o);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Couldn't load your account.");
      }
    }, 0);
    return () => clearTimeout(t);
  }, [session]);

  if (!session) return <PageSkeleton />;

  const act = async (fn: () => Promise<Address[]>) => {
    setError(undefined);
    try {
      setAddresses(await fn());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "That didn't save. Try again.");
    }
  };

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/me/profile", { method: "PATCH", json: { name } });
      await refreshProfile();
      setName(null);
      setSaved("Name saved.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "That didn't save.");
    }
  };

  const reorder = (o: OrderView) => {
    let added = 0;
    for (const l of o.lines) {
      const item = l.itemId ? menu.getItem(l.itemId) : undefined;
      if (item?.available) {
        actions.setQty(item.id, l.qty);
        added++;
      }
    }
    if (added) router.push("/checkout");
    else setError("None of those dishes are available right now.");
  };

  const who = profile?.phone ? `+91 ${profile.phone}` : (profile?.email ?? session.user.email ?? "");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{profile?.name ? `Hi, ${profile.name.split(" ")[0]}` : "Your account"}</h1>
          <p className="mt-1 text-muted">{who}</p>
        </div>
        <button type="button" onClick={async () => (setLeaving(true), router.push("/"), await signOut())} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:bg-surface">
          Log out
        </button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#fbeceb] px-4 py-3 text-sm text-nonveg">{error}</p>}
      {saved && <p role="status" className="mt-4 rounded-xl bg-[#e7f5ec] px-4 py-3 text-sm text-ok">{saved}</p>}

      <section className="mt-8 rounded-2xl border border-line p-5" aria-labelledby="profile">
        <h2 id="profile" className="font-semibold">Your name</h2>
        <form onSubmit={saveName} className="mt-2 flex gap-2">
          <label className="flex-1">
            <span className="sr-only">Name</span>
            <input className={`${field} mt-0`} value={name ?? profile?.name ?? ""} onChange={(e) => setName(e.target.value)} placeholder="Shown to the cafe on your orders" />
          </label>
          <button type="submit" disabled={name === null} className="rounded-xl bg-roast px-5 font-semibold text-paper disabled:opacity-40">Save</button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-line p-5" aria-labelledby="addresses">
        <div className="flex items-center justify-between">
          <h2 id="addresses" className="font-semibold">Saved addresses</h2>
          {!newAddr && <button type="button" onClick={() => setNewAddr({ label: "Home", line: "", landmark: "" })} className="text-sm font-semibold text-roast">+ Add address</button>}
        </div>
        <ul className="mt-3 space-y-2">
          {addresses?.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 rounded-xl bg-surface p-3">
              <span>
                <span className="block font-semibold">
                  {a.label} {a.isDefault && <span className="ml-1 rounded bg-paper px-1.5 py-0.5 text-xs text-ok">Default</span>}
                </span>
                <span className="block text-sm text-muted">{a.line}{a.landmark ? `, near ${a.landmark}` : ""}</span>
              </span>
              <span className="flex shrink-0 gap-3 text-sm font-semibold">
                {!a.isDefault && <button type="button" onClick={() => act(() => apiFetch(`/me/addresses/${a.id}`, { method: "PATCH", json: { isDefault: true } }))} className="text-roast">Make default</button>}
                <button type="button" onClick={() => act(() => apiFetch(`/me/addresses/${a.id}`, { method: "DELETE" }))} className="text-nonveg">Remove</button>
              </span>
            </li>
          ))}
          {addresses?.length === 0 && !newAddr && <li className="text-sm text-muted">No saved addresses yet. They make checkout one tap.</li>}
        </ul>
        {newAddr && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(() => apiFetch("/me/addresses", { json: { label: newAddr.label, line: newAddr.line, landmark: newAddr.landmark || null } })).then(() => setNewAddr(null));
            }}
            className="mt-3 space-y-3 rounded-xl border border-line p-4"
          >
            <label className="block text-sm font-medium">Label<input className={field} value={newAddr.label} onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })} placeholder="Home, Work" /></label>
            <label className="block text-sm font-medium">Address<textarea className={`${field} h-auto py-2`} rows={2} value={newAddr.line} onChange={(e) => setNewAddr({ ...newAddr, line: e.target.value })} placeholder="Flat, tower, society, sector" /></label>
            <label className="block text-sm font-medium">Landmark <span className="font-normal text-muted">(optional)</span><input className={field} value={newAddr.landmark} onChange={(e) => setNewAddr({ ...newAddr, landmark: e.target.value })} /></label>
            <div className="flex gap-2">
              <button type="submit" className="h-11 rounded-xl bg-roast px-5 font-semibold text-paper">Save address</button>
              <button type="button" onClick={() => setNewAddr(null)} className="h-11 rounded-xl border border-line px-5 font-semibold">Cancel</button>
            </div>
          </form>
        )}
      </section>

      <section className="mt-6" aria-labelledby="history">
        <h2 id="history" className="font-display text-xl font-bold">Your orders</h2>
        {!orders ? (
          <div className="skeleton mt-3 h-24" />
        ) : orders.length === 0 ? (
          <p className="mt-2 text-muted">
            No orders on this account yet. <Link href="/menu" className="font-semibold text-roast underline">Browse the menu</Link>
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
            {orders.map((o) => (
              <li key={o.code} className="flex flex-wrap items-center gap-3 p-4">
                <Link href={`/order?code=${o.code}`} className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">#{o.code} · {statusLabel(o.status, o.mode)}</span>
                  <span className="block truncate text-sm text-muted">{o.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}</span>
                  <span className="block text-xs text-muted">{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {formatINR(o.bill.total)}</span>
                </Link>
                <button type="button" onClick={() => reorder(o)} className="rounded-xl border border-roast px-4 py-2 text-sm font-semibold text-roast hover:bg-foam">Order again</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
