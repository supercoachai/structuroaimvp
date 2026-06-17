import { STRUCTURO_SUPABASE_AUTH_STORAGE_KEY } from '@/lib/supabase/authStorage'

/** Gedeelde browser-auth opties; passkeys vereisen experimental opt-in in supabase-js ≥2.105. */
export const supabaseAuthClientOptions = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  storageKey: STRUCTURO_SUPABASE_AUTH_STORAGE_KEY,
  experimental: {
    passkey: true,
  },
} as const
