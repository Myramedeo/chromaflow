// Server-only Stripe client, never import this in "use client" components.

import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-expect-error
  apiVersion: "2024-06-20", // Pin this (never let it float)
  typescript: true,
});