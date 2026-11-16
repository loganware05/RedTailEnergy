import {
  ComputedLoadState,
  DayWeatherSchedule,
  GeneratorRecharge,
  HourlyPoint,
  HubSimulationResult,
  LoadDefinition,
  LoadId,
  LoadOverrideMode,
  PowerHealthColor,
  ShedEventRow,
  ShedStage,
  WeatherMode,
} from '../types/hub';

export const HUB_CAPACITY_MAX = 250;
export const HUB_CAPACITY_WARN = 225;
export const BATTERY_CAPACITY_KWH = 27.0;
export const SOLAR_ARRAY_KW = 16.0;
export const STARTING_BATTERY_PCT = 100;
export const NORMAL_OPS_ANNUAL_KWH = 21000;
export const NORMAL_OPS_ANNUAL_SAVINGS = 2500;

export const LOAD_DEFINITIONS: LoadDefinition[] = [
  {
    id: 'lighting',
    name: 'Hall & Entry Lighting',
    shortName: 'Lighting',
    nominalKw: 0.8,
    critical: false,
    description: 'Interior LED lighting and University Ave entry lights. Auto-off during daylight.',
  },
  {
    id: 'medical',
    name: 'Medical Device Charging',
    shortName: 'Medical Devices',
    nominalKw: 0.5,
    critical: true,
    description: 'CPAP, nebulizers, oxygen concentrators, mobility chargers. Never auto-shed.',
  },
  {
    id: 'fridge',
    name: 'Medication Refrigerator',
    shortName: 'Med Fridge',
    nominalKw: 0.4,
    critical: true,
    description: 'Cold-chain storage for insulin and temperature-sensitive prescriptions. Never auto-shed.',
  },
  {
    id: 'phone',
    name: 'Resident Phone Charging',
    shortName: 'Phone Charging',
    nominalKw: 0.2,
    critical: false,
    description: '24 USB-C/USB-A charging ports across Tables A, B, and Wall Strip C.',
  },
  {
    id: 'comms',
    name: 'Hub Communications',
    shortName: 'Comms & Wi-Fi',
    nominalKw: 0.2,
    critical: true,
    description: 'Local Wi-Fi mesh, VHF/UHF radios, and satellite backhaul terminal. Never auto-shed.',
  },
];

// Outage begins at Day 1, 08:00 AM (Hour 0)
export function formatOutageHour(hour: number): {
  day: number;
  clockHour24: number;
  clockLabel: string;
  dayLabel: string;
  fullLabel: string;
} {
  const nonNegative = Math.max(0, Math.round(hour));
  const totalHourOfClock = 8 + nonNegative;
  const day = Math.floor(totalHourOfClock / 24) + 1;
  const clockHour24 = totalHourOfClock % 24;
  const period = clockHour24 >= 12 ? 'PM' : 'AM';
  const hour12 = clockHour24 % 12 === 0 ? 12 : clockHour24 % 12;
  const clockLabel = `${hour12}:00 ${period}`;
  const dayLabel = `Day ${day}`;
  return {
    day,
    clockHour24,
    clockLabel,
    dayLabel,
    fullLabel: `Hr ${nonNegative} · ${dayLabel}, ${clockLabel}`,
  };
}

export function isDaylightHour(hour: number): boolean {
  const { clockHour24 } = formatOutageHour(hour);
  // Daytime: 7:00 AM through 6:00 PM inclusive (07:00 - 18:59)
  return clockHour24 >= 7 && clockHour24 <= 18;
}

// Day support hub is closed overnight from 9:00 PM (21) until 7:00 AM (7)
export function isHubOvernightClosed(hour: number): boolean {
  const { clockHour24 } = formatOutageHour(hour);
  return clockHour24 >= 21 || clockHour24 < 7;
}

const HOURLY_OCCUPANCY_BY_CLOCK24: Record<number, number> = {
  0: 2,   // 12:00 AM (staff only)
  1: 2,   // 1:00 AM
  2: 2,   // 2:00 AM
  3: 2,   // 3:00 AM
  4: 2,   // 4:00 AM
  5: 3,   // 5:00 AM
  6: 4,   // 6:00 AM (opening staff prep)
  7: 28,  // 7:00 AM (hub opens)
  8: 56,  // 8:00 AM
  9: 84,  // 9:00 AM
  10: 102,// 10:00 AM
  11: 114,// 11:00 AM
  12: 124,// 12:00 PM
  13: 148,// 1:00 PM
  14: 172,// 2:00 PM
  15: 194,// 3:00 PM (afternoon peak)
  16: 188,// 4:00 PM
  17: 162,// 5:00 PM
  18: 128,// 6:00 PM
  19: 86, // 7:00 PM
  20: 42, // 8:00 PM (closing wind-down)
  21: 4,  // 9:00 PM (closed overnight, staff closing)
  22: 3,  // 10:00 PM (staff only)
  23: 2,  // 11:00 PM (staff only)
};

export function getSimulatedHeadcountForHour(hour: number): number {
  const { clockHour24 } = formatOutageHour(hour);
  return HOURLY_OCCUPANCY_BY_CLOCK24[clockHour24] ?? 2;
}

// Battery packs are borrowed overnight; overdue only after 12:00 PM the day after checkout.
export function getPackDueHour(checkedOutHour: number): number {
  const { day } = formatOutageHour(checkedOutHour);
  return day * 24 + 4; // Day 1 -> Hr 28 (Day 2, 12:00 PM); Day 2 -> Hr 52 (Day 3, 12:00 PM)
}

export function getWeatherForHour(
  hour: number,
  weather: WeatherMode | DayWeatherSchedule
): WeatherMode {
  if (typeof weather === 'string') return weather;
  return hour < 24 ? weather.day1 : weather.day2;
}

export function getSolarOutputKw(
  hour: number,
  weather: WeatherMode | DayWeatherSchedule
): number {
  const { clockHour24 } = formatOutageHour(hour);
  if (clockHour24 < 7 || clockHour24 > 18) {
    return 0;
  }
  // 16 kW solar array calibrated to Tuskegee engineering plan:
  // Clear day totals ~58.0 kWh (peak ~7.8 kW); storm day runs at half output (~29.0 kWh, peak ~3.9 kW).
  const solarAngle = ((clockHour24 - 6.5) / 12.5) * Math.PI;
  const clearFactor = Math.max(0, Math.sin(solarAngle));
  const peakAcKw = 7.83;
  const hourWeather = getWeatherForHour(hour, weather);
  const weatherMultiplier = hourWeather === 'storm' ? 0.5 : 1.0;
  return Number((peakAcKw * Math.pow(clearFactor, 1.25) * weatherMultiplier).toFixed(2));
}

export function getShedStageForSoc(batteryPct: number): ShedStage {
  if (batteryPct <= 15) return 3;
  if (batteryPct <= 30) return 2;
  if (batteryPct <= 50) return 1;
  return 0;
}

// Sheddable load capacity at each stage (lighting 0.8 + phone 0.2 = 1.0 kW total sheddable)
const STAGE_SHEDDABLE_KW: Record<ShedStage, number> = {
  0: 1.0, // Phone ON (0.2) + Lighting Full (0.8)
  1: 0.8, // Phone OFF (0.0) + Lighting Full (0.8)
  2: 0.4, // Phone OFF (0.0) + Lighting 50% (0.4)
  3: 0.0, // Phone OFF (0.0) + Lighting OFF emergency only (0.0)
};

export function computeLoadStates(
  hour: number,
  batteryPct: number,
  overrides: Record<LoadId, LoadOverrideMode>
): {
  loads: ComputedLoadState[];
  totalLoadKw: number;
  shedStage: ShedStage;
  shedExplanation: string;
} {
  const daylight = isDaylightHour(hour);
  const shedStage = getShedStageForSoc(batteryPct);

  const loads: ComputedLoadState[] = LOAD_DEFINITIONS.map((def) => {
    const mode = overrides[def.id] ?? 'auto';

    if (mode === 'force_off') {
      return {
        id: def.id,
        name: def.name,
        shortName: def.shortName,
        nominalKw: def.nominalKw,
        actualKw: 0,
        status: 'OFF_MANUAL',
        statusLabel: 'Manual Off',
        overrideMode: mode,
        critical: def.critical,
      };
    }

    if (mode === 'force_on') {
      return {
        id: def.id,
        name: def.name,
        shortName: def.shortName,
        nominalKw: def.nominalKw,
        actualKw: def.nominalKw,
        status: 'ON',
        statusLabel: 'Manual On',
        overrideMode: mode,
        critical: def.critical,
      };
    }

    // Automatic mode
    if (def.id === 'lighting') {
      if (batteryPct <= 15) {
        return {
          id: def.id,
          name: def.name,
          shortName: def.shortName,
          nominalKw: def.nominalKw,
          actualKw: 0,
          status: 'SHED_AUTO',
          statusLabel: 'Off (Emergency Only)',
          overrideMode: mode,
          critical: def.critical,
        };
      }
      if (daylight) {
        return {
          id: def.id,
          name: def.name,
          shortName: def.shortName,
          nominalKw: def.nominalKw,
          actualKw: 0,
          status: 'OFF_DAYLIGHT',
          statusLabel: 'Off (Daylight)',
          overrideMode: mode,
          critical: def.critical,
        };
      }
      if (batteryPct <= 30) {
        return {
          id: def.id,
          name: def.name,
          shortName: def.shortName,
          nominalKw: def.nominalKw,
          actualKw: 0.4,
          status: 'DIMMED_50',
          statusLabel: 'Dimmed 50%',
          overrideMode: mode,
          critical: def.critical,
        };
      }
      return {
        id: def.id,
        name: def.name,
        shortName: def.shortName,
        nominalKw: def.nominalKw,
        actualKw: 0.8,
        status: 'ON',
        statusLabel: 'On (Full)',
        overrideMode: mode,
        critical: def.critical,
      };
    }

    if (def.id === 'phone') {
      if (batteryPct <= 50) {
        return {
          id: def.id,
          name: def.name,
          shortName: def.shortName,
          nominalKw: def.nominalKw,
          actualKw: 0,
          status: 'SHED_AUTO',
          statusLabel: 'Paused (≤50% Batt)',
          overrideMode: mode,
          critical: def.critical,
        };
      }
      return {
        id: def.id,
        name: def.name,
        shortName: def.shortName,
        nominalKw: def.nominalKw,
        actualKw: 0.2,
        status: 'ON',
        statusLabel: 'On',
        overrideMode: mode,
        critical: def.critical,
      };
    }

    // Critical loads: medical, fridge, comms — never shed automatically
    return {
      id: def.id,
      name: def.name,
      shortName: def.shortName,
      nominalKw: def.nominalKw,
      actualKw: def.nominalKw,
      status: 'ON',
      statusLabel: 'Protected On',
      overrideMode: mode,
      critical: def.critical,
    };
  });

  const totalLoadKw = Number(loads.reduce((sum, l) => sum + l.actualKw, 0).toFixed(2));

  let shedExplanation = '';
  if (shedStage === 0) {
    shedExplanation = daylight
      ? 'Normal operation (>50% battery). All critical and phone loads are on; hall lighting is off automatically during daylight.'
      : 'Normal operation (>50% battery). All priority loads are running at full 2.1 kW capacity.';
  } else if (shedStage === 1) {
    shedExplanation = daylight
      ? 'Stage 1 conservation (≤50% battery). Resident phone charging is paused automatically to protect medical and cold-chain loads. Lighting is already off for daylight.'
      : 'Stage 1 conservation (≤50% battery). Resident phone charging (0.2 kW) is paused automatically; lighting and all critical loads stay on (1.9 kW).';
  } else if (shedStage === 2) {
    shedExplanation = daylight
      ? 'Stage 2 conservation (≤30% battery). Phone charging is paused and nighttime lighting is limited to 50% (daylight auto-off active now).'
      : 'Stage 2 conservation (≤30% battery). Phone charging is off and hall lighting is dimmed to half (0.4 kW). Critical loads stay at full power (1.5 kW total).';
  } else {
    shedExplanation =
      'Critical reserve (≤15% battery). Phone charging is off, lighting off (emergency lighting only), and Hub Lead action is required to start backup generator recharge. Medical, refrigerator, and comms remain protected.';
  }

  return { loads, totalLoadKw, shedStage, shedExplanation };
}

export function run48HourSimulation(params: {
  currentHour: number;
  weather: WeatherMode | DayWeatherSchedule;
  overrides: Record<LoadId, LoadOverrideMode>;
  batteryOffsetPct: number;
  generatorRecharges: GeneratorRecharge[];
}): HubSimulationResult {
  const { currentHour, weather, overrides, batteryOffsetPct, generatorRecharges } = params;

  const hourlySeries: HourlyPoint[] = [];
  const shedEvents: ShedEventRow[] = [];

  let soc = STARTING_BATTERY_PCT;
  let socNoShed = STARTING_BATTERY_PCT;
  let day1SolarKwh = 0;
  let day2SolarKwh = 0;
  let totalGeneratedKwh = 0;
  let totalUsedKwh = 0;
  let prevStage: ShedStage = getShedStageForSoc(soc);

  let noShedZeroHour: number | null = null;
  let minShedBatteryPct = 100;
  let minNoShedBatteryPct = 100;

  for (let h = 0; h <= 48; h++) {
    const timeMeta = formatOutageHour(h);
    const daylight = isDaylightHour(h);
    const solarKw = getSolarOutputKw(h, weather);

    const completedGenAtHour = generatorRecharges
      .filter((g) => g.status === 'completed' && g.hour === h)
      .reduce((acc, g) => acc + g.kwhAdded, 0);

    const rawEffectiveSoc =
      h >= currentHour ? Math.max(0, Math.min(100, soc + batteryOffsetPct)) : soc;
    const roundedSoc = Math.round(rawEffectiveSoc);

    const rawEffectiveNoShed =
      h >= currentHour ? Math.max(0, Math.min(100, socNoShed + batteryOffsetPct)) : socNoShed;
    const roundedNoShed = Math.round(rawEffectiveNoShed);

    if (roundedSoc < minShedBatteryPct) minShedBatteryPct = roundedSoc;
    if (roundedNoShed < minNoShedBatteryPct) minNoShedBatteryPct = roundedNoShed;
    if (noShedZeroHour === null && roundedNoShed <= 0) {
      noShedZeroHour = h;
    }

    const { totalLoadKw, shedStage } = computeLoadStates(h, roundedSoc, overrides);

    if (h > 0 && shedStage !== prevStage) {
      const stageDeltaKw = Number(
        (STAGE_SHEDDABLE_KW[shedStage] - STAGE_SHEDDABLE_KW[prevStage]).toFixed(2)
      );
      const deltaTag = `${stageDeltaKw > 0 ? '+' : ''}${stageDeltaKw.toFixed(1)} kW`;

      const actionMap: Record<string, string> = {
        '0->1': 'Auto-shed: Phone charging paused (≤50% battery)',
        '1->2': 'Auto-shed: Lighting dimmed to 50% (≤30% battery)',
        '2->3': 'Lighting off (emergency lighting only), generator recharge recommended',
        '0->2': 'Auto-shed: Phone off & lighting dimmed 50% (≤30% battery)',
        '0->3': 'Lighting off (emergency lighting only), generator recharge recommended',
        '1->3': 'Lighting off (emergency lighting only), generator recharge recommended',
        '3->2': `Recovery: Battery above 15% — 50% lighting restored (${deltaTag})`,
        '2->1': `Recovery: Battery above 30% — full lighting restored (${deltaTag})`,
        '1->0': `Recovery: Battery above 50% — phone charging restored (${deltaTag})`,
        '3->1': `Recovery: Battery above 30% — full lighting restored (${deltaTag})`,
        '3->0': `Recovery: Battery above 50% — all priority loads restored (${deltaTag})`,
        '2->0': `Recovery: Battery above 50% — lighting & phone charging restored (${deltaTag})`,
      };
      const key = `${prevStage}->${shedStage}`;
      shedEvents.push({
        id: `shed-${h}-${prevStage}-${shedStage}`,
        hour: h,
        timestamp: `${timeMeta.dayLabel}, ${timeMeta.clockLabel}`,
        batteryPct: roundedSoc,
        stage: shedStage,
        action: actionMap[key] ?? `Transition to Stage ${shedStage}`,
        loadDeltaKw: stageDeltaKw,
      });
    }
    prevStage = shedStage;

    hourlySeries.push({
      hour: h,
      clockLabel: timeMeta.clockLabel,
      dayLabel: timeMeta.dayLabel,
      isDaylight: daylight,
      solarKw,
      loadKw: totalLoadKw,
      batteryPct: roundedSoc,
      noShedBatteryPct: roundedNoShed,
      shedStage,
    });

    if (h < 48) {
      if (h < 24) {
        day1SolarKwh += solarKw;
      } else {
        day2SolarKwh += solarKw;
      }
      totalGeneratedKwh += solarKw;
      totalUsedKwh += totalLoadKw;

      const netKw = solarKw - totalLoadKw;
      const chargeEff = netKw >= 0 ? 0.92 : 1.04;
      const nextKwh = (soc / 100) * BATTERY_CAPACITY_KWH + netKw * chargeEff + completedGenAtHour;
      soc = Math.max(4, Math.min(100, (nextKwh / BATTERY_CAPACITY_KWH) * 100));

      // Counterfactual trajectory with NO automatic load shedding (2.1 kW night / 1.3 kW daylight)
      const noShedLoadKw = daylight ? 1.3 : 2.1;
      const netNoShedKw = solarKw - noShedLoadKw;
      const noShedEff = netNoShedKw >= 0 ? 0.92 : 1.04;
      const nextNoShedKwh =
        (socNoShed / 100) * BATTERY_CAPACITY_KWH + netNoShedKw * noShedEff + completedGenAtHour;
      socNoShed = Math.max(0, Math.min(100, (nextNoShedKwh / BATTERY_CAPACITY_KWH) * 100));
    }
  }

  const currentPoint = hourlySeries[currentHour] ?? hourlySeries[0];
  const currentComputed = computeLoadStates(currentHour, currentPoint.batteryPct, overrides);
  const batteryPct = currentPoint.batteryPct;
  const batteryKwh = Number(((batteryPct / 100) * BATTERY_CAPACITY_KWH).toFixed(1));

  // Hours left = battery kWh remaining divided by current load
  const hoursRemaining =
    currentComputed.totalLoadKw > 0
      ? Number((batteryKwh / currentComputed.totalLoadKw).toFixed(1))
      : 48;

  let healthColor: PowerHealthColor = 'green';
  let healthLabel = 'Normal · All Priority Systems Supported';
  if (batteryPct <= 15) {
    healthColor = 'red';
    healthLabel = 'Critical · Generator Recharge Recommended';
  } else if (batteryPct <= 50) {
    healthColor = 'yellow';
    healthLabel = 'Conserving · Auto Load Shedding Active';
  }

  const estimatedDollarsSaved = Number((totalGeneratedKwh * 0.38).toFixed(2));

  return {
    hourlySeries,
    currentPoint,
    loads: currentComputed.loads,
    totalLoadKw: currentComputed.totalLoadKw,
    solarKw: currentPoint.solarKw,
    batteryPct,
    batteryKwh,
    hoursRemaining,
    healthColor,
    healthLabel,
    shedStage: currentComputed.shedStage,
    shedExplanation: currentComputed.shedExplanation,
    day1SolarKwh: Number(day1SolarKwh.toFixed(1)),
    day2SolarKwh: Number(day2SolarKwh.toFixed(1)),
    totalEnergyGeneratedKwh: Number(totalGeneratedKwh.toFixed(1)),
    totalEnergyUsedKwh: Number(totalUsedKwh.toFixed(1)),
    estimatedDollarsSaved,
    noShedZeroHour,
    minShedBatteryPct,
    minNoShedBatteryPct,
    shedEvents,
  };
}

export function buildCsvExport(
  series: HourlyPoint[],
  weather: WeatherMode | DayWeatherSchedule
): string {
  const header = [
    'hour',
    'day',
    'clock_time',
    'daylight',
    'weather',
    'solar_output_kw',
    'priority_load_kw',
    'battery_percent',
    'no_shed_battery_percent',
    'shed_stage',
  ].join(',');

  const rows = series.map((pt) =>
    [
      pt.hour,
      pt.dayLabel,
      pt.clockLabel,
      pt.isDaylight ? 'day' : 'night',
      getWeatherForHour(pt.hour, weather),
      pt.solarKw.toFixed(2),
      pt.loadKw.toFixed(2),
      pt.batteryPct,
      pt.noShedBatteryPct,
      pt.shedStage,
    ].join(',')
  );

  return [header, ...rows].join('\n');
}
