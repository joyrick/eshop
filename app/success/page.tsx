export default function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string; order_id?: string };
}) {
  const sessionId = searchParams.session_id;
  const orderId = searchParams.order_id;

  const deliveryHref = (() => {
    const params = new URLSearchParams();
    if (sessionId) params.set("session_id", sessionId);
    if (orderId) params.set("order_id", orderId);
    const q = params.toString();
    return q ? `/delivery?${q}` : "/delivery";
  })();

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui", padding: "0 16px" }}>
      <h1>Platba prebehla úspešne ✅</h1>
      <p style={{ marginTop: 10, opacity: 0.85 }}>Ďakujeme za objednávku. Teraz si prosím vyberte spôsob doručenia.</p>

      <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a
          href={deliveryHref}
          style={{
            display: "inline-block",
            borderRadius: 12,
            padding: "10px 14px",
            background: "#111827",
            color: "#fff",
            textDecoration: "none",
          }}
        >
          Vybrať doručenie
        </a>
        <a href="/" style={{ alignSelf: "center", textDecoration: "underline" }}>
          Späť na hlavnú stránku
        </a>
      </div>

      <div style={{ marginTop: 18 }}>
        <p style={{ fontSize: 13, opacity: 0.75, margin: "0 0 8px" }}>Technický detail:</p>
        <code style={{ display: "block", padding: 12, background: "#f4f4f5", borderRadius: 10 }}>
          session_id: {sessionId || "Missing session_id"}
          {"\n"}
          order_id: {orderId || "Missing order_id"}
        </code>
      </div>

      <p style={{ marginTop: 16, fontSize: 13, opacity: 0.75 }}>
        Poznámka: v produkcii sa objednávka potvrdzuje cez Stripe webhook (nie podľa tohto redirectu).
      </p>
    </main>
  );
}