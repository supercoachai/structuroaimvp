import { createBrowserClient } from '@supabase/ssr'
import { STRUCTURO_SUPABASE_AUTH_STORAGE_KEY } from '@/lib/supabase/authStorage'

const supabaseAuthClientOptions = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  storageKey: STRUCTURO_SUPABASE_AUTH_STORAGE_KEY,
} as const

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  // Tijdens build op Vercel kunnen env vars nog niet gezet zijn; voorkom crash
  if (!url || !key) {
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTk1NzM0NTYwMH0.placeholder',
      { auth: supabaseAuthClientOptions }
    )
  }
  return createBrowserClient(url, key, { auth: supabaseAuthClientOptions })
}

