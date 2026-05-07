// POST /api/billing/checkout
// Creates a Stripe Checkout session for upgrading a workspace to Pro.
// Returns { url } andthe browser redirects to this Stripe-hosted checkout page.

import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { withAuth, ok, error, forbidden, getWorkspaceMembership, parseBody } from "@/lib/api-helpers";

interface CheckoutBody {
  workspaceId: string;
}

export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody<CheckoutBody>(req);
  if (!body?.workspaceId) return error("workspaceId is required");

  const { workspaceId } = body;

  // Only workspace owners can upgrade billing
  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership || membership.role !== "OWNER") return forbidden();

  // Get or create a Stripe Customer tied to this workspace
  const subscription = await db.subscription.findUnique({ where: { workspaceId } });
  let stripeCustomerId = subscription?.stripeCustomerId;

  if (!stripeCustomerId) {
    const user = await db.user.findUnique({ where: { id: userId } });
    const customer = await stripe.customers.create({
      email: user?.email,
      name: user?.name ?? undefined,
      metadata: { workspaceId, userId },
    });
    stripeCustomerId = customer.id;

    // Upsert the subscription row so we always have a customerId stored
    await db.subscription.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        stripeCustomerId,
        plan: "FREE",
        status: "ACTIVE",
      },
      update: { stripeCustomerId },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: process.env.STRIPE_PRO_PRICE_ID!,
        quantity: 1,
      },
    ],
    metadata: {
      workspaceId,
    },
    subscription_data: {
      metadata: {
      workspaceId,
      },
    },
    success_url: `${appUrl}/dashboard/${workspaceId}/settings/billing?success=1`,
    cancel_url:  `${appUrl}/dashboard/${workspaceId}/settings/billing?cancelled=1`,
  });

  if (!session.url) return error("Failed to create checkout session");

  return ok({ url: session.url });
});