import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Check,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { SpkLogo } from "@/components/SpkLogo";
import { useOTP } from "@/hooks/useOTP";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const RESEND_SECONDS = 60;

type Mode = "phone" | "email";

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("phone");

  // ====== Shared name-collection state (new phone users) ======
  const [needsName, setNeedsName] = useState(false);
  const [fullName, setFullName] = useState("");

  // ====== Phone OTP state ======
  const [phone, setPhone] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showSentCheck, setShowSentCheck] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { sendOTP, verifyOTP, loading: otpLoading, error: otpError, otpSent, reset: resetOTP, lastDevOtp } =
    useOTP();

  // ====== Email + password state ======
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const cleanPhone = () => `+91${phone.replace(/\D/g, "")}`;

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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ===== Phone handlers =====
  const handleSendPhoneOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length < 10) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    const result = await sendOTP(cleanPhone(), "phone");
    if (result.success) {
      setShowSentCheck(true);
      setTimeout(() => setShowSentCheck(false), 1800);
      startTimer();
    }
  };

  const handleResendPhone = async () => {
    if (secondsLeft > 0 || otpLoading) return;
    const result = await sendOTP(cleanPhone(), "phone");
    if (result.success) {
      setShowSentCheck(true);
      setTimeout(() => setShowSentCheck(false), 1800);
      startTimer();
      toast.success("OTP sent again");
    }
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.length !== 6) return;
    const result = await verifyOTP(cleanPhone(), "phone", otpInput);
    if (result.success) {
      if (result.is_new_user) {
        setNeedsName(true);
      } else if (result.role === "admin") {
        toast.success("Welcome back, admin");
        navigate({ to: "/admin" });
      } else {
        toast.success("Welcome back!");
        navigate({ to: "/" });
      }
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    // Save to profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", user.id);
    }
    toast.success(`Welcome, ${fullName.split(" ")[0]}!`);
    navigate({ to: "/" });
  };

  // ===== Email + password handler =====
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    if (!email.includes("@")) {
      setEmailError("Enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setEmailError("Password must be at least 6 characters");
      return;
    }
    setEmailLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setEmailError(error.message);
        return;
      }
      if (data.user) {
        // Fetch role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();
        if (profile?.role === "admin") {
          toast.success("Welcome back, admin");
          navigate({ to: "/admin" });
        } else {
          toast.success("Welcome back!");
          navigate({ to: "/" });
        }
      }
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setEmailLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    setOtpInput("");
    setSecondsLeft(0);
    setEmailError(null);
    if (timerRef.current) clearInterval(timerRef.current);
    resetOTP();
  };

  const mmss = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const sentTo = `mobile number ending in ${phone.replace(/\D/g, "").slice(-4)}`;

  return (
    <div
      className="safe-top safe-bottom relative flex min-h-[100dvh] flex-col items-center justify-start overflow-hidden px-6 pt-10 pb-10"
      style={{
        background:
          "radial-gradient(circle at 20% 0%, oklch(0.92 0.16 90 / 0.55), transparent 55%), radial-gradient(circle at 100% 30%, oklch(0.78 0.14 55 / 0.35), transparent 55%), linear-gradient(180deg, oklch(0.96 0.04 95) 0%, oklch(0.985 0.01 95) 100%)",
      }}
    >
      <Link
        to="/"
        className="absolute left-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-primary shadow-sm ring-1 ring-primary/10 backdrop-blur"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-2 right-2 text-4xl opacity-30"
        animate={{ y: [0, 10, 0], rotate: [0, 8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        🌿
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-4 left-2 text-3xl opacity-30"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        🍃
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="absolute -inset-2 rounded-full bg-secondary/30 blur-xl" />
            <SpkLogo size={92} className="logo-glow relative" />
          </motion.div>
          <h1 className="mt-4 font-display text-2xl font-extrabold">
            <span className="shimmer-text">SPK Natural Farming</span>
          </h1>
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-white/70 px-2.5 py-0.5 backdrop-blur">
            <Sparkles className="h-3 w-3 fill-secondary text-secondary" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              Fresh From Farm
            </span>
          </div>
        </div>

        <motion.div
          layout
          transition={{ layout: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
          className="rounded-3xl bg-white/85 p-5 shadow-[0_20px_60px_-20px_rgba(27,67,50,0.25)] ring-1 ring-primary/10 backdrop-blur"
        >
          {!needsName && (
            <>
              <h2 className="mb-1 font-display text-lg font-bold text-primary">
                {mode === "phone" && otpSent ? "Verify OTP" : "Sign in"}
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">
                {mode === "phone"
                  ? otpSent
                    ? "Enter the 6-digit code we sent you"
                    : "Get a one-time code on your phone"
                  : "Use your email and password"}
              </p>

              {/* Mode toggle */}
              {!(mode === "phone" && otpSent) && (
                <div className="mb-4 flex rounded-full bg-muted p-1">
                  {(
                    [
                      { id: "phone", label: "Phone", icon: Phone },
                      { id: "email", label: "Email", icon: Mail },
                    ] as const
                  ).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => switchMode(id)}
                      className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition-colors ${
                        mode === id ? "text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {mode === id && (
                        <motion.div
                          layoutId="modePill"
                          className="absolute inset-0 rounded-full bg-primary shadow"
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                      <Icon className="relative h-4 w-4" />
                      <span className="relative">{label}</span>
                    </button>
                  ))}
                </div>
              )}

              <AnimatePresence mode="wait" initial={false}>
                {/* ===== PHONE: send OTP ===== */}
                {mode === "phone" && !otpSent && (
                  <motion.form
                    key="phone-send"
                    onSubmit={handleSendPhoneOTP}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3"
                  >
                    <label className="block text-xs font-semibold text-primary">
                      Mobile number
                    </label>
                    <div className="flex items-center overflow-hidden rounded-2xl border border-primary/15 bg-white focus-within:ring-2 focus-within:ring-primary/30">
                      <div className="flex h-12 items-center border-r border-primary/10 bg-muted/60 px-3 text-sm font-semibold text-primary">
                        +91
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="9876543210"
                        autoComplete="tel"
                        className="h-12 w-full bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground"
                      />
                    </div>

                    {otpError && (
                      <p className="text-xs font-medium text-destructive">{otpError}</p>
                    )}

                    <motion.button
                      type="submit"
                      disabled={otpLoading}
                      whileTap={{ scale: 0.97 }}
                      className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-60"
                    >
                      {otpLoading ? "Sending OTP…" : "Send OTP"}
                      {!otpLoading && (
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      )}
                    </motion.button>
                  </motion.form>
                )}

                {/* ===== PHONE: verify OTP ===== */}
                {mode === "phone" && otpSent && (
                  <motion.form
                    key="phone-verify"
                    onSubmit={handleVerifyPhone}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3"
                  >
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
                        OTP sent to {sentTo}
                      </p>
                    </motion.div>

                    {lastDevOtp && (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                          Dev mode — your OTP
                        </p>
                        <p className="font-mono text-lg font-bold tracking-[0.4em] text-amber-900">
                          {lastDevOtp}
                        </p>
                      </div>
                    )}

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
                      <p className="text-center text-xs font-medium text-destructive">
                        {otpError}
                      </p>
                    ) : (
                      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                        <ShieldCheck className="h-3 w-3 text-success" />
                        Code expires in 5 minutes
                      </p>
                    )}

                    <motion.button
                      type="submit"
                      disabled={otpLoading || otpInput.length !== 6}
                      whileTap={{ scale: 0.97 }}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-60"
                    >
                      {otpLoading ? "Verifying…" : "Verify & Continue"}
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
                        ← Change number
                      </button>
                      <button
                        type="button"
                        onClick={handleResendPhone}
                        disabled={otpLoading || secondsLeft > 0}
                        className="font-semibold text-accent hover:text-primary disabled:cursor-not-allowed disabled:text-muted-foreground"
                      >
                        {secondsLeft > 0 ? `Resend OTP in ${mmss}` : "Resend OTP"}
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* ===== EMAIL + PASSWORD ===== */}
                {mode === "email" && (
                  <motion.form
                    key="email-login"
                    onSubmit={handleEmailLogin}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3"
                  >
                    <label className="block text-xs font-semibold text-primary">
                      Email address
                    </label>
                    <div className="flex items-center overflow-hidden rounded-2xl border border-primary/15 bg-white focus-within:ring-2 focus-within:ring-primary/30">
                      <div className="flex h-12 items-center border-r border-primary/10 bg-muted/60 px-3 text-primary">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        inputMode="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="h-12 w-full bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground"
                      />
                    </div>

                    <label className="block text-xs font-semibold text-primary">
                      Password
                    </label>
                    <div className="flex items-center overflow-hidden rounded-2xl border border-primary/15 bg-white focus-within:ring-2 focus-within:ring-primary/30">
                      <div className="flex h-12 items-center border-r border-primary/10 bg-muted/60 px-3 text-primary">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
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

                    {emailError && (
                      <p className="text-xs font-medium text-destructive">{emailError}</p>
                    )}

                    <div className="flex justify-end">
                      <Link
                        to="/forgot-password"
                        className="text-xs font-semibold text-accent hover:text-primary"
                      >
                        Forgot password?
                      </Link>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={emailLoading}
                      whileTap={{ scale: 0.97 }}
                      className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-60"
                    >
                      {emailLoading ? "Signing in…" : "Sign in"}
                      {!emailLoading && (
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      )}
                    </motion.button>

                    <p className="pt-1 text-center text-xs text-muted-foreground">
                      Don't have an account?{" "}
                      <Link to="/signup" className="font-semibold text-primary hover:underline">
                        Sign up
                      </Link>
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </>
          )}

          {needsName && (
            <motion.form
              key="name"
              onSubmit={handleNameSubmit}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <h2 className="font-display text-lg font-bold text-primary">
                One last step 👋
              </h2>
              <p className="text-xs text-muted-foreground">
                Tell us your name so we can personalise your experience.
              </p>
              <input
                type="text"
                autoFocus
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="h-12 w-full rounded-2xl border border-primary/15 bg-white px-4 text-base outline-none focus:ring-2 focus:ring-primary/30"
              />
              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </motion.form>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
