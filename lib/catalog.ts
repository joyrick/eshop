export type CatalogItem = {
  name: string;
  priceId?: string;
};

function getEnv(name: string): string | undefined {
  return process.env[name];
}

export const CATALOG: Record<string, CatalogItem> = {
  "t-shirt": {
    name: "T-shirt",
    priceId: getEnv("STRIPE_PRICE_TSHIRT"),
  },
  socks: {
    name: "Socks",
    priceId: getEnv("STRIPE_PRICE_SOCKS"),
  },
  ferrari_key_frame: {
    name: "Ferrari key in frame",
    priceId: getEnv("STRIPE_PRICE_FERRARI_KEY_FRAME"),
  },
  porsche_key_frame: {
    name: "Porsche key in frame",
    priceId: getEnv("STRIPE_PRICE_PORSCHE_KEY_FRAME"),
  },
};
