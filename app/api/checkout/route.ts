import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CATALOG } from "@/lib/catalog";
import { stripe } from "@/lib/stripe";
import crypto from "crypto";

type IncomingItem = { id: string; quantity: number };

function normalizeClientIp(req: NextRequest) {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] ?? "anonymous").trim();
}

function parseAndValidateItems(items: IncomingItem[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Cart is empty");
  }

  // Combine duplicates, enforce integer quantity, min/max.
  const combined = new Map<string, number>();
  for (const item of items) {
    if (!item || typeof item.id !== "string") throw new Error("Invalid item id");
    const qty = (item as any).quantity;
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      throw new Error(`Invalid quantity for ${item.id}. Must be an integer between 1 and 20.`);
    }
    combined.set(item.id, (combined.get(item.id) ?? 0) + qty);
    if ((combined.get(item.id) ?? 0) > 20) {
      throw new Error(`Invalid quantity for ${item.id}. Max 20.`);
    }
  }

  if (combined.size > 10) throw new Error("Too many distinct items");

  // Validate against server-side catalog
  const normalized = [...combined.entries()].map(([id, quantity]) => {
    const product = CATALOG[id];
    if (!product) throw new Error(`Invalid product ID: ${id}`);
    return { id, quantity, priceId: product.priceId };
  });

  return normalized;
}

export async function POST(req: NextRequest) {
  try {
    // NOTE: production rate limiting should be done with a shared store (Upstash/Redis) on Vercel.
    // This route remains intentionally unauthenticated for a public shop demo.

    const ip = normalizeClientIp(req);

    const { items } = (await req.json()) as { items: IncomingItem[] };
    const normalizedItems = parseAndValidateItems(items);

    // Create a durable pending order before redirecting to Stripe.
    const orderId = `ord_${crypto.randomBytes(16).toString("hex")}`;

    await prisma.order.create({
      data: {
        id: orderId,
        status: "PENDING",
        currency: "eur",
      },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: normalizedItems.map((i) => ({
        price: i.priceId,
        quantity: i.quantity,
      })),
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/`,
      metadata: { orderId },
      // Optional: helps prevent some mismatches; only allow payments in EUR.
      currency: "eur",
    });

    // Link session back to the order for later verification.
    await prisma.order.update({
      where: { id: orderId },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ url: session.url, orderId, ip });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Failed to create session" }, { status: 500 });
  }
}