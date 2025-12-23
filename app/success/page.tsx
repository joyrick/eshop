export default function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  return (
    <main style={{ maxWidth: 520, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Payment success ✅</h1>
      <p>Session ID:</p>
      <code style={{ display: "block", padding: 12, background: "#f4f4f5" }}>
        {searchParams.session_id || "Missing session_id"}
      </code>
      <p style={{ marginTop: 16 }}>
        In a real shop, you’d confirm payment via a Stripe webhook before fulfilling the order.
      </p>
      <a href="/">Back to cart</a>
    </main>
  );
}