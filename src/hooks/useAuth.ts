import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, type Profile } from "@/integrations/supabase/client";

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isMerchant: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * Single auth subscription for the whole app.
 *
 * Why: previously every route called `useAuth()` which mounted its own
 * onAuthStateChange listener AND started with `loading=true`. Result: every
 * tab switch flashed a blank/loading page for ~1–2s while the new component
 * re-fetched the session it already had.
 *
 * Now: AuthProvider mounts ONCE in __root.tsx. Every page reads the cached
 * value synchronously — tab switches are instant.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => {
          supabase
            .from("profiles")
            .select("*")
            .eq("id", sess.user.id)
            .maybeSingle()
            .then(({ data }) => setProfile(data as Profile | null));
        }, 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", sess.user.id)
          .maybeSingle()
          .then(({ data }) => setProfile(data as Profile | null));
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    session,
    user,
    profile,
    loading,
    isAdmin: profile?.role === "admin",
    isMerchant: profile?.role === "merchant",
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Fallback for any place mounted outside provider (shouldn't happen).
    return {
      session: null,
      user: null,
      profile: null,
      loading: true,
      isAdmin: false,
      isMerchant: false,
    };
  }
  return ctx;
}

export async function signOut() {
  await supabase.auth.signOut();
}
