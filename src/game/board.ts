import { GRID_SIZE, type BoardState, type Cell, type Coord, type ShotResult, type Ship, SHIP_SPECS, type ShipType } from './types'

function coordKey(c: Coord): string {
  return `${c.row},${c.col}`
}

function inBounds(c: Coord): boolean {
  return c.row >= 0 && c.row < GRID_SIZE && c.col >= 0 && c.col < GRID_SIZE
}

function makeEmptyGrid(): Cell[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ shot: false })),
  )
}

export function createEmptyBoard(): BoardState {
  return { grid: makeEmptyGrid(), ships: {} }
}

function canPlace(grid: Cell[][], cells: Coord[]): boolean {
  for (const c of cells) {
    if (!inBounds(c)) return false
    if (grid[c.row][c.col].shipId) return false
  }
  return true
}

function placeShip(grid: Cell[][], ship: Ship): void {
  for (const c of ship.cells) {
    grid[c.row][c.col].shipId = ship.id
  }
}

export function buildShipCells(start: Coord, size: number, horizontal: boolean): Coord[] {
  const cells: Coord[] = []
  for (let i = 0; i < size; i++) {
    cells.push({
      row: start.row + (horizontal ? 0 : i),
      col: start.col + (horizontal ? i : 0),
    })
  }
  return cells
}

export function canPlaceShipAt(board: BoardState, start: Coord, size: number, horizontal: boolean): boolean {
  const cells = buildShipCells(start, size, horizontal)
  return canPlace(board.grid, cells)
}

export function placeShipAt(
  board: BoardState,
  shipType: ShipType,
  start: Coord,
  size: number,
  horizontal: boolean,
): { ok: true; shipId: string } | { ok: false } {
  const cells = buildShipCells(start, size, horizontal)
  if (!canPlace(board.grid, cells)) return { ok: false }

  const id = `${shipType}-${Object.keys(board.ships).length}`
  const ship: Ship = {
    id,
    type: shipType,
    size,
    cells,
    hits: {},
    sunk: false,
  }

  placeShip(board.grid, ship)
  board.ships[id] = ship
  return { ok: true, shipId: id }
}

export function createRandomBoard(rng: () => number = Math.random): BoardState {
  const grid = makeEmptyGrid()
  const ships: Record<string, Ship> = {}

  for (const spec of SHIP_SPECS) {
    let placed = false

    for (let attempt = 0; attempt < 5000; attempt++) {
      const horizontal = rng() < 0.5
      const start: Coord = {
        row: Math.floor(rng() * GRID_SIZE),
        col: Math.floor(rng() * GRID_SIZE),
      }
      const cells = buildShipCells(start, spec.size, horizontal)
      if (!canPlace(grid, cells)) continue

      const id = `${spec.type}-${Object.keys(ships).length}`
      const ship: Ship = {
        id,
        type: spec.type,
        size: spec.size,
        cells,
        hits: {},
        sunk: false,
      }

      placeShip(grid, ship)
      ships[id] = ship
      placed = true
      break
    }

    if (!placed) {
      throw new Error(`Failed to place ship: ${spec.type}`)
    }
  }

  return { grid, ships }
}

export function hasAlreadyShot(board: BoardState, coord: Coord): boolean {
  return board.grid[coord.row][coord.col].shot
}

export function applyShot(board: BoardState, coord: Coord): ShotResult {
  const cell = board.grid[coord.row][coord.col]
  if (cell.shot) {
    throw new Error('Cell already shot')
  }

  cell.shot = true

  if (!cell.shipId) {
    return { outcome: 'miss' }
  }

  const ship = board.ships[cell.shipId]
  ship.hits[coordKey(coord)] = true

  const hitCount = Object.keys(ship.hits).length
  if (hitCount >= ship.size) {
    ship.sunk = true
    return { outcome: 'sunk', shipId: ship.id }
  }

  return { outcome: 'hit', shipId: ship.id }
}

export function allShipsSunk(board: BoardState): boolean {
  return Object.values(board.ships).every((s) => s.sunk)
}

export function getShipCells(board: BoardState, shipId: string): Coord[] {
  const ship = board.ships[shipId]
  return ship ? ship.cells : []
}

export function isShipSunk(board: BoardState, shipId: string): boolean {
  const ship = board.ships[shipId]
  return Boolean(ship?.sunk)
}

export function getShipType(board: BoardState, shipId: string): ShipType | undefined {
  const ship = board.ships[shipId]
  return ship?.type
}

export type ShipStatus = 'Alive' | 'Damaged' | 'Sunk'

export function getShipHitCount(ship: Ship, _board?: BoardState): number {
  return Object.keys(ship.hits).length
}

export function getShipStatus(ship: Ship): ShipStatus {
  const hits = getShipHitCount(ship)
  if (ship.sunk || hits >= ship.size) return 'Sunk'
  if (hits <= 0) return 'Alive'
  return 'Damaged'
}

export type FleetShipStatus = {
  type: ShipType
  size: number
  status: ShipStatus
  hitsTaken: number
}

export function getFleetStatus(board: BoardState): FleetShipStatus[] {
  return SHIP_SPECS.map((spec) => {
    const ship = Object.values(board.ships).find((s) => s.type === spec.type)
    return {
      type: spec.type,
      size: spec.size,
      status: ship ? getShipStatus(ship) : 'Alive',
      hitsTaken: ship ? getShipHitCount(ship, board) : 0,
    }
  })
}

export function isValidCoord(coord: Coord): boolean {
  return inBounds(coord)
}
