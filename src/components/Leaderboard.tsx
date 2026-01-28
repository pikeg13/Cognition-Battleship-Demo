import { useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { loadLeaderboard, type Difficulty as SupabaseDifficulty, type LeaderboardRow } from '../services/leaderboard'

type Props = {
  refreshSignal?: number
}

type DifficultyFilter = 'all' | SupabaseDifficulty
type SortColumn = 'shots' | 'time'

const FILTER_KEY = 'battleship_leaderboard_difficulty_filter'
const SORT_KEY = 'battleship_leaderboard_sort_column'

function loadFilter(): DifficultyFilter {
  const raw = (localStorage.getItem(FILTER_KEY) ?? '').trim()
  if (raw === 'easy' || raw === 'medium' || raw === 'hard' || raw === 'all') return raw
  return 'all'
}

function saveFilter(value: DifficultyFilter): void {
  localStorage.setItem(FILTER_KEY, value)
}

function loadSortColumn(): SortColumn {
  const raw = (localStorage.getItem(SORT_KEY) ?? '').trim()
  if (raw === 'shots' || raw === 'time') return raw
  return 'shots'
}

function saveSortColumn(value: SortColumn): void {
  localStorage.setItem(SORT_KEY, value)
}

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export default function Leaderboard({ refreshSignal }: Props) {
  const [filter, setFilter] = useState<DifficultyFilter>(() => loadFilter())
  const [sortColumn, setSortColumn] = useState<SortColumn>(() => loadSortColumn())
  const [loading, setLoading] = useState<boolean>(false)
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null)
  const [usingLocalFallback, setUsingLocalFallback] = useState<boolean>(!isSupabaseConfigured())
  const [fallbackReason, setFallbackReason] = useState<'not_configured' | 'error'>(
    isSupabaseConfigured() ? 'error' : 'not_configured',
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!isSupabaseConfigured()) {
        setRows(null)
        setUsingLocalFallback(true)
        setFallbackReason('not_configured')
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const result = await loadLeaderboard(filter, 20)
        if (cancelled) return
        if (result.ok) {
          setRows(result.data)
          setUsingLocalFallback(false)
        } else {
          setRows(null)
          setUsingLocalFallback(true)
          setFallbackReason('error')
        }
      } catch {
        if (cancelled) return
        setRows(null)
        setUsingLocalFallback(true)
        setFallbackReason('error')
      } finally {
        if (cancelled) return
        setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [filter])

  useEffect(() => {
    if (refreshSignal === undefined) return
    if (!isSupabaseConfigured()) return
    setLoading(true)
    loadLeaderboard(filter, 20)
      .then((result) => {
        if (result.ok) {
          setRows(result.data)
          setUsingLocalFallback(false)
          return
        }
        setRows(null)
        setUsingLocalFallback(true)
        setFallbackReason('error')
      })
      .catch(() => {
        setRows(null)
        setUsingLocalFallback(true)
        setFallbackReason('error')
      })
      .finally(() => setLoading(false))
  }, [filter, refreshSignal])

  const filteredRows = useMemo(() => {
    if (!rows) return []
    const sorted = [...rows].sort((a, b) => {
      if (sortColumn === 'shots') {
        return a.shots - b.shots
      } else {
        return a.time_seconds - b.time_seconds
      }
    })
    return sorted
  }, [rows, sortColumn])

  const handleSortClick = (column: SortColumn) => {
    setSortColumn(column)
    saveSortColumn(column)
  }

  const noteText =
    fallbackReason === 'not_configured'
      ? 'Supabase not configured'
      : 'Supabase unavailable'

  return (
    <section className="leaderboard" aria-label="Leaderboard">
      <div className="leaderboardHeader" role="group" aria-label="Leaderboard header">
        <div className="leaderboardTitle">
          <div>Leaderboard</div>
          {usingLocalFallback ? <div className="leaderboardNote">{noteText}</div> : null}
        </div>
        <label className="leaderboardFilterLabel">
          <span className="srOnly">Difficulty filter</span>
          <select
            className="leaderboardFilter"
            value={filter}
            onChange={(e) => {
              const next = e.target.value as DifficultyFilter
              setFilter(next)
              saveFilter(next)
            }}
            aria-label="Filter leaderboard by difficulty"
          >
            <option value="all">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>

      <div className="leaderboardBody">
        {loading ? (
          <div className="leaderboardEmpty">Loading scores…</div>
        ) : usingLocalFallback ? (
          <div className="leaderboardEmpty">
            {fallbackReason === 'not_configured'
              ? 'Configure Supabase to enable leaderboard (see README)'
              : 'Unable to load leaderboard — check connection'}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="leaderboardEmpty">No wins yet — beat the AI to set a record.</div>
        ) : (
          <div className="leaderboardTableContainer">
            <table className="leaderboardTable">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Name</th>
                  <th 
                    scope="col" 
                    onClick={() => handleSortClick('shots')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by shots"
                  >
                    Shots {sortColumn === 'shots' ? '▲' : ''}
                  </th>
                  <th 
                    scope="col" 
                    onClick={() => handleSortClick('time')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by time"
                  >
                    Time {sortColumn === 'time' ? '▲' : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((e, idx) => (
                  <tr key={`${e.id}-${e.created_at}-${idx}`}>
                    <td>{idx + 1}</td>
                    <td>{e.name}</td>
                    <td>{e.shots}</td>
                    <td>{formatDuration(e.time_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
