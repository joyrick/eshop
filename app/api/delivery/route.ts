import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

type DeliveryId = "packeta" | "courier" | "pickup";

type DeliveryMethodDb = "PACKETA" | "COURIER" | "PICKUP";

const DELIVERY_CONFIG: Record<DeliveryId, { method: DeliveryMethodDb; price: number }> = {
  packeta: { method: "PACKETA", price: 390 },
  courier: { method: "COURIER", price: 490 },
  pickup: { method: "PICKUP", price: 0 },
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      orderId?: string;
      sessionId?: string;
      deliveryId?: DeliveryId;
    };

    const orderId = body?.orderId;
    const sessionId = body?.sessionId;
    const deliveryId = body?.deliveryId;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }
    if (!deliveryId || !(deliveryId in DELIVERY_CONFIG)) {
      return NextResponse.json({ error: "Invalid deliveryId" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify that this (paid) session corresponds to this order.
    if (order.stripeSessionId && order.stripeSessionId !== sessionId) {
      return NextResponse.json({ error: "Session/order mismatch" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const metadataOrderId = session.metadata?.orderId;
    if (metadataOrderId && metadataOrderId !== orderId) {
      return NextResponse.json({ error: "Metadata/order mismatch" }, { status: 400 });
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not confirmed" }, { status: 409 });
    }

    // Only allow saving delivery after webhook marked the order paid.
    // (This prevents relying solely on the redirect.)
    if (order.status !== "PAID") {
      return NextResponse.json({ error: "Order not paid yet" }, { status: 409 });
    }

    const cfg = DELIVERY_CONFIG[deliveryId];

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryMethod: cfg.method,
        deliveryPrice: cfg.price,
      } as any,
      select: { id: true, deliveryMethod: true, deliveryPrice: true } as any,
    });

    return NextResponse.json({ ok: true, order: updated });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "Failed to save delivery" }, { status: 500 });
  }
}
