import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Leaf, Sprout, Truck, Heart } from "lucide-react";
import { SpkLogo } from "@/components/SpkLogo";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About Us — SPK Natural Farming" },
      {
        name: "description",
        content:
          "SPK Natural Farming brings chemical-free, farm-fresh produce from our fields straight to your kitchen.",
      },
    ],
  }),
});

function AboutPage() {
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
        <h1 className="font-display text-lg font-bold text-primary">About Us</h1>
      </header>

      <div className="px-5 py-6">
        <div className="flex flex-col items-center text-center">
          <SpkLogo size={88} className="logo-glow" />
          <h2 className="mt-4 font-display text-2xl font-extrabold text-primary">
            SPK Natural Farming
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fresh from farm — grown the SPK way 🌿
          </p>
        </div>

        <section className="mt-6 rounded-3xl bg-card p-5 text-sm leading-relaxed text-foreground">
          <p>
            SPK Natural Farming is a small farm-to-home venture committed to bringing you
            chemical-free vegetables, fruits and grains grown using traditional natural farming
            methods. No pesticides. No synthetic fertilisers. Just patience, soil, sunlight and
            the SPK method.
          </p>
        </section>

        <section className="mt-6">
          <h3 className="mb-3 font-display text-lg font-bold text-primary">What makes us different</h3>
          <ul className="space-y-3">
            <Feature
              icon={<Leaf className="h-5 w-5" />}
              title="100% Natural"
              text="Grown without chemical inputs, the way produce was grown for generations."
            />
            <Feature
              icon={<Sprout className="h-5 w-5" />}
              title="SPK Method"
              text="A natural farming technique that keeps the soil alive and the produce nutrient-dense."
            />
            <Feature
              icon={<Truck className="h-5 w-5" />}
              title="Same-day harvest"
              text="Picked the morning of your delivery — no cold storage, no middlemen."
            />
            <Feature
              icon={<Heart className="h-5 w-5" />}
              title="Family-run"
              text="Run by farmers, for families. Every order supports our growers directly."
            />
          </ul>
        </section>

        <section className="mt-6 rounded-3xl bg-secondary/30 p-5 text-sm">
          <h3 className="font-display text-base font-bold text-primary">Get in touch</h3>
          <p className="mt-1 text-muted-foreground">
            Questions, feedback or bulk orders? We'd love to hear from you.
          </p>
          <p className="mt-2">
            📧{" "}
            <a className="font-semibold text-accent" href="mailto:hello@spknaturalfarming.in">
              hello@spknaturalfarming.in
            </a>
          </p>
          <p className="mt-1">📞 +91 98765 43210</p>
        </section>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Made with 🌱 for fresher, healthier kitchens.
        </p>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <li className="flex gap-3 rounded-2xl bg-card p-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="text-sm">
        <p className="font-display font-bold text-primary">{title}</p>
        <p className="text-muted-foreground">{text}</p>
      </div>
    </li>
  );
}
