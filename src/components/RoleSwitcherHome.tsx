import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  HeartHandshake,
  Lock,
  LockOpen,
  ShieldAlert,
  Wifi,
} from 'lucide-react';
import { formatOutageHour, HUB_CAPACITY_MAX } from '../simulation/engine';
import { DayWeatherSchedule, HubSimulationResult, RoleId } from '../types/hub';

interface RoleSwitcherHomeProps {
  hubOpen: boolean;
  isOvernightClosed: boolean;
  headcount: number;
  currentHour: number;
  cellServiceUp: boolean;
  hotspotUp: boolean;
  dayWeather: DayWeatherSchedule;
  sim: HubSimulationResult;
  unlockedRoles: Record<RoleId, boolean>;
  onSelectRole: (role: RoleId) => void;
}

export function RoleSwitcherHome({
  hubOpen,
  isOvernightClosed,
  headcount,
  currentHour,
  cellServiceUp,
  hotspotUp,
  dayWeather,
  sim,
  unlockedRoles,
  onSelectRole,
}: RoleSwitcherHomeProps) {
  const timeMeta = formatOutageHour(currentHour);
  const currentDayWeather = currentHour < 24 ? dayWeather.day1 : dayWeather.day2;

  const roles: {
    id: RoleId;
    title: string;
    subtitle: string;
    detail: string;
    pinRequired: boolean;
    icon: typeof HeartHandshake;
    accentClass: string;
  }[] = [
    {
      id: 'resident',
      title: 'Resident',
      subtitle: 'No login · Open access',
      detail: 'Tuskegee weather map, help pins, services & walkie-talkie',
      pinRequired: false,
      icon: HeartHandshake,
      accentClass: 'bg-crimson text-white border border-gold/40',
    },
    {
      id: 'staff',
      title: 'Hub Staff',
      subtitle: unlockedRoles.staff ? 'Unlocked · Operations' : 'Staff PIN required',
      detail: 'Check-in, help queue, ports, packs & walkie-talkie',
      pinRequired: true,
      icon: ClipboardCheck,
      accentClass: 'bg-gold text-gold-band-ink border border-black/15',
    },
    {
      id: 'lead',
      title: 'Hub Lead',
      subtitle: unlockedRoles.lead ? 'Unlocked · Command' : 'Staff PIN required',
      detail: 'Tuskegee storm radar, overrides, generator & event log',
      pinRequired: true,
      icon: ShieldAlert,
      accentClass: 'bg-hero-bg text-hero-ink border border-hero-border',
    },
    {
      id: 'engineer',
      title: 'Student / Engineer',
      subtitle: unlockedRoles.engineer ? 'Unlocked · Living Lab' : 'Staff PIN required',
      detail: '48h solar/battery charts, totals & CSV export',
      pinRequired: true,
      icon: BarChart3,
      accentClass: 'bg-gold-band text-gold-band-ink border border-edge-strong',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-charcoal-muted">
        <span className="font-mono tabular-nums">
          Tompkins Hall · Hr {currentHour}/48 ({timeMeta.dayLabel}, {timeMeta.clockLabel})
        </span>
        <span className="font-medium">Prototype - simulated data</span>
      </div>

      {/* Rich Crimson & Gold Hero Snapshot */}
      <section className="rounded-2xl bg-hero-bg text-hero-ink p-5 sm:p-6 border-2 border-hero-border space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <img
              src="/assets/aistudio/Red_Tail_Energy_logo_828a9735.jpg"
              alt="Red Tail Energy — Power that holds"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-1.5 object-contain border-2 border-gold shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-hero-sub flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {hotspotUp ? 'Offline Hotspot: RedTail-Hub-Local' : 'Hotspot Offline · VHF Radios'}
                  {!cellServiceUp ? ' · No Cell' : ''}
                </span>
              </p>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-1 text-balance">
                Red Tail Hub · Tompkins Hall
              </h1>
              <p className="text-xs sm:text-sm text-hero-sub mt-0.5">
                Tuskegee University community resilience &amp; day support hub ·{' '}
                {currentDayWeather === 'storm' ? 'Storm (½ Solar)' : 'Clear (Full Solar)'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-2 gap-2.5 bg-gold-band text-gold-band-ink rounded-xl p-3 border border-black/15 shrink-0">
            <div>
              <div className="text-[11px] opacity-80 font-semibold">Status</div>
              <div className="text-sm sm:text-base font-bold">
                {isOvernightClosed ? 'Closed overnight' : hubOpen ? 'Open' : 'Closed'}
              </div>
            </div>
            <div>
              <div className="text-[11px] opacity-80 font-semibold">
                {isOvernightClosed ? 'Staff Only' : 'Inside'}
              </div>
              <div className="text-sm sm:text-base font-bold tabular-nums">
                {headcount}/{isOvernightClosed ? '5' : HUB_CAPACITY_MAX}
              </div>
            </div>
            <div>
              <div className="text-[11px] opacity-80 font-semibold">Battery</div>
              <div className="text-sm sm:text-base font-bold tabular-nums">{sim.batteryPct}%</div>
            </div>
            <div>
              <div className="text-[11px] opacity-80 font-semibold">Solar</div>
              <div className="text-sm sm:text-base font-bold tabular-nums">{sim.solarKw.toFixed(1)}kW</div>
            </div>
          </div>
        </div>
      </section>

      {/* Four Clean Role Buttons */}
      <section aria-labelledby="choose-role-heading" className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <h2 id="choose-role-heading" className="sr-only">
          Select Your View
        </h2>
        {roles.map((role) => {
          const Icon = role.icon;
          const isUnlocked = unlockedRoles[role.id];
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onSelectRole(role.id)}
              className="group text-left bg-surface hover:bg-surface-hover active:scale-[0.99] rounded-2xl border border-edge p-4 sm:p-5 transition-all flex items-center gap-4 min-h-[88px] cursor-pointer"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${role.accentClass}`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-charcoal">{role.title}</h3>
                  <span className="inline-flex items-center gap-1 shrink-0">
                    {role.pinRequired &&
                      (isUnlocked ? (
                        <LockOpen className="w-3.5 h-3.5 text-ok-ink" aria-hidden="true" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-charcoal-muted" aria-hidden="true" />
                      ))}
                    <ArrowRight
                      className="w-4 h-4 text-crimson-ink group-hover:translate-x-0.5 transition-transform"
                      aria-hidden="true"
                    />
                  </span>
                </div>
                <div className="text-xs font-semibold text-crimson-ink inline-flex items-center gap-1">
                  {role.pinRequired && !isUnlocked && (
                    <Lock className="w-3 h-3 shrink-0" aria-hidden="true" />
                  )}
                  <span>{role.subtitle}</span>
                </div>
                <p className="text-xs sm:text-sm text-charcoal-muted truncate mt-0.5">{role.detail}</p>
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}
