import { createClient } from "@supabase/supabase-js";

// Chave publishable (sistema novo). Projetada para ser publica no client —
// o acesso real e controlado por RLS, nao por sigilo da chave.
// A chave legada "anon" foi substituida; nao reintroduzir.
const SUPABASE_URL = "https://lbgoihpjmlwgcwzblnhe.supabase.co";
const SUPABASE_PUBLISHABLE = "sb_publishable_SH_r0yWJol7LiobGwqO6-Q_8gfIRH22";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE);
