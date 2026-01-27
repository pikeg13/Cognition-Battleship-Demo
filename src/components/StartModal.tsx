import { useEffect, useMemo, useState } from 'react'

type Props = {
  open: boolean
  initialName?: string
  onStart: (name: string) => void
}

function validateName(raw: string): { ok: boolean; value: string; error?: string } {
  const value = raw.trim()
  if (value.length < 2) return { ok: false, value, error: 'Name must be at least 2 characters.' }
  if (value.length > 20) return { ok: false, value, error: 'Name must be 20 characters or less.' }
  return { ok: true, value }
}

export default function StartModal({ open, initialName, onStart }: Props) {
  const [name, setName] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(initialName ?? '')
    setTouched(false)
  }, [open, initialName])

  const validation = useMemo(() => validateName(name), [name])
  const showError = open && touched && !validation.ok

  if (!open) return null

  return (
    <div className="modalOverlay" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label="Start game">
        <h2 className="modalTitle">Enter your name</h2>
        <form
          className="modalForm"
          onSubmit={(e) => {
            e.preventDefault()
            setTouched(true)
            const v = validateName(name)
            if (!v.ok) return
            onStart(v.value)
          }}
        >
          <label className="modalLabel" htmlFor="playerName">
            Name
          </label>
          <input
            id="playerName"
            className="modalInput"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            autoFocus
            inputMode="text"
            autoComplete="nickname"
          />
          {showError ? <div className="modalError">{validation.error}</div> : <div className="modalHint">2–20 characters</div>}
          <div className="modalActions">
            <button type="submit">Start</button>
          </div>
        </form>
      </div>
    </div>
  )
}
