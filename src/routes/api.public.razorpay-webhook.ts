import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Razorpay webhook — set this URL in Razorpay Dashboard → Webhooks:
//   https://farm-fresh-spk.lovable.app/api/public/razorpay-webhook
// Subscribe to: payment.captured, payment.failed
// Then paste the webhook secret as RAZORPAY_WEBHOOK_SECRET.
export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
          return new Response("Webhook not configured", { status: 500 });
        }

        const signature = request.headers.get("x-razorpay-signature");
        const rawBody = await request.text();
        if (!signature) return new Response("Missing signature", { status: 401 });

        const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
        const a = Buffer.from(expected);
        const b = Buffer.from(signature);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        try {
          const payload = JSON.parse(rawBody) as {
            event: string;
            payload: {
              payment: {
                entity: {
                  id: string;
                  order_id: string;
                  status: string;
                };
              };
            };
          };

          const event = payload.event;
          const payment = payload.payload?.payment?.entity;
          if (!payment) return new Response("ok");

          if (event === "payment.captured") {
            await supabaseAdmin
              .from("orders")
              .update({
                payment_status: "paid",
                razorpay_payment_id: payment.id,
                status: "confirmed",
              })
              .eq("razorpay_order_id", payment.order_id);
          } else if (event === "payment.failed") {
            await supabaseAdmin
              .from("orders")
              .update({ payment_status: "pending" })
              .eq("razorpay_order_id", payment.order_id);
          }

          return new Response("ok");
        } catch (err) {
          const msg = err instanceof Error ? err.message : "webhook error";
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});
