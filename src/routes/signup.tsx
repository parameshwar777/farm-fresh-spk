import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  Sparkles,
} from "lucide-react";
import { SpkLogo } from "@/components/SpkLogo";
import { useOTP } from "@/hooks/useOTP";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

const RESEND_SECONDS = 60;

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, user.length - 2))}@${domain}`;
}

function SignupPage() {
  const navigate = useNavigate();
  const { sendOTP, verifyOTP, loading: otpLoading, error: otpError, otpSent, reset: resetOTP } =
    useOTP();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [otpInput, setOtpInput] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showSentCheck, setShowSentCheck] = useState(false);
  const [creating, setCreating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = () => {
    setSecondsLeft(RESEND_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
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
    const result = await sendOTP(email.trim(), "email");
    if (result.success) {
      setShowSentCheck(true);
      setTimeout(() => setShowSentCheck(false), 1800);
      startTimer();
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || otpLoading) return;
    const result = await sendOTP(email.trim(), "email");
    if (result.success) {
      setShowSentCheck(true);
      setTimeout(() => setShowSentCheck(false), 1800);
      startTimer();
      toast.success("OTP sent again");
    }
  };

  const handleVerifyAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.length !== 6) return;

    // 1) Verify the OTP via the same edge function (proves email ownership)
    const verifyResult = await verifyOTP(email.trim(), "email", otpInput);
    if (!verifyResult.success) return;

    // 2) Now actually create the account with email + password
    setCreating(true);
    try {
      // Sign out the temporary OTP session so we create a fresh password account
      await supabase.auth.signOut();

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName.trim() },
        },
      });
      if (error) {
        toast.error(error.message);
        setCreating(false);
        return;
      }

      // Update profile with full name
      if (data.user) {
        await supabase
          .from("profiles")
          .update({ full_name: fullName.trim() })
          .eq("id", data.user.id);
      }

      toast.success(`Welcome, ${fullName.split(" ")[0]}!`);
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setCreating(false);
    }
  };

  const mmss = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

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
          <AnimatePresence mode="wait" initial={false}>
            {!otpSent ? (
              <motion.form
                key="signup-form"
                onSubmit={handleSendOtp}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                <h2 className="font-display text-lg font-bold text-primary">Sign up</h2>
                <p className="text-xs text-muted-foreground">
                  We'll send a 6-digit code to your email to verify it.
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

                {(formError || otpError) && (
                  <p className="text-xs font-medium text-destructive">{formError || otpError}</p>
                )}

                <motion.button
                  type="submit"
                  disabled={otpLoading}
                  whileTap={{ scale: 0.97 }}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-60"
                >
                  {otpLoading ? "Sending OTP…" : "Send verification OTP"}
                  {!otpLoading && (
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  )}
                </motion.button>

                <p className="pt-1 text-center text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/login" className="font-semibold text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </motion.form>
            ) : (
              <motion.form
                key="verify"
                onSubmit={handleVerifyAndCreate}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                <h2 className="font-display text-lg font-bold text-primary">Verify email</h2>
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code we sent to your email.
                </p>

                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/10 px-3 py-2"
                >
                  <AnimatePresence mode="wait">
                    {showSentCheck ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 18 }}
                        className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-success text-white"
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </motion.div>
                    ) : (
                      <ShieldCheck key="shield" className="mt-0.5 h-4 w-4 text-success" />
                    )}
                  </AnimatePresence>
                  <p className="text-[11px] font-medium text-success-foreground/90">
                    OTP sent to {maskEmail(email)}
                  </p>
                </motion.div>

                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) =>
                    setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="••••••"
                  className={`h-14 w-full rounded-2xl border bg-white text-center font-mono text-2xl font-bold tracking-[0.6em] text-primary outline-none placeholder:text-muted-foreground/40 focus:ring-2 ${
                    otpError
                      ? "border-destructive/50 focus:ring-destructive/30"
                      : "border-primary/15 focus:ring-primary/30"
                  }`}
                />

                {otpError ? (
                  <p className="text-center text-xs font-medium text-destructive">{otpError}</p>
                ) : (
                  <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 text-success" />
                    Code expires in 5 minutes
                  </p>
                )}

                <motion.button
                  type="submit"
                  disabled={otpLoading || creating || otpInput.length !== 6}
                  whileTap={{ scale: 0.97 }}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-60"
                >
                  {creating ? "Creating account…" : otpLoading ? "Verifying…" : "Verify & Create account"}
                </motion.button>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      resetOTP();
                      setOtpInput("");
                      setSecondsLeft(0);
                      if (timerRef.current) clearInterval(timerRef.current);
                    }}
                    className="font-semibold text-muted-foreground hover:text-primary"
                  >
                    ← Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={otpLoading || secondsLeft > 0}
                    className="font-semibold text-accent hover:text-primary disabled:cursor-not-allowed disabled:text-muted-foreground"
                  >
                    {secondsLeft > 0 ? `Resend OTP in ${mmss}` : "Resend OTP"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
