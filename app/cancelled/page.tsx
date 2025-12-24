export default function CancelledPage({
  searchParams,
}: {
  searchParams?: { order_id?: string };
}) {
  return (
    <main style={{ maxWidth: 520, margin: "40px auto", fontFamily: "system-ui", padding: "0 16px" }}>
      <h1>Payment cancelled</h1>
      <p style={{ marginTop: 12 }}>
        You have canceled the payment. Your cart should still be saved.
      </p>
      {searchParams?.order_id ? (
        <p style={{ opacity: 0.75, fontSize: 13 }}>
          Order: <code>{searchParams.order_id}</code>
        </p>
      ) : null}
      <a href="/">Go back to cart</a>
    </main>
  );
}
