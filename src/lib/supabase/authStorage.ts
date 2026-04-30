/**
 * Vaste Supabase Auth storage key (cookies + storage adapter).
 * Browser (`createBrowserClient`), server (`createServerClient`) en middleware
 * moeten allemaal dezelfde key gebruiken, anders worden sessies niet herkend.
 */
export const STRUCTURO_SUPABASE_AUTH_STORAGE_KEY = "structuro-auth";
