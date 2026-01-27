export type Coord = {
  row: number
  col: number
}

export type ShipType =
  | 'Carrier'
  | 'Battleship'
  | 'Cruiser'
  | 'Submarine'
  | 'Destroyer'

export type ShipSpec = {
  type: ShipType
  size: number
}

export const GRID_SIZE = 10

export const SHIP_SPECS: ShipSpec[] = [
  { type: 'Carrier', size: 5 },
  { type: 'Battleship', size: 4 },
  { type: 'Cruiser', size: 3 },
  { type: 'Submarine', size: 3 },
  { type: 'Destroyer', size: 2 },
]

export type Ship = {
  id: string
  type: ShipType
  size: number
  cells: Coord[]
  hits: Record<string, true>
  sunk: boolean
}

export type Cell = {
  shipId?: string
  shot: boolean
}

export type BoardState = {
  grid: Cell[][]
  ships: Record<string, Ship>
}

export type ShotOutcome = 'miss' | 'hit' | 'sunk'

export type ShotResult = {
  outcome: ShotOutcome
  shipId?: string
}
