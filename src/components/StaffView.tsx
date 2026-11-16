import { useState } from 'react';
import {
  AlertTriangle,
  Battery,
  BatteryCharging,
  CheckCircle2,
  HeartPulse,
  LifeBuoy,
  Megaphone,
  Minus,
  PlugZap,
  Plus,
  Radio,
  ShieldCheck,
  UserMinus,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { formatOutageHour, HUB_CAPACITY_MAX, HUB_CAPACITY_WARN } from '../simulation/engine';
import {
  AlertItem,
  Announcement,
  BatteryPack,
  ChargingPort,
  HelpLocationRequest,
  HubSimulationResult,
  MedicalRequest,
  WalkieChannel,
  WalkieMessage,
} from '../types/hub';
import { CollapsibleSection } from './CollapsibleSection';
import { MessageBoardFeed } from './MessageBoardFeed';
import { WalkieTalkiePanel } from './WalkieTalkiePanel';

interface StaffViewProps {
  embeddedInLead?: boolean;
  hubOpen: boolean;
  isOvernightClosed?: boolean;
  headcount: number;
  currentHour: number;
  cellServiceUp: boolean;
  hotspotUp: boolean;
  sim: HubSimulationResult;
  alerts: AlertItem[];
  ports: ChargingPort[];
  batteryPacks: BatteryPack[];
  medicalRequests: MedicalRequest[];
  helpRequests: HelpLocationRequest[];
  announcements: Announcement[];
  walkieMessages: WalkieMessage[];
  onChangeHeadcount: (delta: number) => void;
  onTogglePort: (portId: string) => void;
  onUpdateMedicalStatus: (id: string, status: 'assigned' | 'completed') => void;
  onUpdateHelpStatus: (id: string, status: 'en_route' | 'resolved') => void;
  onCheckoutPack: (packNumber: number, borrowerLabel: string) => void;
  onCheckinPack: (packNumber: number) => void;
  onPostAnnouncement: (category: Announcement['category'], title: string, body: string) => void;
  onUpvoteAnnouncement: (id: string) => void;
  onSendWalkieMessage: (params: {
    channel: WalkieChannel;
    senderRole: 'Resident' | 'Hub Staff' | 'Hub Lead';
    kind: 'voice' | 'text';
    durationSec?: number;
    transcript: string;
    audioUrl?: string;
  }) => void;
}

export function StaffView({
  embeddedInLead = false,
  hubOpen,
  isOvernightClosed = false,
  headcount,
  currentHour,
  cellServiceUp,
  hotspotUp,
  sim,
  alerts,
  ports,
  batteryPacks,
  medicalRequests,
  helpRequests,
  announcements,
  walkieMessages,
  onChangeHeadcount,
  onTogglePort,
  onUpdateMedicalStatus,
  onUpdateHelpStatus,
  onCheckoutPack,
  onCheckinPack,
  onPostAnnouncement,
  onUpvoteAnnouncement,
  onSendWalkieMessage,
}: StaffViewProps) {
  const [selectedPackToCheckout, setSelectedPackToCheckout] = useState<number | null>(null);
  const [borrowerInput, setBorrowerInput] = useState('');

  const timeMeta = formatOutageHour(currentHour);
  const isAtWarn = headcount >= HUB_CAPACITY_WARN && headcount < HUB_CAPACITY_MAX;
  const isAtMax = headcount >= HUB_CAPACITY_MAX;

  const phoneLoad = sim.loads.find((l) => l.id === 'phone');
  const phonePortsPaused = !hubOpen || !phoneLoad || phoneLoad.actualKw === 0;

  const healthBanner =
    sim.healthColor === 'green'
      ? {
          bg: 'bg-ok-bg border-ok-border',
          badge: 'bg-ok-ink text-ok-bg',
          text: 'text-ok-ink',
          label: 'GREEN · NORMAL',
          Icon: ShieldCheck,
        }
      : sim.healthColor === 'yellow'
        ? {
            bg: 'bg-warn-bg border-warn-border',
            badge: 'bg-gold text-gold-band-ink',
            text: 'text-warn-ink',
            label: 'YELLOW · CONSERVE',
            Icon: AlertTriangle,
          }
        : {
            bg: 'bg-crit-bg border-crit-border',
            badge: 'bg-crimson text-white',
            text: 'text-crit-ink',
            label: 'RED · CRITICAL',
            Icon: XCircle,
          };

  const HealthIcon = healthBanner.Icon;

  const openPortCount = ports.filter((p) => !p.inUse).length;
  const availablePacksCount = batteryPacks.filter((p) => p.status === 'available').length;
  const overduePacksCount = batteryPacks.filter((p) => p.status === 'overdue').length;
  const waitingMedCount = medicalRequests.filter((m) => m.status === 'waiting').length;
  const activeHelpCount = helpRequests.filter((h) => h.status !== 'resolved').length;

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPackToCheckout === null) return;
    const label = borrowerInput.trim() || `Ticket #${100 + selectedPackToCheckout}`;
    onCheckoutPack(selectedPackToCheckout, label);
    setSelectedPackToCheckout(null);
    setBorrowerInput('');
  };

  return (
    <div className="space-y-4">
      {!embeddedInLead && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-charcoal-muted">
          <span className="font-mono tabular-nums">
            Hub Staff · Hr {currentHour}/48 ({timeMeta.dayLabel}, {timeMeta.clockLabel})
          </span>
          <span>Prototype - simulated data</span>
        </div>
      )}

      {/* Compact Alerts List */}
      {!embeddedInLead && (
        <section className="rounded-2xl bg-surface border border-edge p-4 space-y-2">
          <div className="text-sm sm:text-base font-bold text-charcoal flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-crimson-ink" aria-hidden="true" />
            <span>Alerts ({alerts.length})</span>
          </div>

          {alerts.length === 0 ? (
            <p className="text-xs sm:text-sm text-ok-ink font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <span>All systems normal.</span>
            </p>
          ) : (
            <div className="divide-y divide-edge">
              {alerts.map((alert) => (
                <div key={alert.id} className="py-2 first:pt-0.5 last:pb-0 flex items-start gap-2">
                  <span
                    className={`mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      alert.severity === 'critical'
                        ? 'bg-crimson text-white'
                        : alert.severity === 'warning'
                          ? 'bg-gold text-gold-band-ink'
                          : 'bg-surface-alt text-charcoal border border-edge'
                    }`}
                  >
                    {alert.severity === 'critical' ? 'CRIT' : alert.severity === 'warning' ? 'WARN' : 'INFO'}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-charcoal">{alert.title}</div>
                    <p className="text-xs text-charcoal-muted">{alert.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Power Status + Check-In Primary Row */}
      <div className={`grid grid-cols-1 ${embeddedInLead ? '' : 'lg:grid-cols-2'} gap-4 items-stretch`}>
        {!embeddedInLead && (
          <section className={`rounded-2xl border p-4 sm:p-5 space-y-3 ${healthBanner.bg}`}>
            <div className="flex items-center justify-between gap-3">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded ${healthBanner.badge}`}>
                <HealthIcon className="w-4 h-4" aria-hidden="true" />
                <span>{healthBanner.label}</span>
              </span>
              <BatteryCharging className={`w-6 h-6 shrink-0 ${healthBanner.text}`} aria-hidden="true" />
            </div>

            <div className="grid grid-cols-4 gap-2 bg-surface/90 rounded-xl border border-edge p-3">
              <div>
                <div className="text-[11px] text-charcoal-muted">Battery</div>
                <div className="text-lg sm:text-xl font-bold tabular-nums text-charcoal">{sim.batteryPct}%</div>
              </div>
              <div>
                <div className="text-[11px] text-charcoal-muted">Left</div>
                <div className="text-lg sm:text-xl font-bold tabular-nums text-charcoal">{sim.hoursRemaining}h</div>
              </div>
              <div>
                <div className="text-[11px] text-charcoal-muted">Solar</div>
                <div className="text-lg sm:text-xl font-bold tabular-nums text-charcoal">{sim.solarKw.toFixed(1)}kW</div>
              </div>
              <div>
                <div className="text-[11px] text-charcoal-muted">Load</div>
                <div className="text-lg sm:text-xl font-bold tabular-nums text-charcoal">{sim.totalLoadKw.toFixed(1)}kW</div>
              </div>
            </div>

            <div className="bg-surface/90 rounded-xl border border-edge p-3 space-y-1.5">
              <div className="text-xs sm:text-sm font-bold text-charcoal">Stage {sim.shedStage}</div>
              <p className="text-xs text-charcoal-muted">{sim.shedExplanation}</p>
            </div>
          </section>
        )}

        {/* One-Tap Check-In */}
        <section className="rounded-2xl bg-surface border border-edge p-4 sm:p-5 flex flex-col justify-between space-y-3.5">
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base sm:text-lg font-bold text-charcoal">
                {isOvernightClosed ? 'Closed Overnight · Staff Only' : 'Check-In'}
              </h2>
              <span className="text-xl font-bold font-mono tabular-nums text-charcoal">
                {headcount}{' '}
                <span className="text-sm font-normal text-charcoal-muted">
                  / {isOvernightClosed ? '5' : HUB_CAPACITY_MAX}
                </span>
              </span>
            </div>

            <div className="w-full h-2.5 bg-surface-alt rounded-full overflow-hidden border border-edge">
              <div
                className={`h-full transition-all duration-200 ${
                  isOvernightClosed
                    ? 'bg-charcoal-muted'
                    : isAtMax
                      ? 'bg-crimson'
                      : isAtWarn
                        ? 'bg-gold'
                        : 'bg-emerald-600'
                }`}
                style={{
                  width: `${Math.min(100, (headcount / (isOvernightClosed ? 5 : HUB_CAPACITY_MAX)) * 100)}%`,
                }}
              />
            </div>

            {isOvernightClosed ? (
              <p className="text-xs font-bold text-crimson-ink">
                Closed overnight (9 PM – 7 AM) · Staff only ({headcount}/5)
              </p>
            ) : isAtMax ? (
              <p className="text-xs font-bold text-crimson-ink">Full (250/250) — Check-ins blocked</p>
            ) : isAtWarn ? (
              <p className="text-xs font-bold text-gold-deep">Near limit ({headcount}/250) — Warn shuttles</p>
            ) : (
              <p className="text-xs text-charcoal-muted tabular-nums">
                {HUB_CAPACITY_MAX - headcount} spots open (warn 225 · block 250)
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChangeHeadcount(-1)}
              disabled={headcount <= 0}
              className="min-h-[50px] rounded-xl border border-edge-strong bg-surface-alt hover:bg-surface-hover text-charcoal font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <UserMinus className="w-4 h-4" aria-hidden="true" />
              <span>Exit (-1)</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeHeadcount(1)}
              disabled={isAtMax || isOvernightClosed}
              className="min-h-[50px] rounded-xl bg-crimson hover:bg-crimson-dark text-white font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              <span>{isOvernightClosed ? 'Closed Overnight' : isAtMax ? 'Blocked' : 'Check In (+1)'}</span>
            </button>
          </div>
        </section>
      </div>

      {/* Dedicated Walkie-Talkie Component */}
      <CollapsibleSection
        title="Walkie-Talkie"
        summary={
          hotspotUp
            ? `Offline hotspot active · ${walkieMessages.length} radio messages`
            : 'Wi-Fi out · Switch to handheld VHF Ch 1–3'
        }
        icon={Radio}
        defaultOpen
        highlightSummary={!hotspotUp}
      >
        <div className="pt-1">
          <WalkieTalkiePanel
            mode={embeddedInLead ? 'lead' : 'staff'}
            hotspotUp={hotspotUp}
            cellServiceUp={cellServiceUp}
            messages={walkieMessages}
            onSendMessage={onSendWalkieMessage}
          />
        </div>
      </CollapsibleSection>

      {/* Resident Location Help Pins */}
      <CollapsibleSection
        title="Location Help Pins"
        summary={
          activeHelpCount > 0
            ? `${activeHelpCount} active resident help pin${activeHelpCount > 1 ? 's' : ''}`
            : 'No active location help pins'
        }
        icon={LifeBuoy}
        defaultOpen={activeHelpCount > 0}
        highlightSummary={activeHelpCount > 0}
      >
        <div className="divide-y divide-edge pt-1">
          {helpRequests.map((req) => (
            <div key={req.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2.5">
              <div className="min-w-0">
                <div className="text-sm font-bold text-charcoal">
                  {req.helpType} · {req.landmark}
                </div>
                <div className="text-xs text-charcoal-muted">
                  {req.timeLabel}
                  {req.note ? ` · ${req.note}` : ''}
                </div>
              </div>
              {req.status === 'waiting' && (
                <button
                  type="button"
                  onClick={() => onUpdateHelpStatus(req.id, 'en_route')}
                  className="min-h-[38px] px-3 rounded-lg bg-crimson hover:bg-crimson-dark text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  Dispatch
                </button>
              )}
              {req.status === 'en_route' && (
                <button
                  type="button"
                  onClick={() => onUpdateHelpStatus(req.id, 'resolved')}
                  className="min-h-[38px] px-3 rounded-lg border border-edge-strong bg-surface-alt hover:bg-surface-hover text-xs font-bold text-charcoal shrink-0 cursor-pointer"
                >
                  Resolve
                </button>
              )}
              {req.status === 'resolved' && (
                <span className="text-xs font-semibold text-charcoal-muted shrink-0">Resolved</span>
              )}
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Medical Device Queue */}
      <CollapsibleSection
        title="Medical Queue"
        summary={waitingMedCount > 0 ? `${waitingMedCount} waiting` : 'All assigned / clear'}
        icon={HeartPulse}
        defaultOpen={waitingMedCount > 0}
        highlightSummary={waitingMedCount > 0}
      >
        <div className="divide-y divide-edge pt-1">
          {medicalRequests.map((req) => (
            <div key={req.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2.5">
              <div className="min-w-0">
                <div className="text-sm font-bold text-charcoal">{req.deviceType}</div>
                <div className="text-xs text-charcoal-muted">
                  {req.requestedTimeLabel} · {req.status === 'assigned' ? req.station : req.status}
                </div>
              </div>
              {req.status === 'waiting' && (
                <button
                  type="button"
                  onClick={() => onUpdateMedicalStatus(req.id, 'assigned')}
                  className="min-h-[38px] px-3 rounded-lg bg-crimson hover:bg-crimson-dark text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  Assign
                </button>
              )}
              {req.status === 'assigned' && (
                <button
                  type="button"
                  onClick={() => onUpdateMedicalStatus(req.id, 'completed')}
                  className="min-h-[38px] px-3 rounded-lg border border-edge-strong bg-surface-alt hover:bg-surface-hover text-xs font-bold text-charcoal shrink-0 cursor-pointer"
                >
                  Done
                </button>
              )}
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Phone Charging Port Map */}
      <CollapsibleSection
        title="Charging Ports"
        summary={phonePortsPaused ? 'Paused by load shed' : `${openPortCount}/${ports.length} open`}
        icon={PlugZap}
        highlightSummary={phonePortsPaused}
      >
        <div className="space-y-3 pt-1">
          {(['Table A', 'Table B', 'Wall Strip C'] as const).map((station) => {
            const stationPorts = ports.filter((p) => p.station === station);
            return (
              <div key={station} className="space-y-1.5">
                <div className="text-xs font-semibold text-charcoal-muted">{station}</div>
                <div className="grid grid-cols-4 gap-2">
                  {stationPorts.map((port) => {
                    const stateClass = phonePortsPaused
                      ? 'bg-surface-alt border-edge text-charcoal-muted opacity-65'
                      : port.inUse
                        ? 'bg-crit-bg border-crit-border text-crit-ink font-bold'
                        : 'bg-ok-bg border-ok-border text-ok-ink font-semibold';
                    return (
                      <button
                        key={port.id}
                        type="button"
                        onClick={() => onTogglePort(port.id)}
                        className={`min-h-[42px] rounded-lg border px-1.5 py-1 text-xs font-mono tabular-nums cursor-pointer ${stateClass}`}
                      >
                        <div>{port.id}</div>
                        <div className="text-[10px] font-sans">
                          {phonePortsPaused ? 'Paused' : port.inUse ? 'In Use' : 'Open'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Battery Lending Desk */}
      <CollapsibleSection
        title="Battery Pack Desk"
        summary={`${availablePacksCount}/10 ready · ${overduePacksCount} overdue`}
        icon={Battery}
        highlightSummary={overduePacksCount > 0}
      >
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {batteryPacks.map((pack) => {
              const isOverdue = pack.status === 'overdue';
              const isOut = pack.status === 'checked_out';
              return (
                <div
                  key={pack.packNumber}
                  className={`rounded-xl border p-2.5 flex flex-col justify-between gap-2 ${
                    isOverdue
                      ? 'bg-crit-bg border-crit-border'
                      : isOut
                        ? 'bg-warn-bg border-warn-border'
                        : 'bg-surface-alt border-edge'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-charcoal">
                        #{String(pack.packNumber).padStart(2, '0')}
                      </span>
                      <span
                        className={`text-[11px] font-bold ${
                          isOverdue ? 'text-crit-ink' : isOut ? 'text-warn-ink' : 'text-ok-ink'
                        }`}
                      >
                        {isOverdue ? 'OVERDUE' : isOut ? 'Out' : 'Ready'}
                      </span>
                    </div>
                    {pack.borrowerLabel && (
                      <div className="text-[11px] text-charcoal-muted truncate">{pack.borrowerLabel}</div>
                    )}
                  </div>

                  {pack.status === 'available' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPackToCheckout(pack.packNumber);
                        setBorrowerInput('');
                      }}
                      className="min-h-[36px] w-full rounded-lg bg-crimson hover:bg-crimson-dark text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" aria-hidden="true" />
                      <span>Loan</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCheckinPack(pack.packNumber)}
                      className="min-h-[36px] w-full rounded-lg bg-surface border border-edge-strong hover:bg-surface-hover text-charcoal text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" aria-hidden="true" />
                      <span>Return</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {selectedPackToCheckout !== null && (
            <form onSubmit={handleCheckoutSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={borrowerInput}
                onChange={(e) => setBorrowerInput(e.target.value)}
                placeholder={`Ticket for Pack #${String(selectedPackToCheckout).padStart(2, '0')}...`}
                autoFocus
                className="flex-1 min-h-[42px] px-3 rounded-lg border border-edge bg-input-bg text-sm text-charcoal"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="min-h-[42px] px-4 rounded-lg bg-crimson hover:bg-crimson-dark text-white text-xs font-bold cursor-pointer"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPackToCheckout(null)}
                  className="min-h-[42px] px-3 rounded-lg border border-edge-strong bg-surface-alt hover:bg-surface-hover text-charcoal text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </CollapsibleSection>

      {/* Fizz-Style Message Board (Staff can post directly!) */}
      <CollapsibleSection
        title="Message Board"
        summary={`${announcements.length} posts · Post updates to Resident board`}
        icon={Megaphone}
      >
        <div className="pt-1">
          <MessageBoardFeed
            announcements={announcements}
            onUpvote={onUpvoteAnnouncement}
            canPost
            onPost={onPostAnnouncement}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}
