"use client";

const cartItems = [
  { id: "t-shirt", name: "T-shirt", unit_amount: 2500, quantity: 1 },
  { id: "socks", name: "Socks", unit_amount: 800, quantity: 2 },
];

export default function HomePage() {
  const checkout = async () => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cartItems.map((i) => ({ id: i.id, quantity: i.quantity })),
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
  };

  const total = cartItems.reduce((sum, i) => sum + i.unit_amount * i.quantity, 0);

  return (
    <main style={{ maxWidth: 520, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Cart</h1>

      <ul>
        {cartItems.map((i) => (
          <li key={i.name} style={{ marginBottom: 8 }}>
            {i.name} — €{(i.unit_amount / 100).toFixed(2)} × {i.quantity}
          </li>
        ))}
      </ul>

      <p><b>Total:</b> €{(total / 100).toFixed(2)}</p>

      <button onClick={checkout} style={{ padding: "10px 14px" }}>
        Checkout (Stripe Hosted)
      </button>

      <p style={{ marginTop: 16, opacity: 0.8, borderTop: "1px solid #eee", paddingTop: 16, fontSize: 14, cursor: "default" }}>
        Tip: Apple Pay / Google Pay appear automatically on supported devices once enabled in Stripe.
      </p>
    </main>
  );
}