const SUPABASE_URL = "https://mpbbkslbyddvrijpiqpw.supabase.co/rest/v1/";
const SUPABASE_PUBLIC_KEY = "sb_publishable_GAIVKQnrmTybuOp37eH8qA_NRFBL6Iz";

// The website loads this configuration before it initializes the Supabase SDK.
// createClient needs the project URL, rather than the REST endpoint URL.
window.FawnKidsSupabaseConfig = {
  url: SUPABASE_URL.replace(/\/rest\/v1\/?$/, ""),
  anonKey: SUPABASE_PUBLIC_KEY
};
