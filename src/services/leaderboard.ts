import { getSupabaseDebugInfo, logMissingSupabaseConfig, supabase } from '../lib/supabaseClient'

export type Difficulty = 'easy' | 'medium' | 'hard'

export type LeaderboardRow = {
  id: number
  name: string
  difficulty: Difficulty
  shots: number
  time_seconds: number
  created_at: string
}

type DifficultyOrAll = Difficulty | 'all'

export type SupabaseErrorInfo = {
  message: string
  details?: string | null
  hint?: string | null
  code?: string | null
  status?: number
}

export type LeaderboardResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: SupabaseErrorInfo; debug: ReturnType<typeof getSupabaseDebugInfo> }

function toErrorInfo(error: unknown): SupabaseErrorInfo {
  if (error && typeof error === 'object') {
    const e = error as { message?: string; details?: string | null; hint?: string | null; code?: string | null; status?: number }
    return {
      message: e.message ?? 'Unknown error',
      details: e.details ?? null,
      hint: e.hint ?? null,
      code: e.code ?? null,
      status: e.status,
    }
  }
  return { message: 'Unknown error' }
}

export async function loadLeaderboard(
  difficulty: DifficultyOrAll,
  limit: number = 20,
): Promise<LeaderboardResult<LeaderboardRow[]>> {
  if (!supabase) {
    logMissingSupabaseConfig()
    return { ok: false, error: { message: 'Supabase not configured' }, debug: getSupabaseDebugInfo() }
  }

  let query = supabase
    .from('leaderboard_scores')
    .select('id,name,difficulty,shots,time_seconds,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (difficulty !== 'all') {
    query = query.eq('difficulty', difficulty)
  }

  const debug = getSupabaseDebugInfo()
  console.info('[supabase] loadLeaderboard', { difficulty, limit, host: debug.urlHost })

  const { data, error } = await query
  if (error) {
    const info = toErrorInfo(error)
    console.error('[supabase] loadLeaderboard failed', info)
    return { ok: false, error: info, debug }
  }

  return { ok: true, data: (data ?? []) as LeaderboardRow[] }
}

export async function submitScore(input: {
  name: string
  difficulty: Difficulty
  shots: number
  time_seconds: number
}): Promise<LeaderboardResult<LeaderboardRow>> {
  if (!supabase) {
    logMissingSupabaseConfig()
    return { ok: false, error: { message: 'Supabase not configured' }, debug: getSupabaseDebugInfo() }
  }

  const debug = getSupabaseDebugInfo()
  console.info('[supabase] submitScore', { ...input, host: debug.urlHost })

  const { data, error } = await supabase
    .from('leaderboard_scores')
    .insert([
    {
      name: input.name,
      difficulty: input.difficulty,
      shots: input.shots,
      time_seconds: input.time_seconds,
    },
  ])
    .select()
    .single()

  if (error) {
    const info = toErrorInfo(error)
    console.error('[supabase] submitScore failed', info)
    return { ok: false, error: info, debug }
  }

  return { ok: true, data: data as LeaderboardRow }
}
