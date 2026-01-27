export type LeaderboardEntry = {
  name: string
  shotsTaken: number
  durationSeconds: number
  dateISO: string
  difficulty: 'easy' | 'medium' | 'hard'
}

const STORAGE_KEY = 'battleship.leaderboard.v1'

function safeParse(raw: string | null): LeaderboardEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((e) => e && typeof e === 'object')
      .map((e) => e as Partial<LeaderboardEntry>)
      .filter(
        (e) =>
          typeof e.name === 'string' &&
          typeof e.shotsTaken === 'number' &&
          typeof e.durationSeconds === 'number' &&
          typeof e.dateISO === 'string',
      )
      .map((e) => {
        const rawDifficulty = (e as { difficulty?: unknown }).difficulty
        const difficulty = rawDifficulty === 'easy' || rawDifficulty === 'medium' || rawDifficulty === 'hard' ? rawDifficulty : 'medium'
        return {
          name: e.name!,
          shotsTaken: e.shotsTaken!,
          durationSeconds: e.durationSeconds!,
          dateISO: e.dateISO!,
          difficulty,
        }
      })
  } catch {
    return []
  }
}

export function loadLeaderboard(): LeaderboardEntry[] {
  return safeParse(localStorage.getItem(STORAGE_KEY))
}

export function saveLeaderboard(entries: LeaderboardEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (a.shotsTaken !== b.shotsTaken) return a.shotsTaken - b.shotsTaken
  if (a.durationSeconds !== b.durationSeconds) return a.durationSeconds - b.durationSeconds
  if (a.dateISO === b.dateISO) return 0
  return a.dateISO > b.dateISO ? -1 : 1
}

export function addScore(entry: LeaderboardEntry): LeaderboardEntry[] {
  const existing = loadLeaderboard()
  const next = [...existing, entry].sort(compareEntries).slice(0, 10)
  saveLeaderboard(next)
  return next
}

export function clearLeaderboard(): void {
  localStorage.removeItem(STORAGE_KEY)
}
