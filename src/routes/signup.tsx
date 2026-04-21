import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Mail, Lock, User, Eye, EyeOff, Sparkles } from "lucide-react";
import { SpkLogo } from "@/components/SpkLogo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!fullName.trim()) {
      setFormError("Please enter your full name");
      return;
    }
    if (!email.includes("@")) {
      setFormError("Enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      // Create the account directly — no email verification step
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName.trim() },
        },
      });

      if (signUpError) {
        setFormError(signUpError.message);
        setSubmitting(false);
        return;
      }

      // If we already have a session from signUp (email-confirmation OFF), we're done.
      if (signUpData?.session) {
        if (signUpData.user) {
          await supabase
            .from("profiles")
            .update({ full_name: fullName.trim() })
            .eq("id", signUpData.user.id);
        }
        toast.success(`Welcome, ${fullName.split(" ")[0]}!`);
        navigate({ to: "/" });
        return;
      }

      // No session yet — try to sign in immediately. Catch network errors so
      // we never bubble up "Failed to fetch" when the account was actually created.
      try {
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (signInError) {
          // Most likely: email confirmation is required on this Supabase project.
          if (signInError.message?.toLowerCase().includes("not confirmed")) {
            toast.success("Account created! Please check your email to confirm, then sign in.");
          } else {
            toast.success("Account created. Please sign in.");
          }
          navigate({ to: "/login" });
          return;
        }

        if (signInData?.user) {
          await supabase
            .from("profiles")
            .update({ full_name: fullName.trim() })
            .eq("id", signInData.user.id);
        }
        toast.success(`Welcome, ${fullName.split(" ")[0]}!`);
        navigate({ to: "/" });
      } catch {
        // Network blip on auto-sign-in — account exists, send to login
        toast.success("Account created. Please sign in.");
        navigate({ to: "/login" });
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setSubmitting(false);
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
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 flex flex-col items-center">
          <div className="relative">
            <div className="absolute -inset-2 rounded-full bg-secondary/30 blur-xl" />
            <SpkLogo size={84} className="logo-glow relative" />
          </div>
          <h1 className="mt-3 font-display text-2xl font-extrabold">
            <span className="shimmer-text">Create your account</span>
          </h1>
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-white/70 px-2.5 py-0.5 backdrop-blur">
            <Sparkles className="h-3 w-3 fill-secondary text-secondary" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              Join SPK Family
            </span>
          </div>
        </div>

        <div className="rounded-3xl bg-white/85 p-5 shadow-[0_20px_60px_-20px_rgba(27,67,50,0.25)] ring-1 ring-primary/10 backdrop-blur">
          <form onSubmit={handleSignup} className="space-y-3">
            <h2 className="font-display text-lg font-bold text-primary">Sign up</h2>
            <p className="text-xs text-muted-foreground">
              Create your account with email and password.
            </p>

            <label className="block text-xs font-semibold text-primary">Full name</label>
            <div className="flex items-center overflow-hidden rounded-2xl border border-primary/15 bg-white focus-within:ring-2 focus-within:ring-primary/30">
              <div className="flex h-12 items-center border-r border-primary/10 bg-muted/60 px-3 text-primary">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                className="h-12 w-full bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground"
              />
            </div>

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

            <label className="block text-xs font-semibold text-primary">Password</label>
            <div className="flex items-center overflow-hidden rounded-2xl border border-primary/15 bg-white focus-within:ring-2 focus-within:ring-primary/30">
              <div className="flex h-12 items-center border-r border-primary/10 bg-muted/60 px-3 text-primary">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
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

            {formError && (
              <p className="text-xs font-medium text-destructive">{formError}</p>
            )}

            <motion.button
              type="submit"
              disabled={submitting}
              whileTap={{ scale: 0.97 }}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-60"
            >
              {submitting ? "Creating account…" : "Create account"}
              {!submitting && (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              )}
            </motion.button>

            <p className="pt-1 text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
