import Stripe from "stripe";

const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
  throw new Error("Missing env var: STRIPE_SECRET_KEY");
}

export const stripe = new Stripe(apiKey, {
  apiVersion: "2025-12-15.clover" as any,
});
