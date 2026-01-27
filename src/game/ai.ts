import { allShipsSunk, applyShot, getShipCells, hasAlreadyShot, isShipSunk, isValidCoord } from './board'
import type { BoardState, Coord, ShotResult } from './types'

export type AIDifficulty = 'easy' | 'medium' | 'hard'

function coordKey(c: Coord): string {
  return `${c.row},${c.col}`
}

function parseKey(key: string): Coord {
  const [r, c] = key.split(',').map((n) => Number(n))
  return { row: r, col: c }
}

export type AIState = {
  pendingTargets: string[]
  currentShipHitCells: string[]
}

export function createInitialAIState(): AIState {
  return { pendingTargets: [], currentShipHitCells: [] }
}

function neighbors4(c: Coord): Coord[] {
  return [
    { row: c.row - 1, col: c.col },
    { row: c.row + 1, col: c.col },
    { row: c.row, col: c.col - 1 },
    { row: c.row, col: c.col + 1 },
  ]
}

function addUniqueFront(queue: string[], key: string): void {
  if (!queue.includes(key)) queue.unshift(key)
}

function rebuildTargetsFromHits(board: BoardState, hitKeys: string[]): string[] {
  const targets: string[] = []

  for (const hk of hitKeys) {
    const h = parseKey(hk)
    for (const n of neighbors4(h)) {
      if (!isValidCoord(n)) continue
      if (hasAlreadyShot(board, n)) continue
      const k = coordKey(n)
      if (!targets.includes(k)) targets.push(k)
    }
  }

  return targets
}

function uniqueKeys(keys: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const k of keys) {
    if (seen.has(k)) continue
    seen.add(k)
    out.push(k)
  }
  return out
}

function hardTargetsFromHits(board: BoardState, hitKeys: string[]): string[] {
  const hits = hitKeys.map(parseKey).filter((c) => isValidCoord(c))
  if (hits.length === 0) return []

  if (hits.length === 1) {
    const h = hits[0]
    const around: string[] = []
    for (const n of neighbors4(h)) {
      if (!isValidCoord(n)) continue
      if (hasAlreadyShot(board, n)) continue
      around.push(coordKey(n))
    }
    return uniqueKeys(around)
  }

  const sameRow = hits.every((h) => h.row === hits[0].row)
  const sameCol = hits.every((h) => h.col === hits[0].col)

  if (!sameRow && !sameCol) {
    return rebuildTargetsFromHits(board, hitKeys)
  }

  const candidates: string[] = []

  if (sameRow) {
    const row = hits[0].row
    const cols = hits.map((h) => h.col)
    const minCol = Math.min(...cols)
    const maxCol = Math.max(...cols)

    for (let c = minCol; c <= maxCol; c++) {
      const cell = { row, col: c }
      if (hasAlreadyShot(board, cell)) continue
      candidates.push(coordKey(cell))
    }

    const left = { row, col: minCol - 1 }
    if (isValidCoord(left) && !hasAlreadyShot(board, left)) candidates.push(coordKey(left))
    const right = { row, col: maxCol + 1 }
    if (isValidCoord(right) && !hasAlreadyShot(board, right)) candidates.push(coordKey(right))
  } else {
    const col = hits[0].col
    const rows = hits.map((h) => h.row)
    const minRow = Math.min(...rows)
    const maxRow = Math.max(...rows)

    for (let r = minRow; r <= maxRow; r++) {
      const cell = { row: r, col }
      if (hasAlreadyShot(board, cell)) continue
      candidates.push(coordKey(cell))
    }

    const up = { row: minRow - 1, col }
    if (isValidCoord(up) && !hasAlreadyShot(board, up)) candidates.push(coordKey(up))
    const down = { row: maxRow + 1, col }
    if (isValidCoord(down) && !hasAlreadyShot(board, down)) candidates.push(coordKey(down))
  }

  return uniqueKeys(candidates)
}

function chooseRandomUnshot(board: BoardState, rng: () => number): Coord {
  const choices: Coord[] = []
  for (let r = 0; r < board.grid.length; r++) {
    for (let c = 0; c < board.grid[r].length; c++) {
      if (!board.grid[r][c].shot) choices.push({ row: r, col: c })
    }
  }
  if (choices.length === 0) {
    throw new Error('No remaining moves')
  }
  return choices[Math.floor(rng() * choices.length)]
}

export type AIMove = {
  coord: Coord
  result: ShotResult
  state: AIState
  gameOver: boolean
}

export function aiTakeTurn(
  board: BoardState,
  aiState: AIState,
  difficulty: AIDifficulty = 'medium',
  rng: () => number = Math.random,
): AIMove {
  const state: AIState = {
    pendingTargets: [...aiState.pendingTargets],
    currentShipHitCells: [...aiState.currentShipHitCells],
  }

  if (difficulty === 'easy') {
    state.pendingTargets = []
    state.currentShipHitCells = []
  } else if (difficulty === 'hard') {
    state.pendingTargets = hardTargetsFromHits(board, state.currentShipHitCells)
  }

  let coord: Coord | undefined

  while (state.pendingTargets.length > 0) {
    const key = state.pendingTargets.shift()!
    const c = parseKey(key)
    if (!isValidCoord(c)) continue
    if (hasAlreadyShot(board, c)) continue
    coord = c
    break
  }

  if (!coord) {
    coord = chooseRandomUnshot(board, rng)
  }

  const result = applyShot(board, coord)

  if (difficulty === 'easy') {
    state.pendingTargets = []
    state.currentShipHitCells = []
  } else if (difficulty === 'medium') {
    if (result.outcome === 'miss') {
      ;
    } else if (result.outcome === 'hit') {
      const hk = coordKey(coord)
      if (!state.currentShipHitCells.includes(hk)) state.currentShipHitCells.push(hk)

      for (const n of neighbors4(coord)) {
        if (!isValidCoord(n)) continue
        if (hasAlreadyShot(board, n)) continue
        addUniqueFront(state.pendingTargets, coordKey(n))
      }
    } else if (result.outcome === 'sunk' && result.shipId) {
      state.currentShipHitCells = []
      state.pendingTargets = []
      if (!isShipSunk(board, result.shipId)) {
        ;
      }
      for (const cell of getShipCells(board, result.shipId)) {
        if (!hasAlreadyShot(board, cell)) {
          state.pendingTargets.push(coordKey(cell))
        }
      }

      if (state.currentShipHitCells.length > 0) {
        state.pendingTargets = rebuildTargetsFromHits(board, state.currentShipHitCells)
      }
    }
  } else {
    if (result.outcome === 'miss') {
      ;
    } else if (result.outcome === 'hit') {
      const hk = coordKey(coord)
      if (!state.currentShipHitCells.includes(hk)) state.currentShipHitCells.push(hk)
      state.pendingTargets = hardTargetsFromHits(board, state.currentShipHitCells)
    } else if (result.outcome === 'sunk') {
      state.currentShipHitCells = []
      state.pendingTargets = []
    }
  }

  return {
    coord,
    result,
    state,
    gameOver: allShipsSunk(board),
  }
}
