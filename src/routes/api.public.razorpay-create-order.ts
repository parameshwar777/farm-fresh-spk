import { createFileRoute } from "@tanstack/react-router";
import Razorpay from "razorpay";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/razorpay-create-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const keyId = process.env.RAZORPAY_KEY_ID;
          const keySecret = process.env.RAZORPAY_KEY_SECRET;
          if (!keyId || !keySecret) {
            return Response.json(
              { error: "Razorpay not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET secrets." },
              { status: 500 },
            );
          }

          const body = (await request.json()) as { orderId?: string };
          if (!body.orderId || typeof body.orderId !== "string") {
            return Response.json({ error: "Missing orderId" }, { status: 400 });
          }

          // Look up the order in DB (must exist & be pending)
          const { data: order, error } = await supabaseAdmin
            .from("orders")
            .select("id, total_amount, payment_status")
            .eq("id", body.orderId)
            .single();

          if (error || !order) {
            return Response.json({ error: "Order not found" }, { status: 404 });
          }
          if (order.payment_status === "paid") {
            return Response.json({ error: "Order already paid" }, { status: 400 });
          }

          const amountPaise = Math.round(Number(order.total_amount) * 100);
          const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
          const rzpOrder = await rzp.orders.create({
            amount: amountPaise,
            currency: "INR",
            receipt: order.id,
            notes: { order_id: order.id },
          });

          await supabaseAdmin
            .from("orders")
            .update({ razorpay_order_id: rzpOrder.id })
            .eq("id", order.id);

          return Response.json({
            keyId,
            razorpayOrderId: rzpOrder.id,
            amount: amountPaise,
            currency: "INR",
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to create payment";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
