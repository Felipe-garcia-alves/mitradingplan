import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://lbgoihpjmlwgcwzblnhe.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiZ29paHBqbWx3Z2N3emJsbmhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMjM1NDIsImV4cCI6MjA4OTY5OTU0Mn0.M906POw2D7gsJZHqCG5x-LUpNF5gwdcH4uOU7RwJ55g";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
