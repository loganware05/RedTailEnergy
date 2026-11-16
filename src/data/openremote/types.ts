/** OpenRemote-shaped telemetry from the Tompkins cloudy-night replay package. */

export interface OpenRemoteReplayHour {
  hour_index: number
  timestamp_local: string
  timestamp_utc: string
  local_hour: number
  scenario_day: number
  sky_condition: string
  solar_kw: number
  priority_demand_kw: number
  surplus_demand_kw: number
  lighting_kw: number
  medical_kw: number
  fridge_kw: number
  phones_kw: number
  comms_kw: number
  cooled_room_kw: number
  pack_recharge_kw: number
  battery_charge_kw: number
  battery_discharge_kw: number
  battery_soc_kwh: number
  battery_soc_pct: number
  battery_reserve_kwh: number
  reserve_breached: boolean
  projected_hours_to_sunrise: number
  projected_overnight_need_kwh: number
  projected_reserve_ok: boolean
  unmet_load_kw: number
  pack_recharge_paused: boolean
  phones_shed: boolean
  lighting_partial_egress: boolean
  portable_packs_available: number
  occupancy_count: number
  data_quality: string
}

export interface OpenRemoteScenarioSummary {
  scenario_id: string
  label: string
  start_local: string
  hours: number
  first_reserve_breach: {
    hour_index: number
    timestamp_local: string
    soc_kwh: number
    reserve_kwh: number
  } | null
  unmet_load_kwh_total: number
  staff_actions: Array<{
    hour_index: number
    timestamp_local: string
    action: string
    reason: string
  }>
  assumptions: string[]
}

export interface OpenRemoteReplayPackage {
  summary: OpenRemoteScenarioSummary
  hours: OpenRemoteReplayHour[]
}

/** Attribute names aligned with openremote/core Manager assets. */
export const OR_ATTRIBUTES = {
  batterySocPct: 'batterySocPct',
  batterySocKwh: 'batterySocKwh',
  batteryPowerKw: 'batteryPowerKw',
  solarAcPowerKw: 'solarAcPowerKw',
  criticalLoadKw: 'criticalLoadKw',
  projectedReserveOk: 'projectedReserveOk',
  reserveBreached: 'reserveBreached',
  occupancyCount: 'occupancyCount',
  portablePacksAvailable: 'portablePacksAvailable',
  dataQuality: 'dataQuality',
} as const

export interface OpenRemoteAttributeSnapshot {
  hourIndex: number
  timestampLocal: string
  attributes: {
    batterySocPct: number
    batterySocKwh: number
    batteryPowerKw: number
    solarAcPowerKw: number
    criticalLoadKw: number
    projectedReserveOk: boolean
    reserveBreached: boolean
    occupancyCount: number
    portablePacksAvailable: number
    dataQuality: string
  }
  flags: {
    packRechargePaused: boolean
    phonesShed: boolean
    lightingPartialEgress: boolean
    skyCondition: string
  }
}

export function criticalLoadKw(hour: OpenRemoteReplayHour): number {
  return (
    hour.lighting_kw +
    hour.medical_kw +
    hour.fridge_kw +
    hour.phones_kw +
    hour.comms_kw
  )
}

export function batteryPowerKw(hour: OpenRemoteReplayHour): number {
  // Positive = discharge (matches OpenRemote bootstrap convention)
  return Number((hour.battery_discharge_kw - hour.battery_charge_kw).toFixed(3))
}

export function toOpenRemoteSnapshot(hour: OpenRemoteReplayHour): OpenRemoteAttributeSnapshot {
  return {
    hourIndex: hour.hour_index,
    timestampLocal: hour.timestamp_local,
    attributes: {
      batterySocPct: hour.battery_soc_pct,
      batterySocKwh: hour.battery_soc_kwh,
      batteryPowerKw: batteryPowerKw(hour),
      solarAcPowerKw: hour.solar_kw,
      criticalLoadKw: Number(criticalLoadKw(hour).toFixed(3)),
      projectedReserveOk: hour.projected_reserve_ok,
      reserveBreached: hour.reserve_breached,
      occupancyCount: hour.occupancy_count,
      portablePacksAvailable: hour.portable_packs_available,
      dataQuality: hour.data_quality,
    },
    flags: {
      packRechargePaused: hour.pack_recharge_paused,
      phonesShed: hour.phones_shed,
      lightingPartialEgress: hour.lighting_partial_egress,
      skyCondition: hour.sky_condition,
    },
  }
}
