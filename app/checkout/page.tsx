"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CartItemId = "ferrari_key_frame" | "porsche_key_frame";

type Product = {
  id: CartItemId;
  name: string;
  unitAmount: number; // cents
};

type CartLine = { id: CartItemId; quantity: number };

type DeliveryId = "packeta" | "courier" | "pickup";

type DeliveryOption = {
  id: DeliveryId;
  title: string;
  price: number; // cents
  note: string;
};

const PRODUCTS: readonly Product[] = [
  { id: "ferrari_key_frame", name: "Ferrari key in frame", unitAmount: 2999 },
  { id: "porsche_key_frame", name: "Porsche key in frame", unitAmount: 1999 },
] as const;

const DELIVERY: readonly DeliveryOption[] = [
  { id: "packeta", title: "Packeta (Z-BOX) / výdajné miesto", price: 390, note: "Výber miesta doplníme neskôr." },
  { id: "courier", title: "Kuriér na adresu", price: 490, note: "Doručenie na zadanú adresu." },
  { id: "pickup", title: "Osobný odber", price: 0, note: "Dohodneme si odber e-mailom/telefonicky." },
] as const;

const eur = new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" });
const formatEur = (cents: number) => eur.format(cents / 100);

const CART_STORAGE_KEY = "demo_cart_v2";

function clampQty(n: number) {
  return Math.max(0, Math.min(20, Math.floor(n || 0)));
}

function getProduct(id: CartItemId) {
  return PRODUCTS.find((p) => p.id === id)!;
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [deliveryId, setDeliveryId] = useState<DeliveryId | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          const next: CartLine[] = parsed
            .filter((x: any) => x && (x.id === "ferrari_key_frame" || x.id === "porsche_key_frame"))
            .map((x: any) => ({ id: x.id as CartItemId, quantity: clampQty(Number(x.quantity)) }))
            .filter((l) => l.quantity > 0);
          setCart(next);
        }
      }
    } catch {
      // ignore
    }
    setIsHydrated(true);
  }, []);

  const normalizedItems = useMemo(() => {
    return cart.map((l) => ({ id: l.id, quantity: clampQty(l.quantity) })).filter((l) => l.quantity > 0);
  }, [cart]);

  const itemsSubtotal = useMemo(() => {
    return normalizedItems.reduce((sum, l) => sum + getProduct(l.id).unitAmount * l.quantity, 0);
  }, [normalizedItems]);

  const selectedDelivery = useMemo(() => {
    return deliveryId ? DELIVERY.find((d) => d.id === deliveryId) ?? null : null;
  }, [deliveryId]);

  const deliveryPrice = selectedDelivery?.price ?? 0;
  const total = itemsSubtotal + deliveryPrice;

  const canPay = isHydrated && normalizedItems.length > 0 && Boolean(deliveryId);

  const pay = async () => {
    if (!canPay || !deliveryId) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: normalizedItems, deliveryId }),
      });

      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        alert(data?.error || raw || `Checkout error (${res.status})`);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      alert(data?.error || "Checkout error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 980, margin: "28px auto", fontFamily: "system-ui", padding: "0 16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Doprava</h1>
        <Link href="/" style={{ textDecoration: "underline" }}>
          Späť do obchodu
        </Link>
      </div>

      {isHydrated && normalizedItems.length === 0 ? (
        <div style={{ marginTop: 14, padding: 12, border: "1px solid #e5e7eb", background: "#f8fafc", borderRadius: 12 }}>
          Košík je prázdny.
        </div>
      ) : null}

      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 18, alignItems: "start" }}>
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>1) Spôsob doručenia</h2>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {DELIVERY.map((d) => {
              const active = deliveryId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDeliveryId(d.id)}
                  disabled={isLoading}
                  style={{
                    textAlign: "left",
                    border: active ? "2px solid #111827" : "1px solid #e5e7eb",
                    background: active ? "#f8fafc" : "#fff",
                    borderRadius: 14,
                    padding: 12,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <strong>{d.title}</strong>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatEur(d.price)}</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>{d.note}</div>
                </button>
              );
            })}
          </div>

          <p style={{ margin: "14px 0 0", fontSize: 13, opacity: 0.75 }}>
            Doručovaciu adresu zadáte priamo v Stripe Checkout.
          </p>
        </section>

        <aside style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, background: "#fff" }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Súhrn objednávky</h2>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {normalizedItems.map((l) => {
              const p = getProduct(l.id);
              return (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ maxWidth: 340 }}>
                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 13, opacity: 0.7 }}>
                      {l.quantity} × {formatEur(p.unitAmount)}
                    </div>
                  </div>
                  <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{formatEur(p.unitAmount * l.quantity)}</div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 14, borderTop: "1px dashed #e5e7eb", paddingTop: 12, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ opacity: 0.8 }}>Tovar</span>
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>{formatEur(itemsSubtotal)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ opacity: 0.8 }}>Doprava</span>
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>{formatEur(deliveryPrice)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16 }}>
              <span style={{ opacity: 0.9, fontWeight: 800 }}>Spolu</span>
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>{formatEur(total)}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={pay}
            disabled={!canPay || isLoading}
            style={{
              marginTop: 14,
              width: "100%",
              borderRadius: 12,
              padding: "12px 14px",
              background: !canPay || isLoading ? "#e5e7eb" : "#111827",
              color: !canPay || isLoading ? "#6b7280" : "#fff",
              border: "none",
              cursor: !canPay || isLoading ? "not-allowed" : "pointer",
              fontWeight: 800,
            }}
          >
            {isLoading ? "Presmerovanie…" : "Pokračovať na platbu (Stripe)"}
          </button>

          <p style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            V Stripe Checkout zadáte doručovaciu adresu a kontaktné údaje.
          </p>
        </aside>
      </div>

      <style>{`
        @media (max-width: 900px) {
          main > div:last-child {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
