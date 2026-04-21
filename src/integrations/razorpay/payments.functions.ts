import { createServerFn } from "@tanstack/react-start";
import { createHmac, timingSafeEqual } from "crypto";
import Razorpay from "razorpay";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Creates a Razorpay order for an existing pending DB order.
 * Returns the keyId + razorpay order id + amount the browser SDK needs.
 */
export const createRazorpayOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string }) => {
    if (!input || typeof input.orderId !== "string" || !input.orderId) {
      throw new Error("orderId required");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error(
        "Razorpay not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET secrets.",
      );
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, total_amount, payment_status")
      .eq("id", data.orderId)
      .single();
    if (error || !order) throw new Error("Order not found");
    if (order.payment_status === "paid") throw new Error("Order already paid");

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

    return {
      keyId,
      razorpayOrderId: rzpOrder.id,
      amount: amountPaise,
      currency: "INR",
    };
  });

/**
 * Verifies the Razorpay payment signature returned by the checkout SDK
 * and marks the order as paid.
 */
export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      orderId: string;
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      const required = [
        "orderId",
        "razorpay_order_id",
        "razorpay_payment_id",
        "razorpay_signature",
      ] as const;
      for (const k of required) {
        if (!input?.[k] || typeof input[k] !== "string") {
          throw new Error(`Missing ${k}`);
        }
      }
      return input;
    },
  )
  .handler(async ({ data }) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new Error("Razorpay not configured");

    const expected = createHmac("sha256", keySecret)
      .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(data.razorpay_signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error("Invalid payment signature");
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "paid",
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
        status: "confirmed",
      })
      .eq("id", data.orderId)
      .eq("razorpay_order_id", data.razorpay_order_id);

    if (error) throw new Error(error.message);
    return { success: true };
  });
