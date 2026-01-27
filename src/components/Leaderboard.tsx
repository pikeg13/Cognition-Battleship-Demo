import type { LeaderboardEntry } from '../game/leaderboard'
import { useMemo, useState } from 'react'

type Props = {
  entries: LeaderboardEntry[]
}

type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard'

const FILTER_KEY = 'battleship_leaderboard_difficulty_filter'

function loadFilter(): DifficultyFilter {
  const raw = (localStorage.getItem(FILTER_KEY) ?? '').trim()
  if (raw === 'easy' || raw === 'medium' || raw === 'hard' || raw === 'all') return raw
  return 'all'
}

function saveFilter(value: DifficultyFilter): void {
  localStorage.setItem(FILTER_KEY, value)
}

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export default function Leaderboard({ entries }: Props) {
  const [filter, setFilter] = useState<DifficultyFilter>(() => loadFilter())

  const filtered = useMemo(() => {
    if (filter === 'all') return entries
    return entries.filter((e) => (e.difficulty ?? 'medium') === filter)
  }, [entries, filter])

  return (
    <section className="leaderboard" aria-label="Leaderboard">
      <div className="leaderboardHeader" role="group" aria-label="Leaderboard header">
        <div className="leaderboardTitle">Leaderboard</div>
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
        {filtered.length === 0 ? (
          <div className="leaderboardEmpty">No wins yet — beat the AI to set a record.</div>
        ) : (
          <table className="leaderboardTable">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Name</th>
                <th scope="col">Shots</th>
                <th scope="col">Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, idx) => (
                <tr key={`${e.name}-${e.dateISO}-${idx}`}>
                  <td>{idx + 1}</td>
                  <td>{e.name}</td>
                  <td>{e.shotsTaken}</td>
                  <td>{formatDuration(e.durationSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
