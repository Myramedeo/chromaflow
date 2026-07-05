// Stripe sends signed POST requests here for every billing event.
// We verify the signature, then update the Subscription table accordingly.

// IMPORTANT: This route reads the raw request body for signature verification.
// Do NOT add body parsers or middleware that consume the stream before this runs.

import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";

export async function POST(req: Request) {
  const body      = await req.text(); // raw body — required for signature verification
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ── User completes checkout ─────────────────────────────────────────────
      case "checkout.session.completed": {
        const session      = event.data.object as Stripe.Checkout.Session;
        const workspaceId  = session.metadata?.workspaceId ?? (session.metadata?.workspaceId as string | undefined);
        const customerId   = session.customer as string;
        const subId        = session.subscription as string;

        if (!workspaceId) break;

        // Retrieve the subscription to get priceId and period end
        const stripeSub = await stripe.subscriptions.retrieve(subId);
        const priceId   = stripeSub.items.data[0]?.price.id ?? null;
        const firstItem = stripeSub.items.data[0];
        const periodEnd = firstItem?.current_period_end
          ? new Date(firstItem.current_period_end * 1000)
          : new Date();

        await db.subscription.upsert({
          where:  { workspaceId },
          create: {
            workspaceId,
            stripeCustomerId:     customerId,
            stripeSubscriptionId: subId,
            stripePriceId:        priceId,
            plan:                 "PRO",
            status:               "ACTIVE",
            currentPeriodEnd:     periodEnd,
          },
          update: {
            stripeCustomerId:     customerId,
            stripeSubscriptionId: subId,
            stripePriceId:        priceId,
            plan:                 "PRO",
            status:               "ACTIVE",
            currentPeriodEnd:     periodEnd,
          },
        });
        break;
      }

      // ── Renewal payment succeeded ───────────────────────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        const subId =
          typeof invoice.parent?.subscription_details?.subscription === "string"
            ? invoice.parent.subscription_details.subscription
            : null;

        if (!subId) break;

        const stripeSub = await stripe.subscriptions.retrieve(subId);
        const item = stripeSub.items.data[0];
        const periodEnd = item?.current_period_end
          ? new Date(item.current_period_end * 1000)
          : null;

        await db.subscription.updateMany({
          where:  { stripeSubscriptionId: subId },
          data:   { status: "ACTIVE", currentPeriodEnd: periodEnd },
        });
        break;
      }

      // ── Renewal payment failed ──────────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        const subId =
          typeof invoice.parent?.subscription_details?.subscription === "string"
            ? invoice.parent.subscription_details.subscription
            : null;

        if (!subId) break;

        await db.subscription.updateMany({
          where: { stripeSubscriptionId: subId },
          data:  { status: "PAST_DUE" },
        });
        break;
      }

      // ── Subscription cancelled ──────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;

        await db.subscription.updateMany({
          where: { stripeSubscriptionId: stripeSub.id },
          data:  {
            status: "CANCELLED",
            plan:   "FREE",
            cancelAtPeriodEnd: false,
          },
        });
        break;
      }

      // ── Subscription updated (e.g. cancel_at_period_end toggled) ───────────
      case "customer.subscription.updated": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const firstItem = stripeSub.items.data[0];
        const periodEnd = firstItem?.current_period_end
          ? new Date(firstItem.current_period_end * 1000)
          : new Date();

        await db.subscription.updateMany({
          where: { stripeSubscriptionId: stripeSub.id },
          data:  {
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            currentPeriodEnd:  periodEnd,
          },
        });
        break;
      }

      default:
        // Unhandled event type (safe to ignore)
        break;
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { stripe_event: event.type },
    });
    // Return 500 so Stripe retries the event
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}