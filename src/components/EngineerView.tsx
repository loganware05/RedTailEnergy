import { useState } from 'react';
import { BarChart3, Calendar, Download, Table2, Zap } from 'lucide-react';
import {
  buildCsvExport,
  computeLoadStates,
  formatOutageHour,
  NORMAL_OPS_ANNUAL_KWH,
  NORMAL_OPS_ANNUAL_SAVINGS,
} from '../simulation/engine';
import {
  DayWeatherSchedule,
  GeneratorRecharge,
  HubSimulationResult,
  LoadId,
  LoadOverrideMode,
} from '../types/hub';
import { LiveSystemDiagram } from './LiveSystemDiagram';

interface EngineerViewProps {
  currentHour: number;
  dayWeather: DayWeatherSchedule;
  sim: HubSimulationResult;
  overrides: Record<LoadId, LoadOverrideMode>;
  generatorRecharges: GeneratorRecharge[];
}

export function EngineerView({
  currentHour,
  dayWeather,
  sim,
  overrides,
  generatorRecharges,
}: EngineerViewProps) {
  const [opsMode, setOpsMode] = useState<'outage' | 'normal'>('outage');
  const [inspectHour, setInspectHour] = useState<number | null>(null);
  const timeMeta = formatOutageHour(currentHour);
  const activeHour = inspectHour ?? currentHour;
  const activePoint = sim.hourlySeries[activeHour] ?? sim.currentPoint;
  const activeLoadState = computeLoadStates(activeHour, activePoint.batteryPct, overrides);

  const handleExportCsv = () => {
    const csv = buildCsvExport(sim.hourlySeries, dayWeather);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `red-tail-hub-48h-${dayWeather.day1}-${dayWeather.day2}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Responsive SVG chart dimensions (scales cleanly down to 340px phone width without horizontal scroll)
  const width = 600;
  const height = 210;
  const padL = 38;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const xForHour = (h: number) => padL + (h / 48) * plotW;

  const yForPct = (pct: number) => padT + plotH - (pct / 100) * plotH;
  const batteryPath = sim.hourlySeries
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${xForHour(pt.hour).toFixed(1)} ${yForPct(pt.batteryPct).toFixed(1)}`)
    .join(' ');
  const batteryAreaPath = `${batteryPath} L ${xForHour(48).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${xForHour(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

  const noShedPath = sim.hourlySeries
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${xForHour(pt.hour).toFixed(1)} ${yForPct(pt.noShedBatteryPct).toFixed(1)}`)
    .join(' ');

  const maxKw = 16;
  const yForKw = (kw: number) => padT + plotH - (Math.min(maxKw, kw) / maxKw) * plotH;
  const solarPath = sim.hourlySeries
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${xForHour(pt.hour).toFixed(1)} ${yForKw(pt.solarKw).toFixed(1)}`)
    .join(' ');
  const solarAreaPath = `${solarPath} L ${xForHour(48).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${xForHour(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;
  const loadPath = sim.hourlySeries
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${xForHour(pt.hour).toFixed(1)} ${yForKw(pt.loadKw).toFixed(1)}`)
    .join(' ');

  const weatherSummaryText = `Day 1: ${
    dayWeather.day1 === 'storm' ? 'Storm (½ Solar)' : 'Clear (Full)'
  } · ${sim.day1SolarKwh} kWh | Day 2: ${
    dayWeather.day2 === 'storm' ? 'Storm (½ Solar)' : 'Clear (Full)'
  } · ${sim.day2SolarKwh} kWh`;

  const sheddingComparisonLine =
    sim.noShedZeroHour !== null
      ? `Without shedding, the battery reaches 0% at hour ${sim.noShedZeroHour}. With shedding, it never drops below ${sim.minShedBatteryPct}%.`
      : `Without shedding, the battery drops to ${sim.minNoShedBatteryPct}%. With shedding, it never drops below ${sim.minShedBatteryPct}%.`;

  return (
    <div className="space-y-5">
      {/* Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-charcoal-muted">
        <div>
          <span className="font-semibold text-charcoal">Student / Engineer Living Lab</span>
          <span aria-hidden="true"> · </span>
          <span>Tompkins Hall</span>
          <span aria-hidden="true"> · </span>
          <span className="font-mono tabular-nums">
            Hr {currentHour}/48 ({timeMeta.dayLabel}, {timeMeta.clockLabel})
          </span>
        </div>
        <span className="text-xs font-medium text-charcoal-muted">Prototype - simulated data</span>
      </div>

      {/* Header + Mode Switcher + CSV Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-charcoal">
            {opsMode === 'outage' ? '48-Hour Performance' : 'Normal Operations (Year-Round)'}
          </h1>
          <p className="text-sm text-charcoal-muted">
            {opsMode === 'outage' ? (
              <>
                16 kW solar · 27 kWh battery · <strong className="text-charcoal">{weatherSummaryText}</strong>
              </>
            ) : (
              <>16 kW solar · 27 kWh battery · Grid-tied annual campus operations</>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex p-1 bg-surface-alt border border-edge rounded-xl">
            <button
              type="button"
              onClick={() => setOpsMode('outage')}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                opsMode === 'outage'
                  ? 'bg-crimson text-white shadow-xs'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              48h Outage
            </button>
            <button
              type="button"
              onClick={() => setOpsMode('normal')}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                opsMode === 'normal'
                  ? 'bg-crimson text-white shadow-xs'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              Normal operations
            </button>
          </div>

          {opsMode === 'outage' && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-white text-sm font-bold inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Export 48h CSV</span>
            </button>
          )}
        </div>
      </div>

      {opsMode === 'normal' ? (
        <div className="space-y-4">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-2xl bg-surface border border-edge p-4">
              <div className="text-xs font-semibold text-charcoal-muted">Annual Solar Generated</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-charcoal mt-1">
                ~{NORMAL_OPS_ANNUAL_KWH.toLocaleString()}{' '}
                <span className="text-xs font-normal text-charcoal-muted">kWh/yr</span>
              </div>
              <div className="text-[11px] font-semibold text-crimson-ink mt-0.5">Planning estimate</div>
            </div>

            <div className="rounded-2xl bg-surface border border-edge p-4">
              <div className="text-xs font-semibold text-charcoal-muted">Est. Annual Savings</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-ok-ink mt-1">
                ~${NORMAL_OPS_ANNUAL_SAVINGS.toLocaleString()}
              </div>
              <div className="text-[11px] font-semibold text-crimson-ink mt-0.5">Planning estimate</div>
            </div>

            <div className="rounded-2xl bg-surface border border-edge p-4">
              <div className="text-xs font-semibold text-charcoal-muted">System Sizing</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-charcoal mt-1">
                16 kW <span className="text-xs font-normal text-charcoal-muted">/ 27 kWh</span>
              </div>
              <div className="text-[11px] text-charcoal-muted mt-0.5">Tompkins Hall microgrid</div>
            </div>

            <div className="rounded-2xl bg-surface border border-edge p-4">
              <div className="text-xs font-semibold text-charcoal-muted">Reserve Posture</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-charcoal mt-1">
                100%
              </div>
              <div className="text-[11px] text-charcoal-muted mt-0.5">Storm-ready LFP reserve</div>
            </div>
          </section>

          <section className="rounded-2xl bg-surface border border-edge p-5 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-charcoal flex items-center gap-2">
              <Calendar className="w-5 h-5 text-crimson-ink" aria-hidden="true" />
              <span>Year-Round Campus &amp; Community Operations</span>
            </h2>
            <p className="text-sm text-charcoal-muted leading-relaxed">
              Under normal grid-connected operation at Tompkins Hall, the 16 kW solar array generates approximately{' '}
              <strong className="text-charcoal">21,000 kWh per year</strong> and offsets roughly{' '}
              <strong className="text-charcoal">$2,500 per year</strong> in campus electricity costs{' '}
              <span className="font-semibold text-crimson-ink">(Planning estimate)</span>, while keeping the 27 kWh
              battery charged to 100% for sudden storm outages and powering year-round student living-lab coursework,
              CPR/storm training workshops, and the campus shuttle loop.
            </p>
          </section>
        </div>
      ) : (
        <>
          {/* Totals KPI Row */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-2xl bg-surface border border-edge p-4">
              <div className="text-xs font-semibold text-charcoal-muted">Generated (48h)</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-charcoal mt-1">
                {sim.totalEnergyGeneratedKwh} <span className="text-xs font-normal text-charcoal-muted">kWh</span>
              </div>
              <div className="text-[11px] text-charcoal-muted mt-0.5 font-mono tabular-nums">
                D1 {sim.day1SolarKwh} · D2 {sim.day2SolarKwh} kWh
              </div>
            </div>
            <div className="rounded-2xl bg-surface border border-edge p-4">
              <div className="text-xs font-semibold text-charcoal-muted">Used (48h)</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-charcoal mt-1">
                {sim.totalEnergyUsedKwh} <span className="text-xs font-normal text-charcoal-muted">kWh</span>
              </div>
              <div className="text-[11px] text-charcoal-muted mt-0.5">2.1 kW priority load</div>
            </div>
            <div className="rounded-2xl bg-surface border border-edge p-4">
              <div className="text-xs font-semibold text-charcoal-muted">Est. Saved</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-ok-ink mt-1">
                ${sim.estimatedDollarsSaved.toFixed(2)}
              </div>
              <div className="text-[11px] text-charcoal-muted mt-0.5">Illustrative estimate</div>
            </div>
            <div className="rounded-2xl bg-surface border border-edge p-4">
              <div className="text-xs font-semibold text-charcoal-muted">Shed Events</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-crimson-ink mt-1">
                {sim.shedEvents.length}
              </div>
              <div className="text-[11px] text-charcoal-muted mt-0.5">Stage changes</div>
            </div>
          </section>

          {/* Interactive Hour Inspector Bar */}
          <div className="rounded-xl bg-gold-band text-gold-band-ink border border-edge-strong px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
            <div className="font-mono tabular-nums font-semibold">
              Hr {activePoint.hour} ({activePoint.dayLabel}, {activePoint.clockLabel})
            </div>
            <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
              <span>
                Batt <strong className="underline">{activePoint.batteryPct}%</strong>
              </span>
              <span>
                No-Shed <strong>{activePoint.noShedBatteryPct}%</strong>
              </span>
              <span>
                Solar <strong>{activePoint.solarKw.toFixed(1)}kW</strong>
              </span>
              <span>
                Load <strong>{activePoint.loadKw.toFixed(1)}kW</strong>
              </span>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            <section className="rounded-2xl bg-surface border border-edge p-4 sm:p-5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-charcoal flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-crimson-ink" aria-hidden="true" />
                  <span>Battery % (0–48h)</span>
                </h2>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-crimson-ink">
                    <span className="inline-block w-3.5 h-0.5 bg-current" />
                    <span>With shedding</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-charcoal-muted">
                    <span className="inline-block w-3.5 border-t-2 border-dashed border-current" />
                    <span>Without shedding</span>
                  </span>
                </div>
              </div>

              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto select-none"
                role="img"
                aria-label="48-hour battery state of charge chart comparing with and without load shedding"
                onMouseLeave={() => setInspectHour(null)}
              >
                {[0, 15, 30, 50, 100].map((pct) => {
                  const y = yForPct(pct);
                  const isThreshold = pct === 50 || pct === 30 || pct === 15;
                  return (
                    <g key={pct}>
                      <line
                        x1={padL}
                        y1={y}
                        x2={width - padR}
                        y2={y}
                        stroke={isThreshold ? 'var(--rt-gold)' : 'var(--rt-edge)'}
                        strokeDasharray={isThreshold ? '4 4' : undefined}
                        strokeWidth={1}
                      />
                      <text
                        x={padL - 5}
                        y={y + 3.5}
                        textAnchor="end"
                        fill="var(--rt-ink-muted)"
                        className="text-[10px] font-mono"
                      >
                        {pct}%
                      </text>
                    </g>
                  );
                })}

                {[0, 12, 24, 36, 48].map((hr) => (
                  <text
                    key={hr}
                    x={xForHour(hr)}
                    y={height - 6}
                    textAnchor="middle"
                    fill="var(--rt-ink-muted)"
                    className="text-[10px] font-mono"
                  >
                    {hr}h
                  </text>
                ))}

                <path d={batteryAreaPath} fill="var(--rt-crimson-ink)" fillOpacity={0.14} />
                <path
                  d={noShedPath}
                  fill="none"
                  stroke="var(--rt-ink-muted)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  strokeLinejoin="round"
                />
                <path
                  d={batteryPath}
                  fill="none"
                  stroke="var(--rt-crimson-ink)"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                />

                <line
                  x1={xForHour(currentHour)}
                  y1={padT}
                  x2={xForHour(currentHour)}
                  y2={padT + plotH}
                  stroke="var(--rt-ink)"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={xForHour(activePoint.hour)}
                  cy={yForPct(activePoint.noShedBatteryPct)}
                  r={4}
                  fill="var(--rt-ink-muted)"
                  stroke="var(--rt-surface)"
                  strokeWidth={1.5}
                />
                <circle
                  cx={xForHour(activePoint.hour)}
                  cy={yForPct(activePoint.batteryPct)}
                  r={5}
                  fill="var(--rt-crimson-ink)"
                  stroke="var(--rt-surface)"
                  strokeWidth={2}
                />

                {sim.hourlySeries.map((pt) => (
                  <rect
                    key={pt.hour}
                    x={xForHour(pt.hour) - plotW / 96}
                    y={padT}
                    width={plotW / 48}
                    height={plotH}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setInspectHour(pt.hour)}
                    onClick={() => setInspectHour(pt.hour)}
                  />
                ))}
              </svg>

              <p className="text-xs sm:text-sm font-semibold text-charcoal bg-surface-alt border border-edge rounded-lg px-3 py-2">
                {sheddingComparisonLine}
              </p>
              <p className="text-xs text-charcoal-muted">
                Gold dashed lines: 50% (phone shed), 30% (lighting 50%), 15% (generator alert).
              </p>
            </section>

            <section className="rounded-2xl bg-surface border border-edge p-4 sm:p-5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-charcoal flex items-center gap-2">
                  <Zap className="w-4 h-4 text-gold-deep" aria-hidden="true" />
                  <span>Solar &amp; Load (0–48h)</span>
                </h2>
                <div className="flex items-center gap-2.5 text-xs font-semibold">
                  <span className="text-gold-deep">● Solar</span>
                  <span className="text-crimson-ink">● Load</span>
                </div>
              </div>

              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto select-none"
                role="img"
                aria-label="48-hour solar generation and load chart"
                onMouseLeave={() => setInspectHour(null)}
              >
                {[0, 4, 8, 12, 16].map((kw) => {
                  const y = yForKw(kw);
                  return (
                    <g key={kw}>
                      <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="var(--rt-edge)" strokeWidth={1} />
                      <text
                        x={padL - 5}
                        y={y + 3.5}
                        textAnchor="end"
                        fill="var(--rt-ink-muted)"
                        className="text-[10px] font-mono"
                      >
                        {kw}kW
                      </text>
                    </g>
                  );
                })}

                {[0, 12, 24, 36, 48].map((hr) => (
                  <text
                    key={hr}
                    x={xForHour(hr)}
                    y={height - 6}
                    textAnchor="middle"
                    fill="var(--rt-ink-muted)"
                    className="text-[10px] font-mono"
                  >
                    {hr}h
                  </text>
                ))}

                <path d={solarAreaPath} fill="var(--rt-gold)" fillOpacity={0.22} />
                <path d={solarPath} fill="none" stroke="var(--rt-gold-deep)" strokeWidth={2.5} strokeLinejoin="round" />
                <path d={loadPath} fill="none" stroke="var(--rt-crimson-ink)" strokeWidth={2.2} strokeLinejoin="round" />

                <line
                  x1={xForHour(currentHour)}
                  y1={padT}
                  x2={xForHour(currentHour)}
                  y2={padT + plotH}
                  stroke="var(--rt-ink)"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={xForHour(activePoint.hour)}
                  cy={yForKw(activePoint.solarKw)}
                  r={4.5}
                  fill="var(--rt-gold-deep)"
                  stroke="var(--rt-surface)"
                  strokeWidth={1.5}
                />
                <circle
                  cx={xForHour(activePoint.hour)}
                  cy={yForKw(activePoint.loadKw)}
                  r={4.5}
                  fill="var(--rt-crimson-ink)"
                  stroke="var(--rt-surface)"
                  strokeWidth={1.5}
                />

                {sim.hourlySeries.map((pt) => (
                  <rect
                    key={pt.hour}
                    x={xForHour(pt.hour) - plotW / 96}
                    y={padT}
                    width={plotW / 48}
                    height={plotH}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setInspectHour(pt.hour)}
                    onClick={() => setInspectHour(pt.hour)}
                  />
                ))}
              </svg>
              <p className="text-xs text-charcoal-muted">
                Tap any hour on either chart to inspect exact kW, battery %, and live schematic below.
              </p>
            </section>
          </div>

          {/* Live System One-Line Diagram (Array panel shown ONLY in Student / Engineer view) */}
          <LiveSystemDiagram
            activePoint={activePoint}
            loads={activeLoadState.loads}
            totalLoadKw={activeLoadState.totalLoadKw}
            dayWeather={dayWeather}
            generatorRecharges={generatorRecharges}
          />

          {/* Load-Shed Events: Mobile Stacked List + Desktop Table */}
          <section className="rounded-2xl bg-surface border border-edge p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-bold text-charcoal flex items-center gap-2">
                <Table2 className="w-5 h-5 text-crimson-ink" aria-hidden="true" />
                <span>Load-Shed Events</span>
              </h2>
              <span className="text-xs text-charcoal-muted tabular-nums">{sim.shedEvents.length} events</span>
            </div>

            {sim.shedEvents.length === 0 ? (
              <div className="rounded-xl bg-surface-alt border border-edge p-4 text-sm text-charcoal-muted">
                No automatic shed transitions in this 48h run. Open <strong>Demo</strong> and switch to{' '}
                <strong>Storm (½ Solar)</strong> or tap <strong>Drain Battery -10%</strong> to inspect live shed
                transitions.
              </div>
            ) : (
              <>
                {/* Mobile stacked rows */}
                <div className="sm:hidden divide-y divide-edge">
                  {sim.shedEvents.map((row) => (
                    <div key={row.id} className="py-3 first:pt-1 last:pb-0 space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                        <span className="font-bold text-charcoal">
                          Hr {row.hour} · {row.timestamp}
                        </span>
                        <span className="font-bold text-crimson-ink">
                          {row.batteryPct}% · Stage {row.stage}
                        </span>
                      </div>
                      <p className="text-sm text-charcoal">{row.action}</p>
                      <div className="text-xs font-mono tabular-nums text-charcoal-muted">
                        Load delta: {row.loadDeltaKw > 0 ? `+${row.loadDeltaKw.toFixed(1)}` : row.loadDeltaKw.toFixed(1)}{' '}
                        kW
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-edge text-xs font-semibold text-charcoal-muted">
                        <th className="py-2.5 pr-4">Hour</th>
                        <th className="py-2.5 pr-4">Timestamp</th>
                        <th className="py-2.5 pr-4 text-right">Battery</th>
                        <th className="py-2.5 pr-4">Stage</th>
                        <th className="py-2.5 pr-4">Action</th>
                        <th className="py-2.5 text-right">Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-edge">
                      {sim.shedEvents.map((row) => (
                        <tr key={row.id} className="hover:bg-surface-hover">
                          <td className="py-2.5 pr-4 font-mono tabular-nums font-semibold text-charcoal">
                            Hr {row.hour}
                          </td>
                          <td className="py-2.5 pr-4 text-charcoal-muted whitespace-nowrap">{row.timestamp}</td>
                          <td className="py-2.5 pr-4 text-right font-mono tabular-nums font-semibold text-charcoal">
                            {row.batteryPct}%
                          </td>
                          <td className="py-2.5 pr-4 font-mono tabular-nums font-semibold text-crimson-ink">
                            Stage {row.stage}
                          </td>
                          <td className="py-2.5 pr-4 text-charcoal">{row.action}</td>
                          <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-charcoal-muted">
                            {row.loadDeltaKw > 0 ? `+${row.loadDeltaKw.toFixed(1)}` : row.loadDeltaKw.toFixed(1)} kW
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
