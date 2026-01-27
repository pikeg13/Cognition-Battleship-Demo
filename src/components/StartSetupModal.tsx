import { useEffect, useMemo, useState } from 'react'
import type { ShipSpec } from '../game/types'

type Mode = 'modal' | 'panel'

type Props = {
  open: boolean
  mode: Mode
  name: string
  onNameChange: (name: string) => void
  horizontal: boolean
  onToggleHorizontal: () => void
  shipSpecs: ShipSpec[]
  currentShipIndex: number
  allShipsPlaced: boolean
  errorMessage?: string | null
  onAutoPlace: () => void
  onPlaceManually: () => void
  onStartBattle: () => void
}

function validateName(raw: string): { ok: boolean; value: string; error?: string } {
  const value = raw.trim()
  if (value.length < 2) return { ok: false, value, error: 'Name must be at least 2 characters.' }
  if (value.length > 20) return { ok: false, value, error: 'Name must be 20 characters or less.' }
  return { ok: true, value }
}

export default function StartSetupModal({
  open,
  mode,
  name,
  onNameChange,
  horizontal,
  onToggleHorizontal,
  shipSpecs,
  currentShipIndex,
  allShipsPlaced,
  errorMessage,
  onAutoPlace,
  onPlaceManually,
  onStartBattle,
}: Props) {
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setTouched(false)
  }, [open, mode])

  const validation = useMemo(() => validateName(name), [name])
  const nameOk = validation.ok
  const showNameError = open && touched && !validation.ok

  const shipLabel = shipSpecs[currentShipIndex]
    ? `${shipSpecs[currentShipIndex].type} (length ${shipSpecs[currentShipIndex].size})`
    : 'All ships'

  const canStartBattle = nameOk && allShipsPlaced

  const content = (
    <div
      className={mode === 'modal' ? 'modal setupModal' : 'setupPanel'}
      role={mode === 'modal' ? 'dialog' : 'region'}
      aria-modal={mode === 'modal' ? 'true' : undefined}
      aria-label={mode === 'modal' ? 'Game setup' : 'Setup panel'}
    >
      <h2 className={mode === 'modal' ? 'modalTitle' : 'setupTitle'}>Setup</h2>

      <div className={mode === 'modal' ? 'modalForm' : 'setupBody'}>
        <label className="modalLabel" htmlFor={mode === 'modal' ? 'setupPlayerName' : undefined}>
          Name
        </label>

        <input
          id={mode === 'modal' ? 'setupPlayerName' : undefined}
          className="modalInput"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onBlur={() => setTouched(true)}
          autoFocus={mode === 'modal'}
          inputMode="text"
          autoComplete="nickname"
        />

        {showNameError ? (
          <div className="modalError">{validation.error}</div>
        ) : (
          <div className="modalHint">2–20 characters</div>
        )}

        <div className="setupControls" role="group" aria-label="Setup controls">
          <button type="button" className="btn btn-neutral" onClick={onToggleHorizontal} aria-label="Toggle ship orientation">
            Orientation: {horizontal ? 'Horizontal' : 'Vertical'}
          </button>

          <button type="button" className="btn btn-neutral" onClick={onAutoPlace} disabled={!nameOk}>
            Auto-place ships
          </button>

          <button type="button" className="btn btn-neutral" onClick={onPlaceManually} disabled={!nameOk}>
            Place manually
          </button>

          <button type="button" className="btn btn-primary" onClick={onStartBattle} disabled={!canStartBattle}>
            Start Battle
          </button>
        </div>

        <div className="setupHelp">Place your ships or use Auto-place to start quickly.</div>

        {mode === 'panel' ? (
          <div className="setupLive" aria-live="polite">
            {allShipsPlaced ? 'All ships placed.' : `Place: ${shipLabel}.`}
          </div>
        ) : null}

        {errorMessage ? <div className="modalError">{errorMessage}</div> : null}

        <div className="setupShipList" role="list" aria-label="Ships">
          {shipSpecs.map((s, idx) => {
            const active = !allShipsPlaced && idx === currentShipIndex
            const placed = idx < currentShipIndex || allShipsPlaced
            const cls = ['setupShipRow', active ? 'active' : '', placed ? 'placed' : ''].filter(Boolean).join(' ')
            return (
              <div key={`${s.type}-${s.size}`} className={cls} role="listitem">
                <span className="setupShipName">{s.type}</span>
                <span className="setupShipSize">{s.size}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  if (!open) return null

  if (mode === 'panel') return content

  return (
    <div className="modalOverlay" role="presentation">
      {content}
    </div>
  )
}
