import type { BoardState, Coord } from '../game/types'

type Props = {
  board: BoardState
  title: string
  onCellClick?: (coord: Coord) => void
  onCellHover?: (coord: Coord | null) => void
  showShips?: boolean
  disabled?: boolean
  previewCells?: Coord[]
  previewValid?: boolean
}

function hasCoord(list: Coord[] | undefined, row: number, col: number): boolean {
  if (!list || list.length === 0) return false
  return list.some((c) => c.row === row && c.col === col)
}

function cellClass(
  board: BoardState,
  row: number,
  col: number,
  showShips: boolean,
  previewCells?: Coord[],
  previewValid?: boolean,
): string {
  const cell = board.grid[row][col]

  const parts = ['cell']

  if (cell.shot) {
    parts.push(cell.shipId ? 'hit' : 'miss')
  } else {
    parts.push('unknown')
  }

  if (showShips && cell.shipId) {
    parts.push('ship')
  }

  if (hasCoord(previewCells, row, col)) {
    parts.push(previewValid ? 'previewValid' : 'previewInvalid')
  }

  return parts.join(' ')
}

export default function Board({
  board,
  title,
  onCellClick,
  onCellHover,
  showShips = false,
  disabled = false,
  previewCells,
  previewValid,
}: Props) {
  return (
    <div className="boardWrap">
      <h2 className="board-label">{title}</h2>
      <div
        className="grid"
        role="grid"
        aria-label={title}
        style={{ gridTemplateColumns: `repeat(${board.grid.length}, 1fr)` }}
      >
        {board.grid.map((row, r) =>
          row.map((_, c) => {
            const coord = { row: r, col: c }
            const cell = board.grid[r][c]
            const clickable = Boolean(onCellClick) && !disabled && !cell.shot

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                className={cellClass(board, r, c, showShips, previewCells, previewValid)}
                onClick={clickable ? () => onCellClick!(coord) : undefined}
                onMouseEnter={onCellHover ? () => onCellHover(coord) : undefined}
                onMouseLeave={onCellHover ? () => onCellHover(null) : undefined}
                onFocus={onCellHover ? () => onCellHover(coord) : undefined}
                disabled={!clickable}
                aria-label={`Row ${r + 1} Col ${c + 1}`}
              />
            )
          }),
        )}
      </div>
    </div>
  )
}
