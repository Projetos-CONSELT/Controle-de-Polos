// Supabase Client Initialization
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://cvlpedfzgsduitkglbbl.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2bHBlZGZ6Z3NkdWl0a2dsYmJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MTUyODEsImV4cCI6MjA4ODI5MTI4MX0.Y17sMDTcFYzcfXrzMdpYmaCLBiNZBVLL-tNSsXGv3lQ";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});