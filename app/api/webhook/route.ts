import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (!sig || !endpointSecret) {
      throw new Error("Missing stripe-signature or STRIPE_WEBHOOK_SECRET");
    }
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Idempotency: store Stripe event.id; if already processed, acknowledge.
  try {
    await prisma.stripeEvent.create({
      data: { id: event.id, type: event.type },
    });
  } catch {
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const orderId = session.metadata?.orderId;
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId metadata" }, { status: 400 });
    }

    // Confirm paid (Stripe sets this to 'paid' when payment completes for Checkout Session)
    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: `Unknown order: ${orderId}` }, { status: 404 });
    }

    // Ensure session matches the one we created for the order.
    if (order.stripeSessionId && session.id !== order.stripeSessionId) {
      return NextResponse.json({ error: "Session/order mismatch" }, { status: 400 });
    }

    // Persist paid state + basic details.
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        stripeSessionId: session.id,
        customerEmail: session.customer_details?.email ?? null,
        amountTotal: typeof session.amount_total === "number" ? session.amount_total : null,
      },
    });

    // FULFILLMENT HOOK (call your internal fulfillment here, after DB update)
    console.log(`✅ Order paid: ${orderId} (session ${session.id})`);
  }

  return NextResponse.json({ received: true });
}
