// POST /api/billing/portal
// Creates a Stripe Billing Portal session.
// Returns { url } and redirects the user there to manage their subscription.
// Handles card updates, view invoices, and subscription cancellation.

import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { withAuth, ok, error, forbidden, getWorkspaceMembership, parseBody } from "@/lib/api-helpers";

interface PortalBody {
  workspaceId: string;
}

export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody<PortalBody>(req);
  if (!body?.workspaceId) return error("workspaceId is required");

  const { workspaceId } = body;

  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership || membership.role !== "OWNER") return forbidden();

  const subscription = await db.subscription.findUnique({ where: { workspaceId } });

  let customerId = subscription?.stripeCustomerId;

  if (!customerId) {
    return error("No billing account found for this workspace", 404);
  }

  // Verify customer exists in environment, if not create a new one and update the subscription record
  try {
    await stripe.customers.retrieve(customerId);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "resource_missing"
    ) {
        // Customer is from wrong environment
        const customer = await stripe.customers.create({
          metadata: { workspaceId },
      });

      customerId = customer.id;

      await db.subscription.update({
        where: { workspaceId },
        data: { stripeCustomerId: customerId },
      });
    } else {
      throw err;
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/dashboard/${workspaceId}/settings/billing`,
  });

  return ok({ url: portalSession.url });
});