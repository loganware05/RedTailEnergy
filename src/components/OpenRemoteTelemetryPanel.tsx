import { Activity, AlertTriangle, Battery, Gauge, Radio, Sun, Users } from 'lucide-react'
import {
  formatOpenRemoteClock,
  getOpenRemoteSummary,
  getOpenRemoteTelemetrySnapshot,
  OPENREMOTE_DEMO_HOURS,
} from '../data/openremote/telemetry'
import { OR_ATTRIBUTES } from '../data/openremote/types'

interface SharedIndicators {
  /** Must match Demo Controls / role Headcount. */
  occupancyCount: number
  batterySocPct: number
  batterySocKwh: number
  solarAcPowerKw: number
  criticalLoadKw: number
  /** Kept in sync with hub pack inventory when provided. */
  portablePacksAvailable: number
}

interface Props {
  currentHour: number
  onJumpToHour: (hour: number) => void
  /** When set, shared metrics match hub indicators instead of drifting from the JSON alone. */
  shared?: SharedIndicators
}

function Attr({
  name,
  label,
  value,
  warn,
}: {
  name: string
  label: string
  value: string
  warn?: boolean
}) {
  return (
    <div
      className={`rounded-lg border px-2.5 py-2 ${
        warn ? 'border-crimson/40 bg-crimson/5' : 'border-edge bg-surface'
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-charcoal-muted font-semibold">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${warn ? 'text-crimson-ink' : 'text-charcoal'}`}>
        {value}
      </div>
      <div className="text-[10px] font-mono text-charcoal-muted truncate" title={name}>
        {name}
      </div>
    </div>
  )
}

export function OpenRemoteTelemetryPanel({ currentHour, onJumpToHour, shared }: Props) {
  const summary = getOpenRemoteSummary()
  const snap = getOpenRemoteTelemetrySnapshot(currentHour)
  const a = {
    ...snap.attributes,
    ...(shared
      ? {
          occupancyCount: shared.occupancyCount,
          batterySocPct: shared.batterySocPct,
          batterySocKwh: shared.batterySocKwh,
          solarAcPowerKw: shared.solarAcPowerKw,
          criticalLoadKw: shared.criticalLoadKw,
          portablePacksAvailable: shared.portablePacksAvailable,
        }
      : null),
  }
  const breachHour = summary.first_reserve_breach?.hour_index

  return (
    <section
      className="space-y-3 rounded-xl border border-edge bg-surface-alt p-3.5"
      aria-labelledby="openremote-telemetry-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3
            id="openremote-telemetry-title"
            className="text-sm font-semibold text-charcoal flex items-center gap-1.5"
          >
            <Radio className="w-4 h-4 text-crimson" aria-hidden="true" />
            OpenRemote Simulated Telemetry
          </h3>
          <p className="text-[11px] text-charcoal-muted mt-0.5">
            Embedded cloudy-night package ({summary.scenario_id}) · same asset attributes as
            openremote/core Manager · labeled {a.dataQuality}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md bg-gold-band text-gold-band-ink border border-edge-strong">
          Simulated
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-charcoal-muted">
        <span className="font-mono tabular-nums text-charcoal font-medium">
          OR hr {snap.hourIndex} · {formatOpenRemoteClock(snap.timestampLocal)}
        </span>
        <span>·</span>
        <span className="capitalize">{snap.flags.skyCondition.replaceAll('_', ' ')}</span>
        {!a.projectedReserveOk ? (
          <>
            <span>·</span>
            <span className="text-crimson-ink font-semibold">Reserve at risk overnight</span>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Attr
          name={OR_ATTRIBUTES.batterySocPct}
          label="Battery SOC"
          value={`${a.batterySocPct.toFixed(1)}%`}
          warn={a.reserveBreached || !a.projectedReserveOk}
        />
        <Attr
          name={OR_ATTRIBUTES.batterySocKwh}
          label="Battery energy"
          value={`${a.batterySocKwh.toFixed(2)} kWh`}
        />
        <Attr
          name={OR_ATTRIBUTES.batteryPowerKw}
          label="Battery power"
          value={`${a.batteryPowerKw >= 0 ? '+' : ''}${a.batteryPowerKw.toFixed(2)} kW`}
        />
        <Attr
          name={OR_ATTRIBUTES.solarAcPowerKw}
          label="Solar AC"
          value={`${a.solarAcPowerKw.toFixed(2)} kW`}
        />
        <Attr
          name={OR_ATTRIBUTES.criticalLoadKw}
          label="Critical load"
          value={`${a.criticalLoadKw.toFixed(2)} kW`}
        />
        <Attr
          name={OR_ATTRIBUTES.occupancyCount}
          label="Occupancy"
          value={`${a.occupancyCount}`}
        />
        <Attr
          name={OR_ATTRIBUTES.portablePacksAvailable}
          label="Packs ready"
          value={`${a.portablePacksAvailable}`}
        />
        <Attr
          name={OR_ATTRIBUTES.projectedReserveOk}
          label="Reserve OK?"
          value={a.projectedReserveOk ? 'Yes' : 'No'}
          warn={!a.projectedReserveOk}
        />
        <Attr
          name={OR_ATTRIBUTES.reserveBreached}
          label="Reserve breached"
          value={a.reserveBreached ? 'Yes' : 'No'}
          warn={a.reserveBreached}
        />
      </div>

      <ul className="flex flex-wrap gap-1.5 text-[11px]">
        {snap.flags.packRechargePaused ? (
          <li className="px-2 py-1 rounded-md bg-crimson/10 text-crimson-ink border border-crimson/25">
            Pack recharge paused
          </li>
        ) : null}
        {snap.flags.phonesShed ? (
          <li className="px-2 py-1 rounded-md bg-crimson/10 text-crimson-ink border border-crimson/25">
            Phone charging shed
          </li>
        ) : null}
        {snap.flags.lightingPartialEgress ? (
          <li className="px-2 py-1 rounded-md bg-crimson/10 text-crimson-ink border border-crimson/25">
            Lighting → egress only
          </li>
        ) : null}
        <li className="px-2 py-1 rounded-md bg-surface border border-edge text-charcoal-muted inline-flex items-center gap-1">
          <Gauge className="w-3 h-3" aria-hidden="true" />
          Unmet load total {summary.unmet_load_kwh_total} kWh
        </li>
      </ul>

      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-charcoal">Jump to OpenRemote demo hours</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onJumpToHour(OPENREMOTE_DEMO_HOURS.demoIncident)}
            className="min-h-[40px] px-3 py-2 rounded-xl border border-edge-strong bg-surface text-xs font-semibold text-charcoal hover:bg-surface-hover inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sun className="w-3.5 h-3.5 text-crimson" aria-hidden="true" />
            Demo 22:00 (OR hr {OPENREMOTE_DEMO_HOURS.demoIncident})
          </button>
          <button
            type="button"
            onClick={() => onJumpToHour(breachHour ?? OPENREMOTE_DEMO_HOURS.reserveBreach)}
            className="min-h-[40px] px-3 py-2 rounded-xl border border-edge-strong bg-surface text-xs font-semibold text-charcoal hover:bg-surface-hover inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-crimson" aria-hidden="true" />
            Reserve breach (OR hr {breachHour ?? OPENREMOTE_DEMO_HOURS.reserveBreach})
          </button>
        </div>
        <p className="text-[10px] text-charcoal-muted leading-snug">
          Scrubbing the outage timeline advances this OpenRemote hour (0–47). Battery{' '}
          <Battery className="inline w-3 h-3" aria-hidden="true" />, solar{' '}
          <Sun className="inline w-3 h-3" aria-hidden="true" />, load{' '}
          <Activity className="inline w-3 h-3" aria-hidden="true" />, occupancy{' '}
          <Users className="inline w-3 h-3" aria-hidden="true" />, and packs ready stay married to
          Demo Presentation Controls / role views. Attribute names match the Manager contract in{' '}
          <code className="font-mono">src/data/openremote/asset-attributes.json</code>.
        </p>
      </div>
    </section>
  )
}
