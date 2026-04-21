import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Lock, Eye, EyeOff } from "lucide-react";
import { SpkLogo } from "@/components/SpkLogo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase places the recovery tokens in the URL hash and emits a PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Fallback: if a session already exists from the recovery link, allow reset
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
        return;
      }
      toast.success("Password updated. Please sign in.");
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
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
            <span className="shimmer-text">Set new password</span>
          </h1>
        </div>

        <div className="rounded-3xl bg-white/85 p-5 shadow-[0_20px_60px_-20px_rgba(27,67,50,0.25)] ring-1 ring-primary/10 backdrop-blur">
          {!ready ? (
            <div className="space-y-3 text-center">
              <p className="text-xs text-muted-foreground">
                Open this page from the password reset email link to continue.
              </p>
              <Link
                to="/forgot-password"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30"
              >
                Request a new link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <h2 className="font-display text-lg font-bold text-primary">Choose a new password</h2>
              <p className="text-xs text-muted-foreground">Make it at least 6 characters.</p>

              <label className="block text-xs font-semibold text-primary">New password</label>
              <div className="flex items-center overflow-hidden rounded-2xl border border-primary/15 bg-white focus-within:ring-2 focus-within:ring-primary/30">
                <div className="flex h-12 items-center border-r border-primary/10 bg-muted/60 px-3 text-primary">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  className="h-12 w-full bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="flex h-12 items-center px-3 text-muted-foreground hover:text-primary"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <label className="block text-xs font-semibold text-primary">Confirm password</label>
              <div className="flex items-center overflow-hidden rounded-2xl border border-primary/15 bg-white focus-within:ring-2 focus-within:ring-primary/30">
                <div className="flex h-12 items-center border-r border-primary/10 bg-muted/60 px-3 text-primary">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
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
                {loading ? "Updating…" : "Update password"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </motion.button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
