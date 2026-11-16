import { useId, useMemo } from 'react'
import { criticalLoadKw, OpenRemoteReplayHour } from '../data/openremote/types'

interface Props {
  hours: OpenRemoteReplayHour[]
  currentIndex: number
  reservePct?: number
}

/** OpenRemote-style 48h SOC / solar / critical-load chart (from Tompkins staff console). */
export function OpenRemoteEnergyChart({ hours, currentIndex, reservePct = 20 }: Props) {
  const gradId = useId().replace(/:/g, '')
  const w = 640
  const h = 200
  const pad = { t: 14, r: 12, b: 26, l: 36 }
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b

  const points = useMemo(() => {
    const maxKw = Math.max(
      8,
      ...hours.map((x) => Math.max(x.solar_kw, criticalLoadKw(x)))
    )
    const xAt = (i: number) => pad.l + (i / Math.max(hours.length - 1, 1)) * innerW
    const ySoc = (pct: number) => pad.t + (1 - pct / 100) * innerH
    const yKw = (kw: number) => pad.t + (1 - kw / maxKw) * innerH

    const soc = hours
      .map((hr, i) => `${xAt(i).toFixed(1)},${ySoc(hr.battery_soc_pct).toFixed(1)}`)
      .join(' ')
    const solar = hours
      .map((hr, i) => `${xAt(i).toFixed(1)},${yKw(hr.solar_kw).toFixed(1)}`)
      .join(' ')
    const load = hours
      .map((hr, i) => `${xAt(i).toFixed(1)},${yKw(criticalLoadKw(hr)).toFixed(1)}`)
      .join(' ')

    return {
      soc,
      solar,
      load,
      reserveY: ySoc(reservePct),
      cursorX: xAt(Math.min(Math.max(currentIndex, 0), Math.max(hours.length - 1, 0))),
      maxKw,
      ySoc,
      xAt,
    }
  }, [hours, currentIndex, reservePct, innerW, innerH, pad.l, pad.t])

  const idx = Math.min(Math.max(currentIndex, 0), Math.max(hours.length - 1, 0))

  return (
    <figure className="space-y-2">
      <figcaption className="text-xs font-semibold text-charcoal">
        48-hour battery, solar, and critical load
      </figcaption>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto rounded-lg border border-edge bg-surface"
        role="img"
        aria-label="OpenRemote energy replay chart showing battery SOC, solar kilowatts, and critical load"
      >
        <defs>
          <linearGradient id={`or-soc-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9a1b1b" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#9a1b1b" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 25, 50, 75, 100].map((pct) => (
          <g key={pct}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={points.ySoc(pct)}
              y2={points.ySoc(pct)}
              stroke="#d6cfc4"
              strokeWidth="1"
            />
            <text
              x={pad.l - 6}
              y={points.ySoc(pct) + 3}
              textAnchor="end"
              fill="#6b645c"
              fontSize="10"
              fontFamily="ui-monospace, monospace"
            >
              {pct}
            </text>
          </g>
        ))}

        <polyline
          fill={`url(#or-soc-${gradId})`}
          stroke="none"
          points={`${pad.l},${pad.t + innerH} ${points.soc} ${w - pad.r},${pad.t + innerH}`}
        />
        <polyline fill="none" stroke="#9a1b1b" strokeWidth="2.2" points={points.soc} />
        <polyline fill="none" stroke="#c4a035" strokeWidth="2" points={points.solar} />
        <polyline fill="none" stroke="#2f5d50" strokeWidth="2" points={points.load} />
        <line
          x1={pad.l}
          x2={w - pad.r}
          y1={points.reserveY}
          y2={points.reserveY}
          stroke="#b45309"
          strokeDasharray="5 4"
          strokeWidth="1.5"
        />
        <line
          x1={points.cursorX}
          x2={points.cursorX}
          y1={pad.t}
          y2={pad.t + innerH}
          stroke="#2a241c"
          strokeOpacity="0.45"
          strokeWidth="1.5"
        />
        <text x={pad.l} y={h - 8} fill="#6b645c" fontSize="10" fontFamily="ui-monospace, monospace">
          SOC % · hour 0→{Math.max(hours.length - 1, 0)} · cursor h{idx} · max {points.maxKw.toFixed(1)}{' '}
          kW
        </text>
      </svg>
      <ul className="flex flex-wrap gap-3 text-[11px] text-charcoal-muted">
        <li className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#9a1b1b]" aria-hidden="true" /> Battery SOC
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#c4a035]" aria-hidden="true" /> Solar kW
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#2f5d50]" aria-hidden="true" /> Critical load kW
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-[#b45309]" aria-hidden="true" /> 20% reserve
        </li>
      </ul>
    </figure>
  )
}
