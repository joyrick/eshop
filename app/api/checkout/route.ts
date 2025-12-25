import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CATALOG } from "@/lib/catalog";
import { stripe } from "@/lib/stripe";
import crypto from "crypto";

type IncomingItem = { id: string; quantity: number };

type DeliveryId = "packeta" | "courier" | "pickup";

type IncomingAddress = {
  fullName?: string;
  email?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
};

const DELIVERY_CONFIG: Record<DeliveryId, { label: string; amount: number }> = {
  packeta: { label: "Doprava: Packeta", amount: 390 },
  courier: { label: "Doprava: Kuriér", amount: 490 },
  pickup: { label: "Doprava: Osobný odber", amount: 0 },
};

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
    if (!product.priceId) throw new Error(`Product not configured: ${id}`);
    return { id, quantity, priceId: product.priceId };
  });

  return normalized;
}

function validateAddress(a: IncomingAddress) {
  const fullName = (a.fullName ?? "").trim();
  const email = (a.email ?? "").trim();
  const phone = (a.phone ?? "").trim();
  const address1 = (a.address1 ?? "").trim();
  const address2 = (a.address2 ?? "").trim();
  const city = (a.city ?? "").trim();
  const postalCode = (a.postalCode ?? "").trim();
  const country = ((a.country ?? "SK").trim() || "SK").toUpperCase();

  // Now optional: Stripe Checkout will collect the final address.
  return { fullName, email, phone, address1, address2, city, postalCode, country };
}

export async function POST(req: NextRequest) {
  try {
    // NOTE: production rate limiting should be done with a shared store (Upstash/Redis) on Vercel.
    // This route remains intentionally unauthenticated for a public shop demo.

    const ip = normalizeClientIp(req);

    const { items, deliveryId } = (await req.json()) as {
      items: IncomingItem[];
      deliveryId?: DeliveryId;
      address?: IncomingAddress;
    };
    const normalizedItems = parseAndValidateItems(items);

    if (!deliveryId || !(deliveryId in DELIVERY_CONFIG)) {
      throw new Error("Missing or invalid deliveryId");
    }

    const safeAddress = validateAddress({});

    // Create a durable pending order before redirecting to Stripe.
    const orderId = `ord_${crypto.randomBytes(16).toString("hex")}`;

    await prisma.order.create({
      data: {
        id: orderId,
        status: "PENDING",
        currency: "eur",
        customerEmail: null,
        deliveryMethod: deliveryId === "packeta" ? "PACKETA" : deliveryId === "courier" ? "COURIER" : "PICKUP",
        deliveryPrice: DELIVERY_CONFIG[deliveryId].amount,
      } as any,
    });

    const shipping = DELIVERY_CONFIG[deliveryId];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        ...normalizedItems.map((i) => ({
          price: i.priceId,
          quantity: i.quantity,
        })),
        {
          price_data: {
            currency: "eur",
            product_data: { name: shipping.label },
            unit_amount: shipping.amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancelled?order_id=${orderId}`,
      metadata: { orderId, deliveryId },
      // Optional: helps prevent some mismatches; only allow payments in EUR.
      currency: "eur",
      shipping_address_collection: { allowed_countries: ["SK", "CZ"] },
      phone_number_collection: { enabled: true },
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