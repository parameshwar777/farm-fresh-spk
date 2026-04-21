import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Called by the browser after Razorpay checkout success.
// Verifies the signature using HMAC(razorpay_order_id|razorpay_payment_id, key_secret).
export const Route = createFileRoute("/api/public/razorpay-verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const keySecret = process.env.RAZORPAY_KEY_SECRET;
          if (!keySecret) {
            return Response.json({ error: "Razorpay not configured" }, { status: 500 });
          }

          const body = (await request.json()) as {
            razorpay_order_id?: string;
            razorpay_payment_id?: string;
            razorpay_signature?: string;
            order_id?: string;
          };

          const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = body;
          if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id) {
            return Response.json({ error: "Missing fields" }, { status: 400 });
          }

          const expected = createHmac("sha256", keySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

          const a = Buffer.from(expected);
          const b = Buffer.from(razorpay_signature);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return Response.json({ error: "Invalid signature" }, { status: 401 });
          }

          const { error } = await supabaseAdmin
            .from("orders")
            .update({
              payment_status: "paid",
              razorpay_payment_id,
              razorpay_signature,
              status: "confirmed",
            })
            .eq("id", order_id)
            .eq("razorpay_order_id", razorpay_order_id);

          if (error) {
            return Response.json({ error: error.message }, { status: 500 });
          }

          return Response.json({ success: true });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Verification failed";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
