import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

export const Route = createFileRoute("/order-success/$orderId")({
  component: OrderSuccessPage,
});

function OrderSuccessPage() {
  const { orderId } = Route.useParams();
  return (
    <div className="safe-top safe-bottom flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <motion.svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <circle cx="60" cy="60" r="55" fill="oklch(0.93 0.06 152)" />
        <motion.path
          d="M35 62 L52 78 L86 44"
          stroke="oklch(0.32 0.06 152)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </motion.svg>
      <h1 className="mt-6 font-display text-2xl font-bold text-primary">
        Order Placed Successfully!
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your order #{orderId.slice(0, 8)} is being prepared with love 🌿
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Link
          to="/orders/$orderId"
          params={{ orderId }}
          className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          Track Order
        </Link>
        <Link to="/shop" className="text-sm font-semibold text-accent">
          Continue Shopping →
        </Link>
      </div>
    </div>
  );
}
