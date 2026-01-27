type Props = {
  message: string
  visible: boolean
}

export default function ShotResultPopup({ message, visible }: Props) {
  if (!visible) return null

  return (
    <div className="shotPopupHost" aria-live="polite">
      <div className="shotPopup" role="status">
        {message}
      </div>
    </div>
  )
}
