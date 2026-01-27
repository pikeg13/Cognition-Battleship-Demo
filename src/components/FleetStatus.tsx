import type { FleetShipStatus } from '../game/board'

type Props = {
  title: string
  fleet: FleetShipStatus[]
}

function ShipHits({ ship, label }: { ship: FleetShipStatus; label: string }) {
  const s = ship as unknown as { size?: number; cells?: { length: number } }
  const count = s.size ?? s.cells?.length ?? 0
  const safeHits = Math.max(0, Math.min(count, Math.floor(ship.hitsTaken)))

  return (
    <div className="shipHits" aria-label={`${label}: ${safeHits} of ${count} hits`}>
      {Array.from({ length: count }).map((_, i) => {
        const checked = safeHits >= i + 1
        return (
          <span
            key={i}
            className={['shipHitBox', checked ? 'shipHitBoxChecked' : ''].filter(Boolean).join(' ')}
            aria-hidden
          />
        )
      })}
    </div>
  )
}

export default function FleetStatus({ title, fleet }: Props) {
  return (
    <section className="fleet" aria-label={title}>
      <div className="fleetTitle">{title}</div>
      <div className="fleetList">
        {fleet.map((s) => {
          const isSunk = s.status === 'Sunk'
          const isDamaged = s.status === 'Damaged'
          const isAlive = s.status === 'Alive'

          return (
            <div
              key={s.type}
              className={[
                'fleetRow',
                isSunk ? 'fleetRowSunk' : '',
                isDamaged ? 'fleetRowDamaged' : '',
                isAlive ? 'fleetRowAlive' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="fleetLeft">
                <ShipHits ship={s} label={s.type} />
              </div>
              <div className="fleetMeta">
                <div className="fleetName">{s.type}</div>
                <div className="fleetState">{s.status}</div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
