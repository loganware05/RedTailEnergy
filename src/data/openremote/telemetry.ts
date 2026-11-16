import cloudyNight from './cloudy_night_48h.json'
import {
  OpenRemoteAttributeSnapshot,
  OpenRemoteReplayHour,
  OpenRemoteReplayPackage,
  OpenRemoteScenarioSummary,
  toOpenRemoteSnapshot,
} from './types'

const replay = cloudyNight as OpenRemoteReplayPackage

export const OPENREMOTE_DEMO_HOURS = {
  /** Staff pause pack recharge + storm evening — matches Tompkins Demo 22:00 */
  demoIncident: 4,
  /** First battery reserve floor breach */
  reserveBreach: 8,
} as const

/** Shared live indicators driven by the OpenRemote cloudy-night hour. */
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

export function getOpenRemoteSummary(): OpenRemoteScenarioSummary {
  return replay.summary
}

export function getOpenRemoteHours(): OpenRemoteReplayHour[] {
  return replay.hours
}

/** Map Red Tail demo scrubber hour (0–48) onto the 48-row OpenRemote replay (0–47). */
export function resolveOpenRemoteHourIndex(demoHour: number): number {
  if (!replay.hours.length) return 0
  const max = replay.hours.length - 1
  if (!Number.isFinite(demoHour)) return 0
  return Math.min(max, Math.max(0, Math.round(demoHour)))
}

export function getOpenRemoteHour(demoHour: number): OpenRemoteReplayHour {
  const idx = resolveOpenRemoteHourIndex(demoHour)
  return replay.hours[idx] ?? replay.hours[0]
}

export function getOpenRemoteTelemetrySnapshot(demoHour: number): OpenRemoteAttributeSnapshot {
  return toOpenRemoteSnapshot(getOpenRemoteHour(demoHour))
}

/** Occupancy / SOC / solar / load / packs for the scrubber hour (OpenRemote authority). */
export function getOpenRemoteAlignedIndicators(demoHour: number): OpenRemoteAlignedIndicators {
  const hour = getOpenRemoteHour(demoHour)
  const snap = toOpenRemoteSnapshot(hour)
  const sky = hour.sky_condition.toLowerCase()
  const weatherMode: 'clear' | 'storm' =
    sky.includes('storm') || sky.includes('half') || sky.includes('cloud') ? 'storm' : 'clear'

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
  // 2026-11-14T22:00:00-06:00 → Sat 22:00
  const d = new Date(timestampLocal)
  if (Number.isNaN(d.getTime())) return timestampLocal
  const weekday = d.toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'America/Chicago',
  })
  const time = timestampLocal.slice(11, 16)
  return `${weekday} ${time}`
}
