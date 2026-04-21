import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — SPK Natural Farming" },
      {
        name: "description",
        content:
          "Learn how SPK Natural Farming collects, uses, and protects your personal information.",
      },
    ],
  }),
});

function PrivacyPage() {
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
        <h1 className="font-display text-lg font-bold text-primary">Privacy Policy</h1>
      </header>

      <article className="prose prose-sm mx-auto max-w-none px-5 py-6 text-sm leading-relaxed text-foreground">
        <p className="text-xs text-muted-foreground">Last updated: April 2026</p>

        <h2 className="mt-4 font-display text-base font-bold text-primary">What we collect</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Name, phone number, and email address you provide.</li>
          <li>Delivery addresses you save.</li>
          <li>Order history and payment status (we never store card details).</li>
          <li>Basic device info for security and abuse prevention.</li>
        </ul>

        <h2 className="mt-4 font-display text-base font-bold text-primary">How we use it</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>To process and deliver your orders.</li>
          <li>To send order updates by SMS, push or WhatsApp (as enabled).</li>
          <li>To improve the app and fix issues.</li>
          <li>To comply with applicable laws.</li>
        </ul>

        <h2 className="mt-4 font-display text-base font-bold text-primary">Sharing</h2>
        <p>
          We share data only with delivery partners and payment processors required to fulfil
          your order. We never sell your personal information.
        </p>

        <h2 className="mt-4 font-display text-base font-bold text-primary">Security</h2>
        <p>
          Data is encrypted in transit and at rest. Access is restricted to authorised staff
          with role-based controls.
        </p>

        <h2 className="mt-4 font-display text-base font-bold text-primary">Your rights</h2>
        <p>
          You may request access, correction or deletion of your data at any time. Contact us
          via the support email in About Us.
        </p>

        <h2 className="mt-4 font-display text-base font-bold text-primary">Cookies</h2>
        <p>
          We use minimal local storage to keep you signed in and remember your cart. We do not
          use third-party advertising trackers.
        </p>

        <h2 className="mt-4 font-display text-base font-bold text-primary">Children</h2>
        <p>The app is intended for users aged 18 and above.</p>

        <h2 className="mt-4 font-display text-base font-bold text-primary">Changes</h2>
        <p>
          Updates to this policy will be posted on this page with a new "last updated" date.
        </p>
      </article>
    </div>
  );
}
