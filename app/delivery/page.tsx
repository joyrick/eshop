"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type DeliveryId = "packeta" | "courier" | "pickup";

type DeliveryMethod = {
  id: DeliveryId;
  title: string;
  description: string;
  priceLabel: string;
};

const METHODS: DeliveryMethod[] = [
  {
    id: "packeta",
    title: "Packeta (Z-BOX) / výdajné miesto",
    description: "Doručenie do výdajného miesta alebo Z-BOXu. Výber miesta doplníme v ďalšom kroku.",
    priceLabel: "€ 3,90",
  },
  {
    id: "courier",
    title: "Kuriér na adresu",
    description: "Doručenie kuriérom na zadanú adresu.",
    priceLabel: "€ 4,90",
  },
  {
    id: "pickup",
    title: "Osobný odber",
    description: "Môžete si objednávku vyzdvihnúť osobne na našej prevádzke v rámci otváracích hodín.",
    priceLabel: "Zdarma",
  },
];

export default function DeliveryPage({
  searchParams,
}: {
  searchParams?: { session_id?: string; order_id?: string };
}) {
  const sessionId = searchParams?.session_id;
  const orderId = searchParams?.order_id;

  const [selected, setSelected] = useState<DeliveryId | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState<null | { method: string; price: number }>(null);
  const [error, setError] = useState<string | null>(null);

  const canSave = useMemo(() => {
    return Boolean(orderId && sessionId && selected && !isSaving);
  }, [orderId, sessionId, selected, isSaving]);

  const save = async () => {
    setError(null);

    if (!orderId || !sessionId) {
      setError("Chýba order_id alebo session_id. Skúste sa vrátiť na stránku po platbe.");
      return;
    }
    if (!selected) {
      setError("Najprv vyberte spôsob doručenia.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, sessionId, deliveryId: selected }),
      });

      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        setError(data?.error || raw || `Chyba (${res.status})`);
        return;
      }

      setSaved({ method: data?.order?.deliveryMethod, price: data?.order?.deliveryPrice });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", fontFamily: "system-ui", padding: "0 16px" }}>
      <h1>Doručenie</h1>
      <p style={{ marginTop: 10, opacity: 0.85 }}>Vyberte spôsob doručenia pre vašu objednávku.</p>

      {(sessionId || orderId) && (
        <p style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
          {sessionId ? (
            <>
              Stripe session: <code>{sessionId}</code>
            </>
          ) : null}
          {sessionId && orderId ? " · " : null}
          {orderId ? (
            <>
              Objednávka: <code>{orderId}</code>
            </>
          ) : null}
        </p>
      )}

      <section style={{ marginTop: 22, display: "grid", gap: 12 }}>
        {METHODS.map((m) => {
          const active = selected === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelected(m.id)}
              disabled={isSaving || Boolean(saved)}
              style={{
                textAlign: "left",
                border: active ? "2px solid #111827" : "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 16,
                background: active ? "#f8fafc" : "#fff",
                cursor: isSaving || saved ? "not-allowed" : "pointer",
              }}
              aria-pressed={active}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <h2 style={{ fontSize: 16, margin: 0 }}>{m.title}</h2>
                <strong style={{ whiteSpace: "nowrap" }}>{m.priceLabel}</strong>
              </div>
              <p style={{ margin: "8px 0 0", opacity: 0.85 }}>{m.description}</p>
              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
                {active ? "Vybrané" : "Kliknite pre výber"}
              </div>
            </button>
          );
        })}
      </section>

      {error ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }}>
          {error}
        </div>
      ) : null}

      {saved ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#ecfdf5", border: "1px solid #bbf7d0", color: "#065f46" }}>
          Doručenie uložené: <strong>{saved.method || "(nezistené)"}</strong>
        </div>
      ) : (
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          style={{
            marginTop: 14,
            width: "100%",
            borderRadius: 12,
            padding: "12px 14px",
            background: canSave ? "#111827" : "#e5e7eb",
            color: canSave ? "#fff" : "#6b7280",
            border: "none",
            cursor: canSave ? "pointer" : "not-allowed",
            fontWeight: 800,
          }}
        >
          {isSaving ? "Ukladám…" : "Potvrdiť doručenie"}
        </button>
      )}

      <p style={{ marginTop: 14, fontSize: 13, opacity: 0.75 }}>
        Bezpečnosť: doručenie ukladáme až po tom, čo je objednávka označená ako <strong>PAID</strong> (cez webhook) a
        zároveň overíme Stripe session.
      </p>

      <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/" style={{ textDecoration: "underline" }}>
          Späť na hlavnú stránku
        </Link>
      </div>
    </main>
  );
}
