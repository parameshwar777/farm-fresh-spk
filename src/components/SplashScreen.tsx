import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { SpkLogo } from "@/components/SpkLogo";
import { Leaf, Sparkles } from "lucide-react";

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export function SplashScreen({ onFinish, duration = 2400 }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(t);
  }, [duration]);

  return (
    <AnimatePresence onExitComplete={onFinish}>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, oklch(0.92 0.16 90 / 0.7), transparent 55%), radial-gradient(circle at 80% 80%, oklch(0.78 0.14 55 / 0.45), transparent 55%), linear-gradient(180deg, oklch(0.96 0.04 95) 0%, oklch(0.985 0.01 95) 100%)",
          }}
        >
          {/* Floating ambient leaves */}
          {[
            { x: "10%", y: "15%", d: 0, s: 36 },
            { x: "85%", y: "20%", d: 0.4, s: 28 },
            { x: "15%", y: "80%", d: 0.8, s: 30 },
            { x: "82%", y: "78%", d: 0.6, s: 32 },
          ].map((p, i) => (
            <motion.div
              key={i}
              className="pointer-events-none absolute opacity-40"
              style={{ left: p.x, top: p.y, fontSize: p.s }}
              initial={{ opacity: 0, y: -20, rotate: -20 }}
              animate={{
                opacity: [0, 0.55, 0.4],
                y: [0, 10, 0],
                rotate: [0, 12, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: p.d,
              }}
            >
              🌿
            </motion.div>
          ))}

          {/* Logo block */}
          <div className="relative" style={{ width: 220, height: 220 }}>
            {/* Expanding ripple rings */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border-2 border-primary/30"
                initial={{ scale: 0.6, opacity: 0.7 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: i * 0.5,
                }}
              />
            ))}

            {/* Rotating dashed ring */}
            <motion.div
              className="ring-dashed-anim absolute inset-0 opacity-70"
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            />

            {/* Logo */}
            <motion.div
              className="absolute inset-6 flex items-center justify-center"
              initial={{ scale: 0.4, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{
                duration: 0.9,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <SpkLogo size={170} className="logo-glow" />
            </motion.div>

            {/* Sparkles */}
            <motion.div
              className="absolute top-2 right-4 text-secondary"
              animate={{ rotate: 360, scale: [1, 1.4, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="h-5 w-5 fill-secondary" />
            </motion.div>
            <motion.div
              className="absolute bottom-4 left-2 text-accent"
              animate={{ rotate: -360, scale: [1, 1.3, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
              <Sparkles className="h-4 w-4 fill-accent" />
            </motion.div>
          </div>

          {/* Wordmark */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            className="mt-6 font-display text-3xl font-extrabold"
          >
            <span className="shimmer-text">SPK Natural Farming</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/70 px-3 py-1 backdrop-blur"
          >
            <Leaf className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold tracking-wide text-primary uppercase">
              Fresh From Farm
            </span>
          </motion.div>

          {/* Loading dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="mt-10 flex gap-1.5"
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-2 w-2 rounded-full bg-primary"
                animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.15,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
