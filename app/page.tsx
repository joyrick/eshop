"use client";

import { useEffect, useMemo, useState } from "react";

type CartItemId = "t-shirt" | "socks";

type Product = {
  id: CartItemId;
  name: string;
  unitAmount: number; // cents
};

type CartLine = {
  id: CartItemId;
  quantity: number;
};

const PRODUCTS: readonly Product[] = [
  { id: "t-shirt", name: "T-shirt", unitAmount: 1000 },
  { id: "socks", name: "Socks", unitAmount: 500 },
] as const;

const eur = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

function formatEur(cents: number) {
  return eur.format(cents / 100);
}

const CART_STORAGE_KEY = "demo_cart_v1";

export default function HomePage() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Hydrate cart from localStorage on first client render
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          const next: CartLine[] = parsed
            .filter((x: any) => x && (x.id === "t-shirt" || x.id === "socks"))
            .map((x: any) => ({ id: x.id as CartItemId, quantity: Number(x.quantity) }))
            .map((l) => ({ ...l, quantity: Math.max(0, Math.min(20, Math.floor(l.quantity || 0))) }))
            .filter((l) => l.quantity > 0);
          if (next.length > 0) {
            setCart(next);
            setIsHydrated(true);
            return;
          }
        }
      }
    } catch {
      // ignore corrupted storage
    }

    // Default cart
    setCart([
      { id: "t-shirt", quantity: 1 },
      { id: "socks", quantity: 2 },
    ]);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore quota / storage errors
    }
  }, [cart, isHydrated]);

  const getProduct = (id: CartItemId) => PRODUCTS.find((p) => p.id === id)!;

  const setQty = (id: CartItemId, nextQty: number) => {
    const qty = Math.max(0, Math.min(20, Math.floor(nextQty || 0)));
    setCart((prev) => {
      const exists = prev.find((l) => l.id === id);
      if (!exists && qty === 0) return prev;
      if (qty === 0) return prev.filter((l) => l.id !== id);
      if (!exists) return [...prev, { id, quantity: qty }];
      return prev.map((l) => (l.id === id ? { ...l, quantity: qty } : l));
    });
  };

  const addOne = (id: CartItemId) => {
    const line = cart.find((l) => l.id === id);
    setQty(id, (line?.quantity ?? 0) + 1);
  };

  const removeOne = (id: CartItemId) => {
    const line = cart.find((l) => l.id === id);
    setQty(id, (line?.quantity ?? 0) - 1);
  };

  const subtotal = cart.reduce((sum, line) => {
    const p = getProduct(line.id);
    return sum + p.unitAmount * line.quantity;
  }, 0);

  const hasItems = cart.some((l) => l.quantity > 0);

  const checkout = async () => {
    // Normalize just before sending (no zero qty, integers only)
    const normalized = cart
      .map((l) => ({ id: l.id, quantity: Math.max(0, Math.floor(l.quantity || 0)) }))
      .filter((l) => l.quantity > 0);

    if (normalized.length === 0) {
      alert("Cart is empty");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: normalized,
        }),
      });

      // Avoid crashing if the server returns HTML/text (e.g., 500 error page)
      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        const msg = data?.error || raw || `Checkout error (${res.status})`;
        alert(msg);
        return;
      }

      if (data?.url) {
        window.location.href = data.url; // redirect to Stripe-hosted Checkout
      } else {
        alert(data?.error || "Checkout error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 8 }}>Shop</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Demo cart with two products. Prices shown here are for display; Stripe charges using server-side Price IDs.
      </p>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 18 }}>
        {PRODUCTS.map((p) => {
          const line = cart.find((l) => l.id === p.id);
          const qty = line?.quantity ?? 0;
          return (
            <div key={p.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h3 style={{ margin: 0 }}>{p.name}</h3>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatEur(p.unitAmount)}</span>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
                <button
                  onClick={() => removeOne(p.id)}
                  disabled={isLoading || qty === 0}
                  style={{ padding: "6px 10px" }}
                >
                  −
                </button>
                <input
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQty(p.id, Number(e.target.value))}
                  disabled={isLoading}
                  style={{ width: 64, padding: "6px 8px" }}
                />
                <button
                  onClick={() => addOne(p.id)}
                  disabled={isLoading || qty >= 20}
                  style={{ padding: "6px 10px" }}
                >
                  +
                </button>

                <button
                  onClick={() => setQty(p.id, 0)}
                  disabled={isLoading || qty === 0}
                  style={{ marginLeft: "auto", padding: "6px 10px" }}
                >
                  Remove
                </button>
              </div>

              <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
                Line total: <b>{formatEur(p.unitAmount * qty)}</b>
              </div>
            </div>
          );
        })}
      </section>

      <section style={{ marginTop: 22, borderTop: "1px solid #eef2f7", paddingTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span>Subtotal</span>
          <b style={{ fontVariantNumeric: "tabular-nums" }}>{formatEur(subtotal)}</b>
        </div>

        <button
          onClick={checkout}
          disabled={isLoading || !hasItems}
          style={{ padding: "10px 14px", width: "100%" }}
        >
          {isLoading ? "Redirecting…" : "Checkout (Stripe Hosted)"}
        </button>

        <p style={{ marginTop: 16, opacity: 0.8, fontSize: 14, cursor: "default" }}>
          Tip: Apple Pay / Google Pay appear automatically on supported devices once enabled in Stripe.
        </p>
      </section>
    </main>
  );
}