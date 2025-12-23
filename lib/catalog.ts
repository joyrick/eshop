export type CatalogItem = {
  name: string;
  priceId: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const CATALOG: Record<string, CatalogItem> = {
  "t-shirt": {
    name: "T-shirt",
    priceId: requireEnv("STRIPE_PRICE_TSHIRT"),
  },
  socks: {
    name: "Socks",
    priceId: requireEnv("STRIPE_PRICE_SOCKS"),
  },
};
