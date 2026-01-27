import { useEffect, useMemo, useState } from 'react'

export type Difficulty = 'easy' | 'medium' | 'hard'

type Step = 1 | 2 | 3

type Props = {
  open: boolean
  initialName: string
  initialDifficulty: Difficulty
  onCancel: () => void
  onCompleteAutoPlace: (name: string, difficulty: Difficulty) => void
  onCompleteManualPlace: (name: string, difficulty: Difficulty) => void
}

function validateName(raw: string): { ok: boolean; value: string; error?: string } {
  const value = raw.trim()
  if (value.length < 2) return { ok: false, value, error: 'Name must be at least 2 characters.' }
  if (value.length > 20) return { ok: false, value, error: 'Name must be 20 characters or less.' }
  return { ok: true, value }
}

export default function NewGameWizardModal({
  open,
  initialName,
  initialDifficulty,
  onCancel,
  onCompleteAutoPlace,
  onCompleteManualPlace,
}: Props) {
  const [step, setStep] = useState<Step>(1)
  const [name, setName] = useState('')
  const [touched, setTouched] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')

  useEffect(() => {
    if (!open) return
    setStep(1)
    setName(initialName)
    setTouched(false)
    setDifficulty(initialDifficulty)
  }, [open, initialName, initialDifficulty])

  const validation = useMemo(() => validateName(name), [name])

  if (!open) return null

  return (
    <div className="modalOverlay" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label="New game">
        <h2 className="modalTitle">New Game</h2>

        <div className="wizardSteps" aria-label="Wizard progress">
          <div className={step === 1 ? 'wizardStep active' : 'wizardStep'}>1. Name</div>
          <div className={step === 2 ? 'wizardStep active' : 'wizardStep'}>2. Difficulty</div>
          <div className={step === 3 ? 'wizardStep active' : 'wizardStep'}>3. Place ships</div>
        </div>

        {step === 1 ? (
          <div className="modalForm">
            <label className="modalLabel" htmlFor="wizardName">
              Player name
            </label>
            <input
              id="wizardName"
              className="modalInput"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              autoFocus
              inputMode="text"
              autoComplete="nickname"
            />
            {touched && !validation.ok ? (
              <div className="modalError">{validation.error}</div>
            ) : (
              <div className="modalHint">2–20 characters</div>
            )}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="wizardCards" role="radiogroup" aria-label="AI difficulty">
            <button
              type="button"
              className={difficulty === 'easy' ? 'wizardCard selected' : 'wizardCard'}
              role="radio"
              aria-checked={difficulty === 'easy'}
              onClick={() => setDifficulty('easy')}
            >
              <div className="wizardCardTitle">Easy</div>
              <div className="wizardCardHint">Random shots.</div>
            </button>
            <button
              type="button"
              className={difficulty === 'medium' ? 'wizardCard selected' : 'wizardCard'}
              role="radio"
              aria-checked={difficulty === 'medium'}
              onClick={() => setDifficulty('medium')}
            >
              <div className="wizardCardTitle">Medium</div>
              <div className="wizardCardHint">Targets around hits.</div>
            </button>
            <button
              type="button"
              className={difficulty === 'hard' ? 'wizardCard selected' : 'wizardCard'}
              role="radio"
              aria-checked={difficulty === 'hard'}
              onClick={() => setDifficulty('hard')}
            >
              <div className="wizardCardTitle">Hard</div>
              <div className="wizardCardHint">Finishes ships efficiently.</div>
            </button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="modalForm">
            <div className="wizardHint">Tip: Press R to rotate while placing ships.</div>
            <div className="wizardActions">
              <button
                type="button"
                className="btn btn-neutral"
                onClick={() => {
                  const v = validateName(name)
                  if (!v.ok) {
                    setStep(1)
                    setTouched(true)
                    return
                  }
                  onCompleteAutoPlace(v.value, difficulty)
                }}
              >
                Auto-place
              </button>
              <button
                type="button"
                className="btn btn-neutral"
                onClick={() => {
                  const v = validateName(name)
                  if (!v.ok) {
                    setStep(1)
                    setTouched(true)
                    return
                  }
                  onCompleteManualPlace(v.value, difficulty)
                }}
              >
                Place manually
              </button>
            </div>
          </div>
        ) : null}

        <div className="modalActions wizardNav">
          <button type="button" className="btn btn-neutral" onClick={onCancel}>
            Cancel
          </button>
          <div className="wizardNavSpacer" aria-hidden="true" />
          {step > 1 ? (
            <button type="button" className="btn btn-neutral" onClick={() => setStep((s) => (s - 1) as Step)}>
              Back
            </button>
          ) : null}
          {step < 3 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (step === 1) {
                  setTouched(true)
                  if (!validation.ok) return
                }
                setStep((s) => (s + 1) as Step)
              }}
              disabled={step === 1 && !validation.ok}
            >
              Continue
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
