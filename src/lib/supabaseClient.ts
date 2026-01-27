import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let hasLoggedMissingConfig = false

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export function isSupabaseConfigured(): boolean {
  return Boolean(supabase)
}

export function getSupabaseDebugInfo() {
  return {
    urlPresent: Boolean(supabaseUrl),
    anonKeyPresent: Boolean(supabaseAnonKey),
    urlHost: supabaseUrl ? new URL(supabaseUrl).host : null,
  }
}

export function logMissingSupabaseConfig(): void {
  if (hasLoggedMissingConfig) return
  if (supabase) return
  hasLoggedMissingConfig = true
  console.error('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY; falling back to local leaderboard.')
}
