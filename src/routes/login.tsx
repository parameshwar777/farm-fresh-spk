import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Mail, Phone, ShieldCheck, Sparkles, Check } from "lucide-react";
import { SpkLogo } from "@/components/SpkLogo";
import { useOTP, type OTPType } from "@/hooks/useOTP";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const RESEND_SECONDS = 60;

function maskPhone(phoneDigits: string) {
  // last 4 digits
  const last4 = phoneDigits.slice(-4);
  return `XXXXXX${last4}`;
}

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, user.length - 2))}@${domain}`;
}

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<OTPType>("phone");
  const [identifier, setIdentifier] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const [fullName, setFullName] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showSentCheck, setShowSentCheck] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { sendOTP, verifyOTP, loading, error, otpSent, reset } = useOTP();

  const cleanIdentifier = () =>
    mode === "phone" ? `+91${identifier.replace(/\D/g, "")}` : identifier.trim();

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "phone" && identifier.replace(/\D/g, "").length < 10) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    if (mode === "email" && !identifier.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    const result = await sendOTP(cleanIdentifier(), mode);
    if (result.success) {
      const masked =
        mode === "phone"
          ? `mobile number ending in ${identifier.replace(/\D/g, "").slice(-4)}`
          : maskEmail(identifier.trim());
      setSentTo(masked);
      setShowSentCheck(true);
      setTimeout(() => setShowSentCheck(false), 1800);
      startTimer();
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || loading) return;
    const result = await sendOTP(cleanIdentifier(), mode);
    if (result.success) {
      setShowSentCheck(true);
      setTimeout(() => setShowSentCheck(false), 1800);
      startTimer();
      toast.success("OTP sent again");
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.length !== 6) {
      return;
    }
    const result = await verifyOTP(cleanIdentifier(), mode, otpInput);
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
    toast.success(`Welcome, ${fullName.split(" ")[0]}!`);
    navigate({ to: "/" });
  };

  const switchMode = (m: OTPType) => {
    if (m === mode) return;
    setMode(m);
    setIdentifier("");
    setOtpInput("");
    setSentTo(null);
    setSecondsLeft(0);
    if (timerRef.current) clearInterval(timerRef.current);
    reset();
  };

  const mmss = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <div
      className="safe-top safe-bottom relative flex min-h-[100dvh] flex-col items-center justify-start px-6 pt-10 pb-10 overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 20% 0%, oklch(0.92 0.16 90 / 0.55), transparent 55%), radial-gradient(circle at 100% 30%, oklch(0.78 0.14 55 / 0.35), transparent 55%), linear-gradient(180deg, oklch(0.96 0.04 95) 0%, oklch(0.985 0.01 95) 100%)",
      }}
    >
      {/* Back link */}
      <Link
        to="/"
        className="absolute left-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-primary shadow-sm ring-1 ring-primary/10 backdrop-blur"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      {/* Decorative leaves */}
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
            <Sparkles className="h-3 w-3 text-secondary fill-secondary" />
            <span className="text-[10px] font-semibold tracking-wide text-primary uppercase">
              Fresh From Farm
            </span>
          </div>
        </div>

        {/* Card */}
        <motion.div
          layout
          transition={{ layout: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
          className="rounded-3xl bg-white/85 p-5 shadow-[0_20px_60px_-20px_rgba(27,67,50,0.25)] ring-1 ring-primary/10 backdrop-blur"
        >
          {!needsName && (
            <>
              <h2 className="mb-1 font-display text-lg font-bold text-primary">
                {otpSent ? "Verify OTP" : "Sign in / Sign up"}
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">
                {otpSent
                  ? `Enter the 6-digit code we sent you`
                  : "Get a one-time code on your phone or email"}
              </p>

              {/* Mode toggle */}
              {!otpSent && (
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
                {!otpSent ? (
                  <motion.form
                    key="send"
                    onSubmit={handleSend}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3"
                  >
                    <label className="block text-xs font-semibold text-primary">
                      {mode === "phone" ? "Mobile number" : "Email address"}
                    </label>
                    <div className="flex items-center overflow-hidden rounded-2xl border border-primary/15 bg-white focus-within:ring-2 focus-within:ring-primary/30">
                      {mode === "phone" && (
                        <div className="flex h-12 items-center border-r border-primary/10 bg-muted/60 px-3 text-sm font-semibold text-primary">
                          +91
                        </div>
                      )}
                      <input
                        type={mode === "phone" ? "tel" : "email"}
                        inputMode={mode === "phone" ? "numeric" : "email"}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder={
                          mode === "phone" ? "9876543210" : "you@example.com"
                        }
                        autoComplete={mode === "phone" ? "tel" : "email"}
                        className="h-12 w-full bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground"
                      />
                    </div>

                    {error && (
                      <p className="text-xs font-medium text-destructive">{error}</p>
                    )}

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileTap={{ scale: 0.97 }}
                      className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-60"
                    >
                      {loading ? "Sending OTP…" : "Send OTP"}
                      {!loading && (
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      )}
                    </motion.button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="verify"
                    onSubmit={handleVerify}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3"
                  >
                    {/* Sent confirmation */}
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
                        error
                          ? "border-destructive/50 focus:ring-destructive/30"
                          : "border-primary/15 focus:ring-primary/30"
                      }`}
                    />

                    {error ? (
                      <p className="text-center text-xs font-medium text-destructive">
                        {error}
                      </p>
                    ) : (
                      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                        <ShieldCheck className="h-3 w-3 text-success" />
                        Code expires in 5 minutes
                      </p>
                    )}

                    <motion.button
                      type="submit"
                      disabled={loading || otpInput.length !== 6}
                      whileTap={{ scale: 0.97 }}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-60"
                    >
                      {loading ? "Verifying…" : "Verify & Continue"}
                    </motion.button>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          reset();
                          setOtpInput("");
                          setSentTo(null);
                          setSecondsLeft(0);
                          if (timerRef.current) clearInterval(timerRef.current);
                        }}
                        className="font-semibold text-muted-foreground hover:text-primary"
                      >
                        ← Change {mode === "phone" ? "number" : "email"}
                      </button>
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={loading || secondsLeft > 0}
                        className="font-semibold text-accent hover:text-primary disabled:cursor-not-allowed disabled:text-muted-foreground"
                      >
                        {secondsLeft > 0 ? `Resend OTP in ${mmss}` : "Resend OTP"}
                      </button>
                    </div>
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

        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          By continuing you agree to our Terms & Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
