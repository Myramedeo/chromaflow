// Server-only Stripe client, never import this in "use client" components.

import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-expect-error Pinned API version so we don't accidentally use a newer version with breaking changes
  apiVersion: "2024-06-20", 
  typescript: true,
});