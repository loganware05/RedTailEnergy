import {
  BatteryCharging,
  CheckCircle2,
  Cpu,
  Fuel,
  ShieldAlert,
  ShieldCheck,
  Sun,
  UtilityPole,
  Zap,
} from 'lucide-react';
import {
  BATTERY_CAPACITY_KWH,
  formatOutageHour,
  getWeatherForHour,
  SOLAR_ARRAY_KW,
} from '../simulation/engine';
import {
  ComputedLoadState,
  DayWeatherSchedule,
  GeneratorRecharge,
  HourlyPoint,
} from '../types/hub';

interface LiveSystemDiagramProps {
  activePoint: HourlyPoint;
  loads: ComputedLoadState[];
  totalLoadKw: number;
  dayWeather: DayWeatherSchedule;
  generatorRecharges: GeneratorRecharge[];
}

export function LiveSystemDiagram({
  activePoint,
  loads,
  totalLoadKw,
  dayWeather,
  generatorRecharges,
}: LiveSystemDiagramProps) {
  const weather = getWeatherForHour(activePoint.hour, dayWeather);
  const timeMeta = formatOutageHour(activePoint.hour);
  const batteryKwh = Number(((activePoint.batteryPct / 100) * BATTERY_CAPACITY_KWH).toFixed(1));
  const netBatteryKw = Number((activePoint.solarKw - totalLoadKw).toFixed(2));
  const isCharging = netBatteryKw > 0.05;
  const isDischarging = netBatteryKw < -0.05;

  const pendingGen = generatorRecharges.some((g) => g.status === 'requested');
  const completedGenAtOrBefore = generatorRecharges.filter(
    (g) => g.status === 'completed' && g.hour <= activePoint.hour
  ).length;
  const genRecommended = activePoint.batteryPct <= 15;
  const genActiveThisHour = generatorRecharges.some(
    (g) => g.status === 'completed' && g.hour === activePoint.hour
  );

  const pvActive = activePoint.solarKw > 0;
  const mdpLabel = 'Islanded · Utility Outage';

  return (
    <section
      aria-labelledby="live-system-diagram-heading"
      className="rounded-2xl bg-surface border border-edge p-4 sm:p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="live-system-diagram-heading"
            className="text-base sm:text-lg font-bold text-charcoal flex items-center gap-2"
          >
            <Cpu className="w-5 h-5 text-crimson-ink shrink-0" aria-hidden="true" />
            <span>Live System Diagram (One-Line Schematic)</span>
          </h2>
          <p className="text-xs text-charcoal-muted mt-0.5 font-mono tabular-nums">
            Synced to Hr {activePoint.hour} ({timeMeta.dayLabel}, {timeMeta.clockLabel}) ·{' '}
            {weather === 'storm' ? 'Storm Clouds (½ Solar)' : 'Clear Sky (Full Solar)'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
          <span
            className={`px-2.5 py-1 rounded-md border font-bold ${
              isCharging
                ? 'bg-ok-bg border-ok-border text-ok-ink'
                : isDischarging
                  ? 'bg-warn-bg border-warn-border text-warn-ink'
                  : 'bg-surface-alt border-edge text-charcoal'
            }`}
          >
            {isCharging
              ? `Charging +${netBatteryKw.toFixed(1)} kW`
              : isDischarging
                ? `Discharging ${netBatteryKw.toFixed(1)} kW`
                : 'Balanced 0.0 kW'}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-surface-alt border border-edge font-bold text-charcoal">
            Stage {activePoint.shedStage}
          </span>
        </div>
      </div>

      {/* Interactive One-Line Architecture Schematic (SVG) */}
      <div className="rounded-xl bg-surface-alt border border-edge p-3 overflow-x-auto">
        <svg
          viewBox="0 0 880 310"
          className="w-full min-w-[660px] h-auto select-none"
          role="img"
          aria-label="Live microgrid one-line diagram showing Rooftop PV array, Rapid Shutdown, Hybrid Inverter, 27 kWh LFP Battery, Main Distribution Panel, Existing Generator, Critical Load Panel, and five priority circuits"
        >
          {/* DC Bus: PV -> Rapid Shutdown -> Hybrid Inverter */}
          <line
            x1="158"
            y1="62"
            x2="210"
            y2="62"
            stroke={pvActive ? '#C99A2E' : '#94A3B8'}
            strokeWidth="3"
          />
          <line
            x1="340"
            y1="62"
            x2="395"
            y2="62"
            stroke={pvActive ? '#C99A2E' : '#94A3B8'}
            strokeWidth="3"
          />

          {/* Battery Bus: Hybrid Inverter <-> 27 kWh LFP Battery */}
          <line
            x1="468"
            y1="100"
            x2="468"
            y2="144"
            stroke={isCharging ? '#15803D' : isDischarging ? '#8B1E24' : '#64748B'}
            strokeWidth="3"
          />

          {/* AC Generation / MDP Bus -> Critical Load Panel */}
          {/* MDP (Utility) -> ATS / Critical Load Panel */}
          <line
            x1="158"
            y1="232"
            x2="245"
            y2="232"
            stroke="#94A3B8"
            strokeWidth="2.5"
            strokeDasharray="5 4"
          />
          {/* Open Utility Disconnect symbol */}
          <circle cx="195" cy="232" r="5" fill="var(--rt-surface)" stroke="#8B1E24" strokeWidth="2" />
          <line x1="189" y1="226" x2="201" y2="238" stroke="#8B1E24" strokeWidth="2" />

          {/* Existing Generator -> Critical Load Panel */}
          <line
            x1="350"
            y1="232"
            x2="565"
            y2="232"
            stroke={genActiveThisHour ? '#15803D' : genRecommended ? '#8B1E24' : '#94A3B8'}
            strokeWidth={genActiveThisHour || genRecommended ? '3' : '2'}
            strokeDasharray={genActiveThisHour ? undefined : '4 4'}
          />
          <line x1="565" y1="232" x2="565" y2="100" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.55" />

          {/* Hybrid Inverter AC Output -> Critical Load Panel */}
          <line
            x1="540"
            y1="62"
            x2="590"
            y2="62"
            stroke="#8B1E24"
            strokeWidth="3"
          />

          {/* Critical Load Panel -> 5 Branch Circuits */}
          {loads.map((load, idx) => {
            const targetY = 30 + idx * 54;
            const isActive = load.actualKw > 0;
            const strokeColor = !isActive
              ? '#94A3B8'
              : load.status === 'DIMMED_50'
                ? '#C99A2E'
                : load.critical
                  ? '#8B1E24'
                  : '#15803D';
            return (
              <path
                key={load.id}
                d={`M 680 120 L 700 120 L 700 ${targetY} L 722 ${targetY}`}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isActive ? '2.5' : '1.5'}
                strokeDasharray={isActive ? undefined : '4 3'}
              />
            );
          })}

          {/* 1. Rooftop PV Array (16 kW DC) */}
          <g transform="translate(16, 22)">
            <rect
              width="142"
              height="80"
              rx="10"
              fill="var(--rt-surface)"
              stroke={pvActive ? '#C99A2E' : 'var(--rt-edge-strong)'}
              strokeWidth="2"
            />
            <text x="12" y="21" fill="var(--rt-ink-muted)" className="text-[10px] font-bold">
              ROOFTOP PV ARRAY
            </text>
            <text x="12" y="40" fill="var(--rt-ink)" className="text-[13px] font-bold font-mono">
              {SOLAR_ARRAY_KW} kW DC
            </text>
            <text
              x="12"
              y="62"
              fill={pvActive ? '#9A6B06' : 'var(--rt-ink-muted)'}
              className="text-[11px] font-bold font-mono"
            >
              Now: {activePoint.solarKw.toFixed(1)} kW ({weather === 'storm' ? '½ Storm' : 'Clear'})
            </text>
          </g>

          {/* 2. Rapid Shutdown */}
          <g transform="translate(210, 26)">
            <rect
              width="130"
              height="72"
              rx="10"
              fill="var(--rt-surface)"
              stroke="var(--rt-edge-strong)"
              strokeWidth="1.8"
            />
            <text x="12" y="21" fill="var(--rt-ink-muted)" className="text-[10px] font-bold">
              RAPID SHUTDOWN
            </text>
            <text x="12" y="40" fill="var(--rt-ink)" className="text-[12px] font-bold">
              NEC 690.12 Initiator
            </text>
            <text x="12" y="58" fill="#15803D" className="text-[11px] font-bold font-mono">
              {pvActive ? 'CLOSED · PASSING DC' : 'STANDBY (NIGHT)'}
            </text>
          </g>

          {/* 3. Hybrid Inverter */}
          <g transform="translate(395, 22)">
            <rect
              width="145"
              height="78"
              rx="10"
              fill="var(--rt-surface)"
              stroke="#8B1E24"
              strokeWidth="2"
            />
            <text x="12" y="21" fill="#8B1E24" className="text-[10px] font-bold">
              HYBRID INVERTER
            </text>
            <text x="12" y="40" fill="var(--rt-ink)" className="text-[12px] font-bold">
              Grid-Forming AC/DC
            </text>
            <text x="12" y="60" fill="var(--rt-ink-muted)" className="text-[11px] font-mono">
              Island Mode · 120/240V
            </text>
          </g>

          {/* 4. 27 kWh LFP Battery */}
          <g transform="translate(395, 144)">
            <rect
              width="145"
              height="78"
              rx="10"
              fill="var(--rt-surface)"
              stroke={
                activePoint.batteryPct <= 15
                  ? '#8B1E24'
                  : activePoint.batteryPct <= 50
                    ? '#C99A2E'
                    : '#15803D'
              }
              strokeWidth="2.2"
            />
            <text x="12" y="21" fill="var(--rt-ink-muted)" className="text-[10px] font-bold">
              27 kWh LFP BATTERY
            </text>
            <text x="12" y="42" fill="var(--rt-ink)" className="text-[14px] font-bold font-mono">
              {activePoint.batteryPct}% ({batteryKwh} kWh)
            </text>
            <text
              x="12"
              y="62"
              fill={isCharging ? '#15803D' : '#8B1E24'}
              className="text-[11px] font-bold font-mono"
            >
              {isCharging
                ? `▲ +${netBatteryKw.toFixed(1)} kW`
                : isDischarging
                  ? `▼ ${netBatteryKw.toFixed(1)} kW`
                  : 'Idle 0.0 kW'}
            </text>
          </g>

          {/* 5. Building's Main Distribution Panel (MDP) */}
          <g transform="translate(16, 192)">
            <rect
              width="142"
              height="80"
              rx="10"
              fill="var(--rt-surface)"
              stroke="var(--rt-edge-strong)"
              strokeWidth="1.8"
            />
            <text x="12" y="21" fill="var(--rt-ink-muted)" className="text-[10px] font-bold">
              BUILDING MDP
            </text>
            <text x="12" y="40" fill="var(--rt-ink)" className="text-[12px] font-bold">
              Main Dist. Panel
            </text>
            <text x="12" y="60" fill="#8B1E24" className="text-[11px] font-bold font-mono">
              {mdpLabel}
            </text>
          </g>

          {/* 6. Existing Backup Generator */}
          <g transform="translate(210, 192)">
            <rect
              width="140"
              height="80"
              rx="10"
              fill="var(--rt-surface)"
              stroke={genRecommended ? '#8B1E24' : 'var(--rt-edge-strong)'}
              strokeWidth={genRecommended ? '2.2' : '1.8'}
            />
            <text x="12" y="21" fill="var(--rt-ink-muted)" className="text-[10px] font-bold">
              EXISTING GENERATOR
            </text>
            <text x="12" y="40" fill="var(--rt-ink)" className="text-[12px] font-bold">
              Campus Backup Gen
            </text>
            <text
              x="12"
              y="60"
              fill={
                genActiveThisHour
                  ? '#15803D'
                  : genRecommended
                    ? '#8B1E24'
                    : 'var(--rt-ink-muted)'
              }
              className="text-[11px] font-bold font-mono"
            >
              {genActiveThisHour
                ? 'RECHARGING +9.5kWh'
                : genRecommended
                  ? 'START RECOMMENDED'
                  : pendingGen
                    ? 'DISPATCH PENDING'
                    : `STANDBY (${completedGenAtOrBefore} runs)`}
            </text>
          </g>

          {/* 7. Critical Load Panel */}
          <g transform="translate(565, 22)">
            <rect
              width="115"
              height="168"
              rx="10"
              fill="var(--rt-surface)"
              stroke="#8B1E24"
              strokeWidth="2"
            />
            <text x="10" y="24" fill="#8B1E24" className="text-[10px] font-bold">
              CRITICAL LOAD
            </text>
            <text x="10" y="38" fill="#8B1E24" className="text-[10px] font-bold">
              PANEL
            </text>
            <text x="10" y="76" fill="var(--rt-ink)" className="text-[16px] font-bold font-mono">
              {totalLoadKw.toFixed(1)} kW
            </text>
            <text x="10" y="96" fill="var(--rt-ink-muted)" className="text-[10px] font-mono">
              of 2.1 kW max
            </text>
            <text x="10" y="132" fill="var(--rt-ink)" className="text-[11px] font-bold">
              5 Sub-Circuits
            </text>
            <text x="10" y="150" fill="var(--rt-ink-muted)" className="text-[10px] font-mono">
              Stage {activePoint.shedStage} Active
            </text>
          </g>

          {/* 8. Five Protected & Sheddable Circuits */}
          {loads.map((load, idx) => {
            const boxY = 8 + idx * 54;
            const isActive = load.actualKw > 0;
            const borderColor = !isActive
              ? 'var(--rt-edge)'
              : load.status === 'DIMMED_50'
                ? '#C99A2E'
                : load.critical
                  ? '#8B1E24'
                  : '#15803D';

            return (
              <g key={load.id} transform={`translate(722, ${boxY})`}>
                <rect
                  width="146"
                  height="44"
                  rx="8"
                  fill="var(--rt-surface)"
                  stroke={borderColor}
                  strokeWidth="1.6"
                  opacity={isActive ? 1 : 0.72}
                />
                <text x="9" y="17" fill="var(--rt-ink)" className="text-[10.5px] font-bold">
                  {load.shortName} ({load.nominalKw.toFixed(1)} kW)
                </text>
                <text
                  x="9"
                  y="34"
                  fill={isActive ? (load.status === 'DIMMED_50' ? '#9A6B06' : '#15803D') : 'var(--rt-ink-muted)'}
                  className="text-[10px] font-bold font-mono"
                >
                  {load.actualKw.toFixed(1)} kW · {load.statusLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Circuit & Equipment Status Breakdown (Clean Single-Level Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
        <div className="rounded-xl bg-surface-alt border border-edge p-3 space-y-1">
          <div className="font-bold text-charcoal flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-gold-deep" aria-hidden="true" />
            <span>PV &amp; Rapid Shutdown</span>
          </div>
          <div className="font-mono tabular-nums text-charcoal-muted">
            16 kW array · {activePoint.solarKw.toFixed(1)} kW now ·{' '}
            {pvActive ? 'Shutdown closed' : 'Dark/Standby'}
          </div>
        </div>

        <div className="rounded-xl bg-surface-alt border border-edge p-3 space-y-1">
          <div className="font-bold text-charcoal flex items-center gap-1.5">
            <BatteryCharging className="w-3.5 h-3.5 text-crimson-ink" aria-hidden="true" />
            <span>Hybrid Inverter &amp; LFP</span>
          </div>
          <div className="font-mono tabular-nums text-charcoal-muted">
            {activePoint.batteryPct}% ({batteryKwh}/27 kWh) ·{' '}
            {netBatteryKw >= 0 ? `+${netBatteryKw.toFixed(1)}` : netBatteryKw.toFixed(1)} kW
          </div>
        </div>

        <div className="rounded-xl bg-surface-alt border border-edge p-3 space-y-1">
          <div className="font-bold text-charcoal flex items-center gap-1.5">
            <UtilityPole className="w-3.5 h-3.5 text-charcoal-muted" aria-hidden="true" />
            <span>Building MDP</span>
          </div>
          <div className="font-mono text-charcoal-muted">
            Grid utility isolated · Hub islanded cleanly
          </div>
        </div>

        <div className="rounded-xl bg-surface-alt border border-edge p-3 space-y-1">
          <div className="font-bold text-charcoal flex items-center gap-1.5">
            <Fuel className="w-3.5 h-3.5 text-crimson-ink" aria-hidden="true" />
            <span>Existing Generator</span>
          </div>
          <div className="font-mono text-charcoal-muted">
            {genActiveThisHour
              ? 'Active recharge (+9.5 kWh)'
              : genRecommended
                ? 'Recommended now (≤15% batt)'
                : `Standby (${completedGenAtOrBefore} runs)`}
          </div>
        </div>
      </div>

      {/* 5 Critical Load Panel Circuits Summary List */}
      <div className="rounded-xl border border-edge divide-y divide-edge bg-surface">
        <div className="px-3.5 py-2 bg-surface-alt flex items-center justify-between text-xs font-bold text-charcoal rounded-t-xl">
          <span className="inline-flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-crimson-ink" aria-hidden="true" />
            <span>Critical Load Panel — 5 Circuits</span>
          </span>
          <span className="font-mono tabular-nums">{totalLoadKw.toFixed(1)} / 2.1 kW</span>
        </div>
        {loads.map((load) => (
          <div
            key={load.id}
            className="px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              {load.critical ? (
                <ShieldCheck className="w-3.5 h-3.5 text-crimson-ink shrink-0" aria-hidden="true" />
              ) : load.actualKw > 0 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-ok-ink shrink-0" aria-hidden="true" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-charcoal-muted shrink-0" aria-hidden="true" />
              )}
              <span className="font-semibold text-charcoal">{load.name}</span>
              <span className="text-charcoal-muted font-mono tabular-nums">
                ({load.nominalKw.toFixed(1)} kW rated)
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono tabular-nums">
              <span className="text-charcoal-muted">{load.statusLabel}</span>
              <span className="font-bold text-charcoal w-14 text-right">
                {load.actualKw.toFixed(1)} kW
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
