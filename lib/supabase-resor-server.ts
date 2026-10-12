import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Enbart för serverns skyddade rese-API. Importera aldrig i klientkomponenter. */
export function getResorSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Resor kräver NEXT_PUBLIC_SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY på servern.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
