import { useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  CloudLightning,
  CloudMoon,
  Gauge,
  Radio,
  Sun,
  Zap,
} from 'lucide-react'
import { OpenRemoteEnergyChart } from './OpenRemoteEnergyChart'
import {
  formatOpenRemoteClock,
  getOpenRemoteEnergyTotals,
  getOpenRemoteHours,
  getOpenRemoteSummary,
  getOpenRemoteTelemetrySnapshot,
  OPENREMOTE_DEMO_HOURS,
  OPENREMOTE_SCENARIOS,
  type OpenRemoteScenarioId,
} from '../data/openremote/telemetry'
import { OR_ATTRIBUTES } from '../data/openremote/types'

interface SharedIndicators {
  occupancyCount: number
  batterySocPct: number
  batterySocKwh: number
  solarAcPowerKw: number
  criticalLoadKw: number
  portablePacksAvailable: number
}

interface Props {
  currentHour: number
  onJumpToHour: (hour: number) => void
  shared?: SharedIndicators
  defaultOpen?: boolean
  scenario: OpenRemoteScenarioId
  onChangeScenario: (scenario: OpenRemoteScenarioId) => void
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

export function OpenRemoteTelemetryPanel({
  currentHour,
  onJumpToHour,
  shared,
  defaultOpen = false,
  scenario,
  onChangeScenario,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const summary = getOpenRemoteSummary(scenario)
  const hours = getOpenRemoteHours(scenario)
  const totals = getOpenRemoteEnergyTotals(scenario)
  const snap = getOpenRemoteTelemetrySnapshot(currentHour, scenario)
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
  const reserveAtRisk = !a.projectedReserveOk
  const hourIdx = Math.min(Math.max(Math.round(currentHour), 0), Math.max(hours.length - 1, 0))
  const siteLat = summary.site?.latitude
  const siteLon = summary.site?.longitude

  return (
    <section
      className="rounded-xl border border-edge-strong bg-surface-alt overflow-hidden"
      aria-labelledby="openremote-telemetry-title"
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="openremote-telemetry-body"
        className="w-full min-h-[56px] px-3.5 py-3 flex items-center justify-between gap-3 text-left hover:bg-surface-hover/80 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-crimson text-white flex items-center justify-center shrink-0 border border-black/10 shadow-xs">
            <Radio className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 id="openremote-telemetry-title" className="text-sm font-bold text-charcoal">
                OpenRemote Simulated Telemetry
              </h3>
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-gold-band text-gold-band-ink border border-edge-strong">
                Simulated
              </span>
            </div>
            <p
              className={`text-[11px] mt-0.5 truncate ${
                reserveAtRisk ? 'font-semibold text-crimson-ink' : 'text-charcoal-muted'
              }`}
            >
              {scenario === 'hurricane-isaias' ? 'Isaias' : 'Cloudy night'} · OR hr {snap.hourIndex} ·{' '}
              {formatOpenRemoteClock(snap.timestampLocal)} · {totals.solar_generated_kwh.toFixed(0)}{' '}
              kWh solar / {totals.load_served_kwh.toFixed(0)} kWh served
              {reserveAtRisk ? ' · Reserve at risk' : ''}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-charcoal-muted shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div id="openremote-telemetry-body" className="space-y-3 px-3.5 pb-3.5 border-t border-edge">
          <p className="text-[11px] text-charcoal-muted pt-3">
            {summary.label}. Battery / solar / load / occupancy live in the strip above — this panel
            keeps OpenRemote-only signals, the energy graph, and scenario power totals.
            {siteLat != null && siteLon != null ? (
              <>
                {' '}
                Install point{' '}
                <span className="font-mono tabular-nums">
                  {siteLat.toFixed(5)}, {siteLon.toFixed(5)}
                </span>
                .
              </>
            ) : null}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label="OpenRemote scenario">
            {OPENREMOTE_SCENARIOS.map((item) => {
              const energy = getOpenRemoteEnergyTotals(item.id)
              const active = scenario === item.id
              const Icon = item.id === 'hurricane-isaias' ? CloudLightning : CloudMoon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeScenario(item.id)}
                  aria-pressed={active}
                  className={`min-h-[72px] px-3 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-crimson text-white border-crimson shadow-xs'
                      : 'bg-surface border-edge-strong text-charcoal hover:bg-surface-hover'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{item.title}</span>
                  </div>
                  <p className={`text-[10px] mt-1 ${active ? 'text-white/85' : 'text-charcoal-muted'}`}>
                    {item.blurb}
                  </p>
                  <p
                    className={`mt-1.5 text-[11px] font-mono tabular-nums font-semibold inline-flex items-center gap-1 ${
                      active ? 'text-white' : 'text-charcoal'
                    }`}
                  >
                    <Zap className="w-3 h-3" aria-hidden="true" />
                    {energy.solar_generated_kwh.toFixed(1)} kWh gen · {energy.load_served_kwh.toFixed(1)}{' '}
                    kWh conducted
                    {energy.unmet_load_kwh_total > 0
                      ? ` · ${energy.unmet_load_kwh_total.toFixed(1)} unmet`
                      : ''}
                  </p>
                </button>
              )
            })}
          </div>

          <OpenRemoteEnergyChart hours={hours} currentIndex={hourIdx} />

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-charcoal-muted">
            <span className="font-mono tabular-nums text-charcoal font-medium">
              OR hr {snap.hourIndex} · {formatOpenRemoteClock(snap.timestampLocal)}
            </span>
            <span>·</span>
            <span className="capitalize">{snap.flags.skyCondition.replaceAll('_', ' ')}</span>
            {reserveAtRisk ? (
              <>
                <span>·</span>
                <span className="text-crimson-ink font-semibold">Reserve at risk overnight</span>
              </>
            ) : null}
          </div>

          {/* Non-duplicated OpenRemote-only attributes (strip already shows SOC/solar/load/occupancy) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Attr
              name={OR_ATTRIBUTES.batteryPowerKw}
              label="Battery power"
              value={`${a.batteryPowerKw >= 0 ? '+' : ''}${a.batteryPowerKw.toFixed(2)} kW`}
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
            {hours[hourIdx]?.weather_obs ? (
              <>
                <Attr
                  name="shortwaveRadiationWm2"
                  label="GHI"
                  value={`${hours[hourIdx].weather_obs!.shortwave_radiation_wm2.toFixed(0)} W/m²`}
                />
                <Attr
                  name="cloudCoverPct"
                  label="Cloud cover"
                  value={`${hours[hourIdx].weather_obs!.cloud_cover_pct.toFixed(0)}%`}
                />
              </>
            ) : null}
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
              Unmet load total {totals.unmet_load_kwh_total} kWh
            </li>
          </ul>

          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-charcoal">Jump to demo hours</div>
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
          </div>
        </div>
      ) : null}
    </section>
  )
}
