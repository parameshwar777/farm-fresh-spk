import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, type Profile } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) listener first
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // defer profile fetch
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

    // 2) then existing session
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

  return {
    session,
    user,
    profile,
    loading,
    isAdmin: profile?.role === "admin",
    isMerchant: profile?.role === "merchant",
  };
}

export async function signOut() {
  await supabase.auth.signOut();
}
