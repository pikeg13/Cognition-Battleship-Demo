import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

type Props = {
  className?: string
  children: ReactNode
} & HTMLAttributes<HTMLDivElement>

const BoardsBackdropOverlay = forwardRef<HTMLDivElement, Props>(function BoardsBackdropOverlay(
  { className, children, ...rest }: Props,
  ref,
) {
  return (
    <div ref={ref} className={`board-overlay${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </div>
  )
})

export default BoardsBackdropOverlay
