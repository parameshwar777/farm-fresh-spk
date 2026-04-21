import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms & Conditions — SPK Natural Farming" },
      {
        name: "description",
        content:
          "Read the terms and conditions for using the SPK Natural Farming app and services.",
      },
    ],
  }),
});

function TermsPage() {
  return (
    <div className="safe-top safe-bottom min-h-[100dvh] pb-12">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Link
          to="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-primary" />
        </Link>
        <h1 className="font-display text-lg font-bold text-primary">Terms & Conditions</h1>
      </header>

      <article className="prose prose-sm mx-auto max-w-none px-5 py-6 text-sm leading-relaxed text-foreground">
        <p className="text-xs text-muted-foreground">Last updated: April 2026</p>

        <h2 className="mt-4 font-display text-base font-bold text-primary">1. Acceptance</h2>
        <p>
          By using the SPK Natural Farming app you agree to these Terms. If you do not agree,
          please discontinue use of the service.
        </p>

        <h2 className="mt-4 font-display text-base font-bold text-primary">2. Orders</h2>
        <p>
          All orders are subject to product availability. We reserve the right to cancel or
          refuse any order. Prices are in INR and may change without notice. Discounts and
          promotions are time-limited and cannot be combined unless stated.
        </p>

        <h2 className="mt-4 font-display text-base font-bold text-primary">3. Delivery</h2>
        <p>
          We deliver to serviceable pincodes. Delivery times are estimates only. We are not
          responsible for delays caused by weather, traffic, or events outside our control.
          Please ensure someone is available at the delivery address during the chosen slot.
        </p>

        <h2 className="mt-4 font-display text-base font-bold text-primary">4. Payments</h2>
        <p>
          We accept Cash on Delivery, UPI, and online card/wallet payments. All online payments
          are processed through PCI-compliant payment partners. We do not store your card
          details.
        </p>

        <h2 className="mt-4 font-display text-base font-bold text-primary">5. Returns & Refunds</h2>
        <p>
          As we deal in fresh produce, returns are accepted only at the time of delivery if
          items are damaged or do not meet quality standards. Refunds for online payments are
          processed within 5–7 business days to your original payment method.
        </p>

        <h2 className="mt-4 font-display text-base font-bold text-primary">6. User Conduct</h2>
        <p>
          You agree not to misuse the app, attempt unauthorised access, or place fraudulent
          orders. We may suspend accounts that violate these terms.
        </p>

        <h2 className="mt-4 font-display text-base font-bold text-primary">7. Liability</h2>
        <p>
          SPK Natural Farming's liability is limited to the value of the order. We are not
          liable for indirect or consequential losses.
        </p>

        <h2 className="mt-4 font-display text-base font-bold text-primary">8. Changes</h2>
        <p>
          We may update these terms from time to time. Continued use after changes implies
          acceptance.
        </p>

        <h2 className="mt-4 font-display text-base font-bold text-primary">9. Contact</h2>
        <p>
          Questions? Reach us through the app or via the support email listed in the About Us
          page.
        </p>
      </article>
    </div>
  );
}
