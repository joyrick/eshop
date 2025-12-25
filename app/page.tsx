"use client";

import { useEffect, useMemo, useState } from "react";

type CartItemId = "ferrari_key_frame" | "porsche_key_frame";

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
    id: "ferrari_key_frame",
    name: "Ferrari kľúč v ozdobnom ráme",
    description: "Prémiový darček - ferrari kľúč v elegantnom ráme, ideálny pre cieľavedomých ľudí a fanúšikov značky",
    unitAmount: 2999,
  },
  {
    id: "porsche_key_frame",
    name: "Porsche kľúč v ozdobnom ráme",
    description: "Čistý, minimalistický rámik na kľúč - ideálny pre fanúšikov značky Porsche",
    unitAmount: 1999,
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
  const [selectedProductId, setSelectedProductId] = useState<CartItemId>("ferrari_key_frame");

  const getProduct = (id: CartItemId) => PRODUCTS.find((p) => p.id === id)!;

  // Hydrate cart from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          const next: CartLine[] = parsed
            .filter((x: any) => x && (x.id === "ferrari_key_frame" || x.id === "porsche_key_frame"))
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

  // NOTE: Checkout is handled via /checkout (delivery + address step) before Stripe.

  // One-page template: product gallery selector + cart sidebar
  const mainProduct = getProduct(selectedProductId);

  const MAIN_IMAGES: Record<CartItemId, string> = {
    ferrari_key_frame: "/gallery/ferrari_key.png",
    porsche_key_frame: "/gallery/porsche-frame.png",
  };

  const thumbStyle = (active: boolean): React.CSSProperties => ({
    width: 92,
    height: 70,
    borderRadius: 12,
    border: active ? "2px solid #ef4444" : "1px solid #e5e7eb",
    overflow: "hidden",
    background: "#f8fafc",
    cursor: "pointer",
    boxShadow: active ? "0 0 0 3px rgba(239,68,68,0.15)" : "none",
  });

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
            Košík ({cartCount})
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 16px", minHeight: "calc(100vh - 60px)" }}>
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
              src={MAIN_IMAGES[selectedProductId]}
              alt={mainProduct.name}
              style={{
                width: "66%",
                height: "auto",
                maxHeight: "72%",
                objectFit: "contain",
                opacity: 0.98,
              }}
            />
          </div>

          {/* Product details */}
          <section style={{ paddingTop: 8 }}>
            <div style={{ fontSize: 12, letterSpacing: 1.4, color: "#ef4444", fontWeight: 700 }}>
              DARČEKOVÝ RÁMČEK
            </div>
            <h1 style={{ margin: "10px 0 8px", fontSize: 38, lineHeight: 1.08 }}>{mainProduct.name}</h1>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>{mainProduct.description}</p>

            <div style={{ marginTop: 14, fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
              {formatEur(mainProduct.unitAmount)}
            </div>

            <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => addOne(selectedProductId)}
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
                Pridať do košíka
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
                Zobraziť košík
              </button>
            </div>

            {/* Gallery selector */}
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #eef2f7" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>Galéria – kliknite pre prepnutie edície</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setSelectedProductId("ferrari_key_frame")}
                  disabled={isLoading}
                  style={{ border: "none", background: "transparent", padding: 0 }}
                  aria-label="Select Ferrari edition"
                >
                  <div style={thumbStyle(selectedProductId === "ferrari_key_frame")}>
                    <img
                      src="/gallery/ferrari_key.png"
                      alt="Ferrari key in frame thumbnail"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", textAlign: "center" }}>
                    Ferrari<br />
                    <span style={{ fontVariantNumeric: "tabular-nums", color: "#0f172a", fontWeight: 700 }}>
                      {formatEur(getProduct("ferrari_key_frame").unitAmount)}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProductId("porsche_key_frame")}
                  disabled={isLoading}
                  style={{ border: "none", background: "transparent", padding: 0 }}
                  aria-label="Select Porsche edition"
                >
                  <div style={thumbStyle(selectedProductId === "porsche_key_frame")}>
                    <img
                      src="/gallery/porsche-frame.png"
                      alt="Porsche key in frame thumbnail"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", textAlign: "center" }}>
                    Porsche<br />
                    <span style={{ fontVariantNumeric: "tabular-nums", color: "#0f172a", fontWeight: 700 }}>
                      {formatEur(getProduct("porsche_key_frame").unitAmount)}
                    </span>
                  </div>
                </button>
              </div>
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
            <div style={{ fontWeight: 800, color: "#fff", marginBottom: 10, letterSpacing: 0.3 }}>Informácie</div>
            <div style={{ display: "grid", gap: 8, color: "#cbd5e1" }}>
              <a href="#" style={{ color: "inherit", textDecoration: "none" }}>
                O nás
              </a>
              <a href="/terms" style={{ color: "inherit", textDecoration: "none" }}>
                Obchodné podmienky
              </a>
              <a
                href="https://www.humornedarceky.sk/kontakty"
                style={{ color: "inherit", textDecoration: "none" }}
                target="_blank"
                rel="noreferrer"
              >
                Kontakty
              </a>
              <a
                href="https://www.humornedarceky.sk/velkoobchodny-predaj"
                style={{ color: "inherit", textDecoration: "none" }}
                target="_blank"
                rel="noreferrer"
              >
                Veľkoobchodný predaj
              </a>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 800, color: "#fff", marginBottom: 10, letterSpacing: 0.3 }}>Adresa</div>
            <div style={{ display: "grid", gap: 8, color: "#cbd5e1", lineHeight: 1.6 }}>
              <div>IČO: 34689427</div>
              <div>DIČ: 1026215124</div>
              <div style={{ marginTop: 4, color: "#fff", fontWeight: 700 }}>Výdajné miesto:</div>
              <div>Hontianska cesta č 83</div>
              <div>93601 Šahy</div>
              <div>Slovensko</div>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 800, color: "#fff", marginBottom: 10, letterSpacing: 0.3 }}>Kontakty</div>
            <div style={{ display: "grid", gap: 8, color: "#cbd5e1", lineHeight: 1.6 }}>
              <div style={{ color: "#fff", fontWeight: 700 }}>Štefan Lacko</div>
              <a
                href="tel:+421905486452"
                style={{ color: "#f87171", fontWeight: 800, letterSpacing: 0.3, textDecoration: "none" }}
              >
                0905 486 452
              </a>
              <div>9:00 - 18:00</div>
              <a href="mailto:info@humornedarceky.sk" style={{ color: "inherit", textDecoration: "none" }}>
                info@humornedarceky.sk
              </a>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <a
                  href="#"
                  style={{
                    color: "#e2e8f0",
                    textDecoration: "none",
                    border: "1px solid rgba(226,232,240,0.25)",
                    padding: "6px 10px",
                    borderRadius: 10,
                  }}
                >
                  FB
                </a>
                <a
                  href="#"
                  style={{
                    color: "#e2e8f0",
                    textDecoration: "none",
                    border: "1px solid rgba(226,232,240,0.25)",
                    padding: "6px 10px",
                    borderRadius: 10,
                  }}
                >
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
              justifyContent: "center",
              gap: 12,
              flexWrap: "wrap",
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            <div>© {new Date().getFullYear()} Frame X DAVDAN s.r.o. Všetky práva vyhradené.</div>
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
                      {p.id === "ferrari_key_frame" ? "F" : "P"}
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
            onClick={() => {
              if (normalizedForCheckout.length === 0) return;
              window.location.href = "/checkout";
            }}
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
            Pokračovať
          </button>

          <p style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
            Najprv si vyberiete dopravu a vyplníte adresu, potom pokračujete na Stripe platbu.
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