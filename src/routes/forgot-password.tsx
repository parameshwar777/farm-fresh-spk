import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Mail, Check } from "lucide-react";
import { SpkLogo } from "@/components/SpkLogo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="safe-top safe-bottom relative flex min-h-[100dvh] flex-col items-center justify-start overflow-hidden px-6 pt-10 pb-10"
      style={{
        background:
          "radial-gradient(circle at 20% 0%, oklch(0.92 0.16 90 / 0.55), transparent 55%), radial-gradient(circle at 100% 30%, oklch(0.78 0.14 55 / 0.35), transparent 55%), linear-gradient(180deg, oklch(0.96 0.04 95) 0%, oklch(0.985 0.01 95) 100%)",
      }}
    >
      <Link
        to="/login"
        className="absolute left-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-primary shadow-sm ring-1 ring-primary/10 backdrop-blur"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 flex flex-col items-center">
          <SpkLogo size={84} className="logo-glow" />
          <h1 className="mt-3 font-display text-2xl font-extrabold">
            <span className="shimmer-text">Reset your password</span>
          </h1>
        </div>

        <div className="rounded-3xl bg-white/85 p-5 shadow-[0_20px_60px_-20px_rgba(27,67,50,0.25)] ring-1 ring-primary/10 backdrop-blur">
          {sent ? (
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                <Check className="h-6 w-6" strokeWidth={3} />
              </div>
              <h2 className="font-display text-lg font-bold text-primary">Check your email</h2>
              <p className="text-xs text-muted-foreground">
                We sent a password reset link to <span className="font-semibold">{email}</span>.
                Click the link to set a new password.
              </p>
              <Link
                to="/login"
                className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <h2 className="font-display text-lg font-bold text-primary">Forgot password</h2>
              <p className="text-xs text-muted-foreground">
                Enter your email and we'll send you a link to reset your password.
              </p>

              <label className="block text-xs font-semibold text-primary">Email address</label>
              <div className="flex items-center overflow-hidden rounded-2xl border border-primary/15 bg-white focus-within:ring-2 focus-within:ring-primary/30">
                <div className="flex h-12 items-center border-r border-primary/10 bg-muted/60 px-3 text-primary">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-12 w-full bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground"
                />
              </div>

              {error && <p className="text-xs font-medium text-destructive">{error}</p>}

              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.97 }}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send reset link"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </motion.button>

              <p className="pt-1 text-center text-xs text-muted-foreground">
                Remembered it?{" "}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
