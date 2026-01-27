import { useEffect, useMemo, useState } from 'react'
import type { AIDifficulty } from '../game/ai'

type Props = {
  open: boolean
  name: string
  onNameChange: (name: string) => void
  errorMessage?: string | null
  onSaveName: () => void
  difficulty: AIDifficulty
  matchActive: boolean
  onSetDifficulty: (difficulty: AIDifficulty) => void
  onRestartMatch: () => void
  onClose: () => void
}

function validateName(raw: string): { ok: boolean; value: string; error?: string } {
  const value = raw.trim()
  if (value.length < 2) return { ok: false, value, error: 'Name must be at least 2 characters.' }
  if (value.length > 20) return { ok: false, value, error: 'Name must be 20 characters or less.' }
  return { ok: true, value }
}

export default function SettingsModal({
  open,
  name,
  onNameChange,
  errorMessage,
  onSaveName,
  difficulty,
  matchActive,
  onSetDifficulty,
  onRestartMatch,
  onClose,
}: Props) {
  const [view, setView] = useState<'menu' | 'name' | 'difficulty' | 'confirmDifficulty' | 'colorblind'>('menu')
  const [touched, setTouched] = useState(false)
  const [pendingDifficulty, setPendingDifficulty] = useState<AIDifficulty | null>(null)

  useEffect(() => {
    if (!open) return
    setView('menu')
    setTouched(false)
    setPendingDifficulty(null)
  }, [open])

  const validation = useMemo(() => validateName(name), [name])
  const showNameError = open && touched && !validation.ok

  if (!open) return null

  return (
    <div
      className="modalOverlay"
      role="presentation"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Settings">
        <h2 className="modalTitle">Settings</h2>

        {view === 'menu' ? (
          <div className="modalForm">
            <button type="button" className="btn btn-neutral" onClick={() => setView('name')}>
              Change Name
            </button>
            <button type="button" className="btn btn-neutral" onClick={() => setView('difficulty')}>
              Difficulty
            </button>
            <button type="button" className="btn btn-neutral" onClick={() => setView('colorblind')}>
              Colorblind Mode
            </button>
            <button
              type="button"
              className="btn btn-neutral"
              onClick={() => {
                onRestartMatch()
                onClose()
              }}
            >
              Restart Match
            </button>

            <div className="modalActions">
              <button type="button" className="btn btn-neutral" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : null}

        {view === 'name' ? (
          <form
            className="modalForm"
            onSubmit={(e) => {
              e.preventDefault()
              setTouched(true)
              if (!validation.ok) return
              onSaveName()
              setView('menu')
            }}
          >
            <label className="modalLabel" htmlFor="settingsPlayerName">
              Name
            </label>
            <input
              id="settingsPlayerName"
              className="modalInput"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={() => setTouched(true)}
              autoFocus
              inputMode="text"
              autoComplete="nickname"
            />

            {showNameError ? (
              <div className="modalError">{validation.error}</div>
            ) : (
              <div className="modalHint">2–20 characters</div>
            )}

            {errorMessage ? <div className="modalError">{errorMessage}</div> : null}

            <div className="modalActions">
              <button type="submit" className="btn btn-primary" disabled={!validation.ok}>
                Save
              </button>
              <button type="button" className="btn btn-neutral" onClick={() => setView('menu')}>
                Back
              </button>
            </div>
          </form>
        ) : null}

        {view === 'difficulty' ? (
          <div className="modalForm">
            <div className="modalHint">Current: {difficulty[0].toUpperCase() + difficulty.slice(1)}</div>

            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={d === difficulty ? 'btn btn-primary' : 'btn btn-neutral'}
                onClick={() => {
                  if (d === difficulty) return
                  if (matchActive) {
                    setPendingDifficulty(d)
                    setView('confirmDifficulty')
                    return
                  }
                  onSetDifficulty(d)
                  setView('menu')
                }}
              >
                {d === difficulty ? `✓ ${d[0].toUpperCase() + d.slice(1)}` : d[0].toUpperCase() + d.slice(1)}
              </button>
            ))}

            <div className="modalActions">
              <button type="button" className="btn btn-neutral" onClick={() => setView('menu')}>
                Back
              </button>
            </div>
          </div>
        ) : null}

        {view === 'confirmDifficulty' ? (
          <div className="modalForm">
            <div className="modalLabel">Change difficulty?</div>
            <div className="modalHint">
              Changing difficulty restarts the match. Your ship placements will stay the same, but the enemy fleet will re-deploy
              and all shots will reset.
            </div>

            <div className="modalActions">
              <button
                type="button"
                className="btn btn-primary"
                autoFocus
                onClick={() => {
                  if (!pendingDifficulty) {
                    setView('difficulty')
                    return
                  }
                  onSetDifficulty(pendingDifficulty)
                  onRestartMatch()
                  onClose()
                }}
              >
                Restart with new difficulty
              </button>
              <button
                type="button"
                className="btn btn-neutral"
                onClick={() => {
                  setPendingDifficulty(null)
                  setView('difficulty')
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {view === 'colorblind' ? (
          <div className="modalForm">
            <div className="modalHint">Colorblind mode is not available in this build.</div>
            <div className="modalActions">
              <button type="button" className="btn btn-neutral" onClick={() => setView('menu')}>
                Back
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
