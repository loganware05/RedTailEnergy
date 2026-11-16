import { useEffect } from 'react';
import {
  BatteryCharging,
  CloudRain,
  RotateCcw,
  Signal,
  SignalZero,
  Sun,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  formatOutageHour,
  HUB_CAPACITY_MAX,
  isDaylightHour,
  isHubOvernightClosed,
} from '../simulation/engine';
import { DayWeatherSchedule, HubSimulationResult, WeatherMode } from '../types/hub';

interface DemoControlsDrawerProps {
  open: boolean;
  onClose: () => void;
  currentHour: number;
  onChangeHour: (hour: number) => void;
  dayWeather: DayWeatherSchedule;
  onToggleDayWeather: (day: 'day1' | 'day2', weather: WeatherMode) => void;
  cellServiceUp: boolean;
  onToggleCellService: (up: boolean) => void;
  hotspotUp: boolean;
  onToggleHotspot: (up: boolean) => void;
  headcount: number;
  onAddPeople: (delta: number) => void;
  onDrainBattery10: () => void;
  onResetDemo: () => void;
  sim: HubSimulationResult;
}

export function DemoControlsDrawer({
  open,
  onClose,
  currentHour,
  onChangeHour,
  dayWeather,
  onToggleDayWeather,
  cellServiceUp,
  onToggleCellService,
  hotspotUp,
  onToggleHotspot,
  headcount,
  onAddPeople,
  onDrainBattery10,
  onResetDemo,
  sim,
}: DemoControlsDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [open]);

  if (!open) return null;

  const timeMeta = formatOutageHour(currentHour);
  const daylight = isDaylightHour(currentHour);
  const overnightClosed = isHubOvernightClosed(currentHour);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-controls-title"
    >
      <div className="w-full sm:max-w-xl bg-surface text-charcoal rounded-t-3xl sm:rounded-2xl border border-edge shadow-2xl max-h-[90vh] overflow-y-auto overscroll-contain">
        <div className="sm:hidden w-10 h-1.5 bg-edge-strong rounded-full mx-auto mt-3" />

        <div className="px-5 py-4 bg-hero-bg text-hero-ink border-b-2 border-hero-border flex items-center justify-between gap-4 sm:rounded-t-2xl">
          <div>
            <h2 id="demo-controls-title" className="text-lg font-bold">
              Demo Presentation Controls
            </h2>
            <p className="text-xs text-hero-sub mt-0.5">
              Changes update Resident, Hub Staff, Hub Lead, and Engineer views live · Prototype - simulated data
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close demo controls"
            className="min-w-[44px] min-h-[44px] rounded-xl border border-white/25 bg-black/20 flex items-center justify-center text-white hover:bg-black/35 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Live Telemetry Readout Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-alt border border-edge rounded-xl p-3.5">
            <div>
              <div className="text-xs text-charcoal-muted">Battery</div>
              <div className="text-lg font-bold tabular-nums text-charcoal">{sim.batteryPct}%</div>
            </div>
            <div>
              <div className="text-xs text-charcoal-muted">Shed Stage</div>
              <div className="text-lg font-bold tabular-nums text-charcoal">Stage {sim.shedStage}</div>
            </div>
            <div>
              <div className="text-xs text-charcoal-muted">Solar / Load</div>
              <div className="text-lg font-bold tabular-nums text-charcoal">
                {sim.solarKw.toFixed(1)} / {sim.totalLoadKw.toFixed(1)} kW
              </div>
            </div>
            <div>
              <div className="text-xs text-charcoal-muted">
                {overnightClosed ? 'Staff Overnight' : 'Headcount'}
              </div>
              <div className="text-lg font-bold tabular-nums text-charcoal">
                {headcount} / {overnightClosed ? '5' : HUB_CAPACITY_MAX}
              </div>
            </div>
          </div>

          {/* 48-Hour Time Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="outage-hour-slider" className="text-sm font-semibold text-charcoal">
                Outage Timeline (Hour 0 to 48)
              </label>
              <span className="text-sm font-mono tabular-nums font-medium text-crimson-ink">
                Hr {currentHour} · {timeMeta.dayLabel}, {timeMeta.clockLabel} ·{' '}
                {overnightClosed ? 'Closed overnight' : daylight ? 'Daylight' : 'Evening Open'}
              </span>
            </div>
            <input
              id="outage-hour-slider"
              type="range"
              min={0}
              max={48}
              step={1}
              value={currentHour}
              onChange={(e) => onChangeHour(Number(e.target.value))}
              className="w-full h-3 accent-crimson cursor-pointer"
            />
            <div className="flex justify-between text-xs font-mono tabular-nums text-charcoal-muted">
              <span>Hr 0 (8 AM D1)</span>
              <span>Hr 12 (8 PM D1)</span>
              <span>Hr 24 (8 AM D2)</span>
              <span>Hr 36 (8 PM D2)</span>
              <span>Hr 48</span>
            </div>
          </div>

          {/* Weather & Cell Service Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-charcoal">Weather Condition (Any Day)</div>
              <div className="space-y-2">
                {([
                  { key: 'day1', label: 'Day 1 (Hrs 0–24)', kwh: sim.day1SolarKwh },
                  { key: 'day2', label: 'Day 2 (Hrs 24–48)', kwh: sim.day2SolarKwh },
                ] as const).map((dayItem) => (
                  <div key={dayItem.key} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-charcoal-muted">
                      <span>{dayItem.label}</span>
                      <span className="font-mono tabular-nums">{dayItem.kwh} kWh</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-alt border border-edge rounded-xl">
                      <button
                        type="button"
                        onClick={() => onToggleDayWeather(dayItem.key, 'clear')}
                        className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          dayWeather[dayItem.key] === 'clear'
                            ? 'bg-crimson text-white shadow-xs'
                            : 'text-charcoal-muted hover:text-charcoal'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Clear</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleDayWeather(dayItem.key, 'storm')}
                        className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          dayWeather[dayItem.key] === 'storm'
                            ? 'bg-crimson text-white shadow-xs'
                            : 'text-charcoal-muted hover:text-charcoal'
                        }`}
                      >
                        <CloudRain className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Storm (½)</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-charcoal">Area Cell Service</div>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-alt border border-edge rounded-xl">
                <button
                  type="button"
                  onClick={() => onToggleCellService(false)}
                  className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    !cellServiceUp
                      ? 'bg-crimson text-white shadow-xs'
                      : 'text-charcoal-muted hover:text-charcoal'
                  }`}
                >
                  <SignalZero className="w-4 h-4" aria-hidden="true" />
                  <span>Off (Hrs 0–12)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleCellService(true)}
                  className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    cellServiceUp
                      ? 'bg-ok-bg text-ok-ink border border-ok-border shadow-xs'
                      : 'text-charcoal-muted hover:text-charcoal'
                  }`}
                >
                  <Signal className="w-4 h-4" aria-hidden="true" />
                  <span>On (Restored)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Local Offline Hotspot Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-charcoal">
                Hub Offline Hotspot (No Internet Needed)
              </span>
              <span className="text-xs font-mono text-charcoal-muted">RedTail-Hub-Local</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-alt border border-edge rounded-xl">
              <button
                type="button"
                onClick={() => onToggleHotspot(true)}
                className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  hotspotUp
                    ? 'bg-ok-bg text-ok-ink border border-ok-border shadow-xs'
                    : 'text-charcoal-muted hover:text-charcoal'
                }`}
              >
                <Wifi className="w-4 h-4" aria-hidden="true" />
                <span>Hotspot On (LAN)</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleHotspot(false)}
                className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  !hotspotUp
                    ? 'bg-crimson text-white shadow-xs'
                    : 'text-charcoal-muted hover:text-charcoal'
                }`}
              >
                <WifiOff className="w-4 h-4" aria-hidden="true" />
                <span>Wi-Fi Out (Radio Mode)</span>
              </button>
            </div>
          </div>

          {/* Instant Scenario Triggers */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-charcoal">Live Scenario Triggers</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onAddPeople(25)}
                disabled={overnightClosed || headcount >= HUB_CAPACITY_MAX}
                className="min-h-[48px] px-4 py-2.5 rounded-xl bg-gold-band text-gold-band-ink border border-edge-strong text-sm font-bold flex items-center justify-center gap-2 hover:brightness-95 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
              >
                <Users className="w-4 h-4" aria-hidden="true" />
                <span>{overnightClosed ? 'Closed Overnight' : 'Add 25 People'}</span>
              </button>

              <button
                type="button"
                onClick={onDrainBattery10}
                disabled={sim.batteryPct <= 4}
                className="min-h-[48px] px-4 py-2.5 rounded-xl bg-crimson text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-crimson-dark disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
              >
                <BatteryCharging className="w-4 h-4" aria-hidden="true" />
                <span>Drain Battery -10%</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-edge flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onResetDemo}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-edge-strong bg-surface-alt text-sm font-semibold text-charcoal hover:bg-surface-hover inline-flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Reset Simulation</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-gold text-gold-band-ink text-sm font-bold hover:brightness-95 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
