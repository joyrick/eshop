"use client";

import { useEffect, useMemo, useState } from "react";

type CartItemId = "t-shirt" | "socks";

type Product = {
  id: CartItemId;
  name: string;
  description: string;
  unitAmount: number; // cents
};

type CartLine = {
  id: CartItemId;
  quantity: number;
};

const PRODUCTS: readonly Product[] = [
  {
    id: "t-shirt",
    name: "T-shirt",
    description: "Soft, premium cotton tee. Minimal design. Built for everyday wear.",
    unitAmount: 1000,
  },
  {
    id: "socks",
    name: "Socks",
    description: "Comfortable crew socks with a snug fit. Perfect everyday pair.",
    unitAmount: 500,
  },
] as const;

const eur = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

function formatEur(cents: number) {
  return eur.format(cents / 100);
}

const CART_STORAGE_KEY = "demo_cart_v2";

function clampQty(n: number) {
  return Math.max(0, Math.min(20, Math.floor(n || 0)));
}

export default function HomePage() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const getProduct = (id: CartItemId) => PRODUCTS.find((p) => p.id === id)!;

  // Hydrate cart from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          const next: CartLine[] = parsed
            .filter((x: any) => x && (x.id === "t-shirt" || x.id === "socks"))
            .map((x: any) => ({ id: x.id as CartItemId, quantity: Number(x.quantity) }))
            .map((l) => ({ ...l, quantity: clampQty(l.quantity) }))
            .filter((l) => l.quantity > 0);
          setCart(next);
        }
      }
    } catch {
      // ignore
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart, isHydrated]);

  const setQty = (id: CartItemId, nextQty: number) => {
    const qty = clampQty(nextQty);
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
    setIsCartOpen(true);
  };

  const removeOne = (id: CartItemId) => {
    const line = cart.find((l) => l.id === id);
    setQty(id, (line?.quantity ?? 0) - 1);
  };

  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, line) => {
      const p = getProduct(line.id);
      return sum + p.unitAmount * line.quantity;
    }, 0);
  }, [cart]);

  const normalizedForCheckout = useMemo(() => {
    return cart
      .map((l) => ({ id: l.id, quantity: clampQty(l.quantity) }))
      .filter((l) => l.quantity > 0);
  }, [cart]);

  const checkout = async () => {
    if (normalizedForCheckout.length === 0) {
      setIsCartOpen(true);
      alert("Cart is empty");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: normalizedForCheckout }),
      });

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
        window.location.href = data.url;
      } else {
        alert(data?.error || "Checkout error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // One-page template: single primary product section + cart sidebar
  const mainProduct = getProduct("t-shirt");

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      {/* Top bar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #eef2f7",
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 10, height: 10, background: "#e11d48", borderRadius: 3 }} />
            <strong style={{ letterSpacing: 0.5 }}>FRAME X</strong>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              padding: "8px 12px",
              borderRadius: 10,
              cursor: "pointer",
            }}
            aria-label="Open cart"
          >
            Cart ({cartCount})
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 16px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 28,
            alignItems: "start",
          }}
        >
          {/* Product image */}
          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid #eef2f7",
              boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
              background: "#f8fafc",
              minHeight: 520,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src="/next.svg"
              alt={mainProduct.name}
              style={{ width: "66%", height: "auto", opacity: 0.9 }}
            />
          </div>

          {/* Product details */}
          <section style={{ paddingTop: 8 }}>
            <div style={{ fontSize: 12, letterSpacing: 1.4, color: "#ef4444", fontWeight: 700 }}>
              LIMITED DROP
            </div>
            <h1 style={{ margin: "10px 0 8px", fontSize: 38, lineHeight: 1.08 }}>
              {mainProduct.name}
            </h1>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
              {mainProduct.description}
            </p>

            <div style={{ marginTop: 16, fontSize: 22, fontWeight: 700 }}>
              {formatEur(mainProduct.unitAmount)}
            </div>

            <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => addOne("t-shirt")}
                disabled={isLoading}
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  padding: "12px 14px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontWeight: 700,
                  minWidth: 180,
                }}
              >
                Add to cart
              </button>

              <button
                onClick={() => setIsCartOpen(true)}
                disabled={isLoading}
                style={{
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  padding: "12px 14px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontWeight: 700,
                  minWidth: 180,
                }}
              >
                View cart
              </button>
            </div>

            {/* Optional second item */}
            <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid #eef2f7" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h3 style={{ margin: 0 }}>Add socks</h3>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatEur(getProduct("socks").unitAmount)}</span>
              </div>
              <p style={{ marginTop: 6, color: "#64748b", lineHeight: 1.6 }}>
                {getProduct("socks").description}
              </p>
              <button
                onClick={() => addOne("socks")}
                disabled={isLoading}
                style={{
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  padding: "10px 12px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Add socks to cart
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ marginTop: 40, background: "#0f172a", color: "#e2e8f0" }}>
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            padding: "40px 16px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 24,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 10, height: 10, background: "#e11d48", borderRadius: 3 }} />
              <strong style={{ letterSpacing: 0.5, color: "#fff" }}>FRAME X</strong>
            </div>
            <p style={{ marginTop: 12, lineHeight: 1.7, color: "#cbd5e1" }}>
              Minimal one-page checkout demo powered by Stripe Checkout. Orders are confirmed via webhook.
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 800, color: "#fff", marginBottom: 10, letterSpacing: 0.3 }}>Info</div>
            <div style={{ display: "grid", gap: 8, color: "#cbd5e1" }}>
              <a href="#" style={{ color: "inherit", textDecoration: "none" }}>About</a>
              <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Terms</a>
              <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Contact</a>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 800, color: "#fff", marginBottom: 10, letterSpacing: 0.3 }}>Products</div>
            <div style={{ display: "grid", gap: 8, color: "#cbd5e1" }}>
              <button
                onClick={() => {
                  addOne("t-shirt");
                  setIsCartOpen(true);
                }}
                disabled={isLoading}
                style={{
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  color: "inherit",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                T-shirt
              </button>
              <button
                onClick={() => {
                  addOne("socks");
                  setIsCartOpen(true);
                }}
                disabled={isLoading}
                style={{
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  color: "inherit",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                Socks
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 800, color: "#fff", marginBottom: 10, letterSpacing: 0.3 }}>Contact</div>
            <div style={{ display: "grid", gap: 8, color: "#cbd5e1" }}>
              <div>
                <span style={{ opacity: 0.8 }}>Email:</span> info@example.com
              </div>
              <div>
                <span style={{ opacity: 0.8 }}>Phone:</span> +421 000 000 000
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <a href="#" style={{ color: "#e2e8f0", textDecoration: "none", border: "1px solid rgba(226,232,240,0.25)", padding: "6px 10px", borderRadius: 10 }}>
                  FB
                </a>
                <a href="#" style={{ color: "#e2e8f0", textDecoration: "none", border: "1px solid rgba(226,232,240,0.25)", padding: "6px 10px", borderRadius: 10 }}>
                  IG
                </a>
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(226,232,240,0.12)" }}>
          <div
            style={{
              maxWidth: 1080,
              margin: "0 auto",
              padding: "14px 16px",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            <div>© {new Date().getFullYear()} Frame X. All rights reserved.</div>
            <div>Payments handled by Stripe Checkout.</div>
          </div>
        </div>
      </footer>

      {/* Sidebar cart */}
      <div
        aria-hidden={!isCartOpen}
        onClick={() => setIsCartOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: isCartOpen ? "rgba(0,0,0,0.35)" : "transparent",
          pointerEvents: isCartOpen ? "auto" : "none",
          transition: "background 200ms ease",
          zIndex: 50,
        }}
      />

      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: "min(420px, 92vw)",
          background: "#fff",
          borderLeft: "1px solid #eef2f7",
          boxShadow: "-20px 0 50px rgba(0,0,0,0.12)",
          transform: isCartOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 220ms ease",
          zIndex: 60,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <strong style={{ fontSize: 16 }}>Cart</strong>
          <button
            onClick={() => setIsCartOpen(false)}
            style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 18 }}
            aria-label="Close cart"
          >
            ×
          </button>
        </div>

        <div style={{ padding: "0 16px 16px", overflow: "auto", flex: 1 }}>
          {normalizedForCheckout.length === 0 ? (
            <div style={{ padding: 12, background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 12, color: "#475569" }}>
              Cart is empty.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {normalizedForCheckout.map((line) => {
                const p = getProduct(line.id);
                return (
                  <div
                    key={line.id}
                    style={{
                      border: "1px solid #eef2f7",
                      borderRadius: 14,
                      padding: 12,
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 12,
                        background: "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      {p.id === "t-shirt" ? "T" : "S"}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{p.name}</div>
                          <div style={{ opacity: 0.7, fontSize: 13 }}>{formatEur(p.unitAmount)}</div>
                        </div>
                        <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                          {formatEur(p.unitAmount * line.quantity)}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                        <button
                          onClick={() => removeOne(line.id)}
                          disabled={isLoading}
                          style={{ border: "1px solid #e5e7eb", background: "#fff", padding: "6px 10px", borderRadius: 10, cursor: "pointer" }}
                        >
                          −
                        </button>
                        <input
                          inputMode="numeric"
                          value={line.quantity}
                          onChange={(e) => setQty(line.id, Number(e.target.value))}
                          disabled={isLoading}
                          style={{ width: 70, padding: "7px 9px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                        />
                        <button
                          onClick={() => addOne(line.id)}
                          disabled={isLoading || line.quantity >= 20}
                          style={{ border: "1px solid #e5e7eb", background: "#fff", padding: "6px 10px", borderRadius: 10, cursor: "pointer" }}
                        >
                          +
                        </button>

                        <button
                          onClick={() => setQty(line.id, 0)}
                          disabled={isLoading}
                          style={{ marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer", color: "#ef4444", fontWeight: 700 }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #eef2f7", padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ color: "#475569" }}>Subtotal</span>
            <strong style={{ fontVariantNumeric: "tabular-nums" }}>{formatEur(subtotal)}</strong>
          </div>

          <button
            onClick={checkout}
            disabled={isLoading || normalizedForCheckout.length === 0}
            style={{
              width: "100%",
              background: "#111827",
              color: "#fff",
              border: "none",
              padding: "12px 14px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            {isLoading ? "Redirecting…" : "Pay (Stripe Checkout)"}
          </button>

          <p style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
            Stripe charges using server-side Price IDs.
          </p>
        </div>
      </aside>

      {/* Basic responsive tweak */}
      <style>{`
        @media (max-width: 900px) {
          main > div {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}