type Props = {
  open: boolean
  title: string
  message: string
  onStartBattle: () => void
  onRestartPlacement: () => void
}

export default function PlacementCompleteModal({
  open,
  title,
  message,
  onStartBattle,
  onRestartPlacement,
}: Props) {
  if (!open) return null

  return (
    <div className="modalOverlay" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h2 className="modalTitle">{title}</h2>
        <div className="modalHint">{message}</div>
        <div className="modalActions">
          <button type="button" className="btn btn-neutral" onClick={onRestartPlacement}>
            Restart placement
          </button>
          <button type="button" className="btn btn-primary" onClick={onStartBattle}>
            Start Battle
          </button>
        </div>
      </div>
    </div>
  )
}
