// Site card: what an arriving crew can read about the street side of the building, each line with its source.
// Streets, entrances, hydrants and wind come from the public record; the code block is labelled as code, not as a record.
// It never places a stair or an exit, and returns null for snapshots that predate Building.site.
import type { Building } from '../../../shared/building.ts'
import { entrances, faces, fmtInt, ftFromM, isOffice, nearestHydrants, officeCeiling, sqft, windOf, type Hydrant } from './siteCard.ts'
import './site.css'

const floorLabel = (f: number) => (f === 0 ? 'B1' : `Floor ${f}`)

function hydrantLine(label: string, h: Hydrant) {
  const kind = h.highPressure ? 'high-pressure' : 'low-pressure'
  return (
    <li key={label}>
      <span>{label}: {h.distanceM} m {h.dir}, {kind}</span>
      <small>
        {h.source}{h.year ? `, ${h.year}` : ''}{h.stale ? ' snapshot, positions may have changed, check on arrival' : ''}
      </small>
    </li>
  )
}

export function SiteCard({ building: b, floor }: { building: Building; floor: number | null }) {
  const site = b.site
  if (!site) return null

  const sides = faces(site)
  const doors = entrances(b)
  const { nearest, highPressure } = nearestHydrants(b.pins)
  const wind = windOf(b.pins.find((p) => p.layer === 'wind'))
  const office = isOffice(b.use)

  return (
    <section className="site-card" aria-label="Site information">
      <div className="site-block">
        <h3>Approach</h3>
        {sides.length > 0 ? (
          <ul>
            {sides.map((f) => (
              <li key={f.side}>{f.side} face: {f.streets.join(', ')}</li>
            ))}
            <li className="site-src"><small>Street per face · per OpenStreetMap</small></li>
          </ul>
        ) : (
          <p>Street faces not on public record</p>
        )}
        {doors.length > 0 ? (
          <ul>
            {doors.map((d) => (
              <li key={d.text}>
                <span>{d.text}{d.count > 1 ? ` (${d.count})` : ''}</span>
                <small>per OpenStreetMap</small>
              </li>
            ))}
          </ul>
        ) : (
          <p>No entrance on public record</p>
        )}
      </div>

      <div className="site-block">
        <h3>Water</h3>
        {nearest ? (
          <ul>
            {hydrantLine('Nearest hydrant', nearest)}
            {highPressure && highPressure !== nearest && hydrantLine('Nearest high-pressure hydrant', highPressure)}
          </ul>
        ) : (
          <p>No hydrant on record</p>
        )}
        {wind && (
          <ul>
            <li>
              <span>Wind {Math.round(wind.mph)} mph from {wind.from}, smoke to {wind.to}</span>
              <small>{wind.source} forecast model, not a station reading</small>
            </li>
          </ul>
        )}
      </div>

      <div className="site-block">
        <h3>This floor</h3>
        <ul>
          <li>
            <span>{floor === null ? 'Each floor' : floorLabel(floor)}: about {fmtInt(Math.round(site.floorAreaM2))} m² ({fmtInt(sqft(site.floorAreaM2))} sq ft)</span>
            <small>Floor area taken as the building footprint</small>
          </li>
          <li>
            <span>Longest span across a floor: {Math.round(site.maxSpanM)} m ({ftFromM(site.maxSpanM)} ft)</span>
            <small>Footprint geometry</small>
          </li>
          {office && (
            <li>
              <span>Code allows up to about {fmtInt(officeCeiling(site.floorAreaM2))} people (floor area ÷ 150 sq ft, CBC 1004.5): a ceiling, not a count</span>
              <small>Office use per assessor · code formula, not an occupancy record</small>
            </li>
          )}
        </ul>
      </div>

      {site.code.length > 0 && (
        <div className="site-block">
          <h3>Code requires</h3>
          <ul>
            {site.code.map((c) => (
              <li key={c.text}>
                <span>{c.text}</span>
                <small>{c.citation}</small>
              </li>
            ))}
          </ul>
          <p className="site-flag"><small>Code requirement, not a record</small></p>
        </div>
      )}
    </section>
  )
}
