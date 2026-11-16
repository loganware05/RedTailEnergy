import cloudyNight from './cloudy_night_48h.json'
import hurricaneIsaias from './hurricane_isaias_48h.json'
import {
  OpenRemoteAttributeSnapshot,
  OpenRemoteEnergyTotals,
  OpenRemoteReplayHour,
  OpenRemoteReplayPackage,
  OpenRemoteScenarioSummary,
  toOpenRemoteSnapshot,
} from './types'

export type OpenRemoteScenarioId = 'cloudy-night' | 'hurricane-isaias'

const packages: Record<OpenRemoteScenarioId, OpenRemoteReplayPackage> = {
  'cloudy-night': cloudyNight as OpenRemoteReplayPackage,
  'hurricane-isaias': hurricaneIsaias as OpenRemoteReplayPackage,
}

export const OPENREMOTE_SCENARIOS: Array<{
  id: OpenRemoteScenarioId
  title: string
  blurb: string
}> = [
  {
    id: 'cloudy-night',
    title: 'Cloudy night package',
    blurb: 'Planning replay + Open-Meteo GHI/cloud at install point',
  },
  {
    id: 'hurricane-isaias',
    title: 'Hurricane Isaias weather',
    blurb: 'Open-Meteo archive at install point · Aug 2020',
  },
]

export const OPENREMOTE_DEMO_HOURS = {
  /** Staff pause pack recharge + storm evening — matches Tompkins Demo 22:00 */
  demoIncident: 4,
  /** First battery reserve floor breach (cloudy-night package) */
  reserveBreach: 8,
} as const

/** Shared live indicators driven by the active OpenRemote scenario hour. */
export interface OpenRemoteAlignedIndicators {
  occupancyCount: number
  portablePacksAvailable: number
  batterySocPct: number
  batterySocKwh: number
  solarAcPowerKw: number
  criticalLoadKw: number
  projectedReserveOk: boolean
  reserveBreached: boolean
  phonesShed: boolean
  lightingPartialEgress: boolean
  packRechargePaused: boolean
  skyCondition: string
  /** Map OpenRemote sky to Red Tail weather toggle. */
  weatherMode: 'clear' | 'storm'
}

function packageFor(scenario: OpenRemoteScenarioId = 'cloudy-night'): OpenRemoteReplayPackage {
  return packages[scenario] ?? packages['cloudy-night']
}

export function getOpenRemotePackage(scenario: OpenRemoteScenarioId = 'cloudy-night'): OpenRemoteReplayPackage {
  return packageFor(scenario)
}

export function getOpenRemoteSummary(
  scenario: OpenRemoteScenarioId = 'cloudy-night'
): OpenRemoteScenarioSummary {
  return packageFor(scenario).summary
}

export function getOpenRemoteHours(
  scenario: OpenRemoteScenarioId = 'cloudy-night'
): OpenRemoteReplayHour[] {
  return packageFor(scenario).hours
}

export function getOpenRemoteEnergyTotals(
  scenario: OpenRemoteScenarioId = 'cloudy-night'
): OpenRemoteEnergyTotals {
  const summary = getOpenRemoteSummary(scenario)
  if (summary.energy_totals) return summary.energy_totals
  const hours = getOpenRemoteHours(scenario)
  const solar = hours.reduce((acc, h) => acc + h.solar_kw, 0)
  const served = hours.reduce((acc, h) => {
    const demand = h.priority_demand_kw + h.surplus_demand_kw
    return acc + Math.max(0, demand - (h.unmet_load_kw ?? 0))
  }, 0)
  return {
    solar_generated_kwh: Number(solar.toFixed(3)),
    load_served_kwh: Number(served.toFixed(3)),
    unmet_load_kwh_total: summary.unmet_load_kwh_total,
  }
}

/** Map Red Tail demo scrubber hour (0–48) onto the 48-row OpenRemote replay (0–47). */
export function resolveOpenRemoteHourIndex(
  demoHour: number,
  scenario: OpenRemoteScenarioId = 'cloudy-night'
): number {
  const hours = getOpenRemoteHours(scenario)
  if (!hours.length) return 0
  const max = hours.length - 1
  if (!Number.isFinite(demoHour)) return 0
  return Math.min(max, Math.max(0, Math.round(demoHour)))
}

export function getOpenRemoteHour(
  demoHour: number,
  scenario: OpenRemoteScenarioId = 'cloudy-night'
): OpenRemoteReplayHour {
  const hours = getOpenRemoteHours(scenario)
  const idx = resolveOpenRemoteHourIndex(demoHour, scenario)
  return hours[idx] ?? hours[0]
}

export function getOpenRemoteTelemetrySnapshot(
  demoHour: number,
  scenario: OpenRemoteScenarioId = 'cloudy-night'
): OpenRemoteAttributeSnapshot {
  return toOpenRemoteSnapshot(getOpenRemoteHour(demoHour, scenario))
}

/** Occupancy / SOC / solar / load / packs for the scrubber hour (OpenRemote authority). */
export function getOpenRemoteAlignedIndicators(
  demoHour: number,
  scenario: OpenRemoteScenarioId = 'cloudy-night'
): OpenRemoteAlignedIndicators {
  const hour = getOpenRemoteHour(demoHour, scenario)
  const snap = toOpenRemoteSnapshot(hour)
  const sky = hour.sky_condition.toLowerCase()
  const weatherMode: 'clear' | 'storm' =
    sky.includes('storm') ||
    sky.includes('half') ||
    sky.includes('cloud') ||
    sky.includes('isaias') ||
    sky.includes('rain')
      ? 'storm'
      : 'clear'

  return {
    occupancyCount: snap.attributes.occupancyCount,
    portablePacksAvailable: snap.attributes.portablePacksAvailable,
    batterySocPct: snap.attributes.batterySocPct,
    batterySocKwh: snap.attributes.batterySocKwh,
    solarAcPowerKw: snap.attributes.solarAcPowerKw,
    criticalLoadKw: snap.attributes.criticalLoadKw,
    projectedReserveOk: snap.attributes.projectedReserveOk,
    reserveBreached: snap.attributes.reserveBreached,
    phonesShed: snap.flags.phonesShed,
    lightingPartialEgress: snap.flags.lightingPartialEgress,
    packRechargePaused: snap.flags.packRechargePaused,
    skyCondition: snap.flags.skyCondition,
    weatherMode,
  }
}

export function formatOpenRemoteClock(timestampLocal: string): string {
  const d = new Date(timestampLocal)
  if (Number.isNaN(d.getTime())) return timestampLocal
  const weekday = d.toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'America/Chicago',
  })
  const time = timestampLocal.slice(11, 16)
  return `${weekday} ${time}`
}
