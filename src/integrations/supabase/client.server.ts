// Server-only Supabase client — uses the service role key.
// NEVER import this from a client file (anything in src/components/, src/routes/*.tsx, src/store/, src/hooks/).
// Only import from server routes (src/routes/api/...) and server functions.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
