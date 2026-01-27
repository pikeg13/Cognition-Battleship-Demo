import { useEffect, useMemo, useRef } from 'react'
import BoardsBackdropOverlay from './BoardsBackdropOverlay'

type Outcome = 'win' | 'lose'

type Stats = {
  shots: number
  time: string
}

type Props = {
  outcome: Outcome
  stats?: Stats
  onPlayAgain: () => void
  onClose?: () => void
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  const selectors = ['button', '[href]', 'input', 'select', 'textarea', '[tabindex]:not([tabindex="-1"])']
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(selectors.join(',')))
  return nodes.filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)
}

export default function EndgameOverlay({ outcome, stats, onPlayAgain, onClose }: Props) {
  const playAgainRef = useRef<HTMLButtonElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    playAgainRef.current?.focus()
  }, [outcome])

  useEffect(() => {
    if (!onClose) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const title = outcome === 'win' ? 'Winner!' : 'Loser!'

  const summary = useMemo(() => {
    if (!stats) return null
    if (outcome === 'win') return `You sank the enemy fleet in ${stats.shots} shots — ${stats.time}`
    return `AI sank your fleet. Shots: ${stats.shots} — ${stats.time}`
  }, [outcome, stats])

  return (
    <BoardsBackdropOverlay
      className="endgameOverlay"
      role="dialog"
      aria-modal="true"
      aria-label="Game result"
      ref={containerRef}
      onKeyDown={(e) => {
        if (e.key !== 'Tab') return
        if (!containerRef.current) return

        const focusable = getFocusable(containerRef.current)
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement

        if (e.shiftKey) {
          if (active === first || active === containerRef.current) {
            e.preventDefault()
            last.focus()
          }
          return
        }

        if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }}
    >
      <div className="board-overlay__cta endgameOverlay__cta">
        <div className={`endgameOverlay__title ${outcome === 'win' ? 'endgameOverlay__title--win' : 'endgameOverlay__title--lose'}`}
        >
          {title}
        </div>
        {summary ? <div className="endgameOverlay__summary">{summary}</div> : null}

        <button ref={playAgainRef} type="button" className="btn btn-primary" onClick={onPlayAgain}>
          Play Again?
        </button>

        {onClose ? (
          <button type="button" className="endgameOverlay__secondary" onClick={onClose}>
            View final board
          </button>
        ) : null}
      </div>
    </BoardsBackdropOverlay>
  )
}
