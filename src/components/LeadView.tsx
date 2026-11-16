import { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  BatteryCharging,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Fuel,
  History,
  Power,
  Radio,
  Satellite,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wifi,
  XCircle,
} from 'lucide-react';
import { formatOutageHour, HUB_CAPACITY_MAX, LOAD_DEFINITIONS } from '../simulation/engine';
import {
  AlertItem,
  Announcement,
  BatteryPack,
  ChargingPort,
  DayWeatherSchedule,
  GeneratorRecharge,
  HelpLocationRequest,
  HubEvent,
  HubSimulationResult,
  InspectionChecklistItem,
  LoadId,
  LoadOverrideMode,
  MedicalRequest,
  ShiftMember,
  WalkieChannel,
  WalkieMessage,
  WeatherMode,
} from '../types/hub';
import { CollapsibleSection } from './CollapsibleSection';
import { StaffView } from './StaffView';
import { TuskegeeWeatherMap } from './TuskegeeWeatherMap';

interface LeadViewProps {
  mapsApiKey: string;
  hubOpen: boolean;
  isOvernightClosed: boolean;
  onToggleHubOpen: (open: boolean) => void;
  headcount: number;
  currentHour: number;
  cellServiceUp: boolean;
  hotspotUp: boolean;
  dayWeather: DayWeatherSchedule;
  onToggleDayWeather: (day: 'day1' | 'day2', weather: WeatherMode) => void;
  sim: HubSimulationResult;
  alerts: AlertItem[];
  ports: ChargingPort[];
  batteryPacks: BatteryPack[];
  medicalRequests: MedicalRequest[];
  helpRequests: HelpLocationRequest[];
  announcements: Announcement[];
  walkieMessages: WalkieMessage[];
  overrides: Record<LoadId, LoadOverrideMode>;
  generatorRecharges: GeneratorRecharge[];
  shiftRoster: ShiftMember[];
  handoffNote: string;
  events: HubEvent[];
  inspectionChecklist: InspectionChecklistItem[];
  onToggleInspectionItem: (id: string) => void;
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
  onSetLoadOverride: (loadId: LoadId, mode: LoadOverrideMode) => void;
  onRequestGenerator: () => void;
  onLogGeneratorCompleted: () => void;
  onSaveHandoffNote: (note: string) => void;
}

export function LeadView({
  mapsApiKey,
  hubOpen,
  isOvernightClosed,
  onToggleHubOpen,
  headcount,
  currentHour,
  cellServiceUp,
  hotspotUp,
  dayWeather,
  onToggleDayWeather,
  sim,
  alerts,
  ports,
  batteryPacks,
  medicalRequests,
  helpRequests,
  announcements,
  walkieMessages,
  generatorRecharges,
  shiftRoster,
  handoffNote,
  events,
  inspectionChecklist,
  onToggleInspectionItem,
  onChangeHeadcount,
  onTogglePort,
  onUpdateMedicalStatus,
  onUpdateHelpStatus,
  onCheckoutPack,
  onCheckinPack,
  onPostAnnouncement,
  onUpvoteAnnouncement,
  onSendWalkieMessage,
  onSetLoadOverride,
  onRequestGenerator,
  onLogGeneratorCompleted,
  onSaveHandoffNote,
}: LeadViewProps) {
  const [pendingOverride, setPendingOverride] = useState<{
    loadId: LoadId;
    targetMode: LoadOverrideMode;
  } | null>(null);
  const [criticalAck, setCriticalAck] = useState(false);
  const [draftNote, setDraftNote] = useState(handoffNote);
  const [noteSavedToast, setNoteSavedToast] = useState(false);

  const timeMeta = formatOutageHour(currentHour);
  const pendingLoadDef = pendingOverride
    ? LOAD_DEFINITIONS.find((d) => d.id === pendingOverride.loadId)
    : null;
  const isCriticalTurnOff = Boolean(
    pendingOverride && pendingLoadDef?.critical && pendingOverride.targetMode === 'force_off'
  );

  const commsLoad = sim.loads.find((l) => l.id === 'comms');
  const commsPowered = Boolean(commsLoad && commsLoad.actualKw > 0);
  const pendingGenRequest = generatorRecharges.find((g) => g.status === 'requested');
  const completedGenCount = generatorRecharges.filter((g) => g.status === 'completed').length;

  const healthBanner =
    sim.healthColor === 'green'
      ? {
          bg: 'bg-ok-bg border-ok-border',
          badge: 'bg-ok-ink text-surface',
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

  const openConfirmModal = (loadId: LoadId, targetMode: LoadOverrideMode) => {
    setPendingOverride({ loadId, targetMode });
    setCriticalAck(false);
  };

  const confirmOverride = () => {
    if (!pendingOverride) return;
    if (isCriticalTurnOff && !criticalAck) return;
    onSetLoadOverride(pendingOverride.loadId, pendingOverride.targetMode);
    setPendingOverride(null);
    setCriticalAck(false);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveHandoffNote(draftNote);
    setNoteSavedToast(true);
    setTimeout(() => setNoteSavedToast(false), 2500);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-charcoal-muted">
        <div>
          <span className="font-semibold text-charcoal">Hub Lead Command</span>
          <span aria-hidden="true"> · </span>
          <span>Tompkins Hall</span>
          <span aria-hidden="true"> · </span>
          <span className="font-mono tabular-nums">
            Hr {currentHour}/48 ({timeMeta.dayLabel}, {timeMeta.clockLabel})
          </span>
        </div>
        <span className="text-xs font-medium text-charcoal-muted">Prototype - simulated data</span>
      </div>

      {/* Critical 15% Generator Alert Banner */}
      {sim.batteryPct <= 15 && (
        <div className="rounded-2xl bg-hero-bg text-hero-ink p-4 sm:p-5 border-2 border-hero-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-6 h-6 text-gold shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Critical Reserve ({sim.batteryPct}% Battery)
              </h2>
              <p className="text-xs sm:text-sm text-hero-sub">
                Start or log a backup generator recharge now. Medical, fridge, and comms remain protected.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogGeneratorCompleted}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-gold text-gold-band-ink font-bold text-sm hover:brightness-95 shrink-0 cursor-pointer"
          >
            Log Recharge (+35%)
          </button>
        </div>
      )}

      {/* Top Row: Power Status + Open/Close & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <section className={`rounded-2xl border p-4 sm:p-5 space-y-3.5 ${healthBanner.bg}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded ${healthBanner.badge}`}>
                <HealthIcon className="w-4 h-4" aria-hidden="true" />
                <span>{healthBanner.label}</span>
              </span>
              <h2 className={`text-lg font-bold mt-2 ${healthBanner.text}`}>Microgrid Power</h2>
            </div>
            <BatteryCharging className={`w-7 h-7 shrink-0 ${healthBanner.text}`} aria-hidden="true" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-surface rounded-xl border border-edge p-3">
            <div>
              <div className="text-xs text-charcoal-muted">Battery</div>
              <div className="text-xl font-bold tabular-nums text-charcoal">{sim.batteryPct}%</div>
              <div className="text-[11px] font-mono tabular-nums text-charcoal-muted">{sim.batteryKwh}/27 kWh</div>
            </div>
            <div>
              <div className="text-xs text-charcoal-muted">Remaining</div>
              <div className="text-xl font-bold tabular-nums text-charcoal">{sim.hoursRemaining}h</div>
              <div className="text-[11px] text-charcoal-muted">at draw</div>
            </div>
            <div>
              <div className="text-xs text-charcoal-muted">Solar</div>
              <div className="text-xl font-bold tabular-nums text-charcoal">{sim.solarKw.toFixed(1)}</div>
              <div className="text-[11px] text-charcoal-muted">kW now</div>
            </div>
            <div>
              <div className="text-xs text-charcoal-muted">Load</div>
              <div className="text-xl font-bold tabular-nums text-charcoal">{sim.totalLoadKw.toFixed(1)}</div>
              <div className="text-[11px] text-charcoal-muted">kW now</div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-charcoal bg-surface rounded-xl border border-edge p-3">
            <strong>Shed Stage {sim.shedStage}:</strong> {sim.shedExplanation}
          </p>
        </section>

        <section className="rounded-2xl bg-surface border border-edge p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-bold text-charcoal flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-crimson-ink" aria-hidden="true" />
                <span>Alerts ({alerts.length})</span>
              </h2>
              <button
                type="button"
                onClick={() => onToggleHubOpen(!hubOpen)}
                disabled={isOvernightClosed}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed ${
                  hubOpen
                    ? 'bg-ok-bg border-ok-border text-ok-ink'
                    : 'bg-crimson text-white border-crimson-dark'
                }`}
              >
                {isOvernightClosed ? 'Closed overnight' : hubOpen ? 'Hub: Open' : 'Hub: Closed'}
              </button>
            </div>

            {alerts.length === 0 ? (
              <p className="text-sm text-ok-ink font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>No active alerts.</span>
              </p>
            ) : (
              <div className="divide-y divide-edge">
                {alerts.slice(0, 4).map((alert) => (
                  <div key={alert.id} className="py-2 first:pt-0 last:pb-0 flex items-start gap-2">
                    <span
                      className={`mt-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
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
                      <p className="text-xs text-charcoal-muted line-clamp-2">{alert.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Tuskegee Simulated Weather & Storm Command Map (Built-in Campus Map when cell is off) */}
      <TuskegeeWeatherMap
        mode="lead"
        apiKey={mapsApiKey}
        cellServiceUp={cellServiceUp}
        hotspotUp={hotspotUp}
        headcount={headcount}
        maxCapacity={HUB_CAPACITY_MAX}
        currentHour={currentHour}
        solarKw={sim.solarKw}
        isOvernightClosed={isOvernightClosed}
        helpRequests={helpRequests}
        dayWeather={dayWeather}
        onSyncDayWeather={onToggleDayWeather}
      />

      {/* Post-Storm Inspection Checklist (Hub Lead) */}
      <CollapsibleSection
        title="Post-Storm Inspection Checklist"
        summary={`${inspectionChecklist.filter((i) => i.checked).length}/${inspectionChecklist.length} items verified · Read & check off`}
        icon={ClipboardCheck}
        defaultOpen
      >
        <div className="divide-y divide-edge pt-1">
          {inspectionChecklist.map((item) => (
            <label
              key={item.id}
              className="py-3 first:pt-1 last:pb-0 flex items-start gap-3 cursor-pointer hover:bg-surface-hover/50 rounded-lg px-1"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => onToggleInspectionItem(item.id)}
                className="mt-1 w-4 h-4 accent-crimson shrink-0 cursor-pointer"
              />
              <div className="min-w-0">
                <div
                  className={`text-sm font-bold ${
                    item.checked ? 'line-through text-charcoal-muted' : 'text-charcoal'
                  }`}
                >
                  {item.label}
                </div>
                <p className="text-xs text-charcoal-muted mt-0.5">{item.detail}</p>
              </div>
            </label>
          ))}
        </div>
      </CollapsibleSection>

      {/* Collapsible Lead & Staff Operational Sections */}
      <CollapsibleSection
        title="Manual Load Overrides"
        summary={`Active load ${sim.totalLoadKw.toFixed(1)} kW · Tap any circuit to override with safety confirm`}
        icon={Power}
        defaultOpen
      >
        <div className="divide-y divide-edge">
          {sim.loads.map((load) => {
            const def = LOAD_DEFINITIONS.find((d) => d.id === load.id)!;
            return (
              <div
                key={load.id}
                className="py-3.5 first:pt-1 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm sm:text-base font-bold text-charcoal">{load.name}</span>
                    <span className="text-xs font-mono tabular-nums text-charcoal-muted">
                      {load.actualKw.toFixed(1)}/{load.nominalKw.toFixed(1)} kW
                    </span>
                    {def.critical && <span className="text-xs font-bold text-crimson-ink">· Critical</span>}
                  </div>
                  <p className="text-xs text-charcoal-muted">
                    {load.statusLabel} ({load.overrideMode === 'auto' ? 'Auto' : 'Manual'})
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-1 p-1 bg-surface-alt border border-edge rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => openConfirmModal(load.id, 'auto')}
                    disabled={load.overrideMode === 'auto'}
                    className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      load.overrideMode === 'auto'
                        ? 'bg-surface text-charcoal shadow-xs border border-edge'
                        : 'text-charcoal-muted hover:text-charcoal'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => openConfirmModal(load.id, 'force_on')}
                    disabled={load.overrideMode === 'force_on'}
                    className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      load.overrideMode === 'force_on'
                        ? 'bg-ok-bg border border-ok-border text-ok-ink'
                        : 'text-charcoal-muted hover:text-charcoal'
                    }`}
                  >
                    On
                  </button>
                  <button
                    type="button"
                    onClick={() => openConfirmModal(load.id, 'force_off')}
                    disabled={load.overrideMode === 'force_off'}
                    className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      load.overrideMode === 'force_off'
                        ? 'bg-crimson text-white'
                        : 'text-crimson-ink hover:bg-crimson-soft'
                    }`}
                  >
                    Off
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Backup Generator Recharge"
        summary={
          pendingGenRequest
            ? `Recharge requested at Hr ${pendingGenRequest.hour}`
            : `${completedGenCount} completed recharge cycle${completedGenCount === 1 ? '' : 's'}`
        }
        icon={Fuel}
        highlightSummary={Boolean(pendingGenRequest) || sim.batteryPct <= 15}
      >
        <div className="space-y-3 pt-1">
          <p className="text-sm text-charcoal-muted">
            Request campus facilities dispatch or log a completed 1-hour backup generator run (+9.5 kWh / +35% battery).
          </p>
          {pendingGenRequest && (
            <div className="rounded-xl bg-warn-bg border border-warn-border p-3 text-sm text-warn-ink">
              <strong>Pending Request (Hr {pendingGenRequest.hour}):</strong> {pendingGenRequest.note}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onRequestGenerator}
              className="min-h-[48px] px-4 py-2.5 rounded-xl border border-edge bg-surface-alt hover:bg-surface-hover text-charcoal text-sm font-bold cursor-pointer"
            >
              Request Generator Dispatch
            </button>
            <button
              type="button"
              onClick={onLogGeneratorCompleted}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-crimson hover:bg-crimson-dark text-white text-sm font-bold cursor-pointer"
            >
              Log Completed Recharge (+35%)
            </button>
          </div>
        </div>
      </CollapsibleSection>

      {/* Embedded Full Staff Operations */}
      <StaffView
        embeddedInLead
        hubOpen={hubOpen}
        isOvernightClosed={isOvernightClosed}
        headcount={headcount}
        currentHour={currentHour}
        cellServiceUp={cellServiceUp}
        hotspotUp={hotspotUp}
        sim={sim}
        alerts={alerts}
        ports={ports}
        batteryPacks={batteryPacks}
        medicalRequests={medicalRequests}
        helpRequests={helpRequests}
        announcements={announcements}
        walkieMessages={walkieMessages}
        onChangeHeadcount={onChangeHeadcount}
        onTogglePort={onTogglePort}
        onUpdateMedicalStatus={onUpdateMedicalStatus}
        onUpdateHelpStatus={onUpdateHelpStatus}
        onCheckoutPack={onCheckoutPack}
        onCheckinPack={onCheckinPack}
        onPostAnnouncement={onPostAnnouncement}
        onUpvoteAnnouncement={onUpvoteAnnouncement}
        onSendWalkieMessage={onSendWalkieMessage}
      />

      <CollapsibleSection
        title="Communications & Shift Handoff"
        summary={`Hotspot ${hotspotUp ? 'On (Offline LAN)' : 'Off (VHF Mode)'} · Radios ${commsPowered ? 'Active' : 'Off'} · Cell ${cellServiceUp ? 'On' : 'Off'}`}
        icon={Radio}
      >
        <div className="space-y-5 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-surface-alt border border-edge p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-charcoal flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-crimson-ink" aria-hidden="true" />
                  <span>Radios</span>
                </span>
                <span className={`text-xs font-bold ${commsPowered ? 'text-ok-ink' : 'text-crimson-ink'}`}>
                  {commsPowered ? 'Active' : 'Offline'}
                </span>
              </div>
              <p className="text-xs text-charcoal-muted">Ch 1 Lead · Ch 2 Desk · Ch 3 Facilities</p>
            </div>

            <div className="rounded-xl bg-surface-alt border border-edge p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-charcoal flex items-center gap-1.5">
                  <Satellite className="w-4 h-4 text-crimson-ink" aria-hidden="true" />
                  <span>Satellite Link</span>
                </span>
                <span className={`text-xs font-bold ${commsPowered ? 'text-ok-ink' : 'text-crimson-ink'}`}>
                  {commsPowered ? 'Connected' : 'Off'}
                </span>
              </div>
              <p className="text-xs text-charcoal-muted">Emergency backhaul for county EMA</p>
            </div>

            <div className="rounded-xl bg-surface-alt border border-edge p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-charcoal flex items-center gap-1.5">
                  <Wifi className="w-4 h-4 text-crimson-ink" aria-hidden="true" />
                  <span>Offline Hotspot</span>
                </span>
                <span className={`text-xs font-bold ${hotspotUp ? 'text-ok-ink' : 'text-crimson-ink'}`}>
                  {hotspotUp ? 'Active (No Internet)' : 'Offline'}
                </span>
              </div>
              <p className="text-xs text-charcoal-muted">
                RedTail-Hub-Local · Cell: {cellServiceUp ? 'Restored' : 'Down'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-charcoal flex items-center gap-2">
              <Users className="w-4 h-4 text-crimson-ink" aria-hidden="true" />
              <span>Shift Roster</span>
            </h3>
            <div className="divide-y divide-edge border border-edge rounded-xl px-3.5 bg-surface-alt">
              {shiftRoster.map((member) => (
                <div key={member.id} className="py-2.5 flex items-center justify-between gap-2 text-xs sm:text-sm">
                  <div>
                    <div className="font-bold text-charcoal">{member.name}</div>
                    <div className="text-xs text-charcoal-muted">{member.role}</div>
                  </div>
                  <div className="text-right font-mono tabular-nums text-xs text-charcoal">
                    <div>{member.shiftWindow}</div>
                    <div className="text-charcoal-muted">{member.contactChannel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSaveNote} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="handoff-note-input" className="text-sm font-bold text-charcoal flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-crimson-ink" aria-hidden="true" />
                <span>Shift Handoff Note</span>
              </label>
              {noteSavedToast && <span className="text-xs font-bold text-ok-ink">Saved</span>}
            </div>
            <textarea
              id="handoff-note-input"
              rows={3}
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              className="w-full p-3 rounded-xl border border-edge bg-input-bg text-sm text-charcoal"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 py-2 rounded-xl bg-crimson text-white text-sm font-bold hover:bg-crimson-dark cursor-pointer"
            >
              Save Handoff Note
            </button>
          </form>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Event Log"
        summary={`${events.length} automatic & manual actions recorded`}
        icon={History}
      >
        <div className="divide-y divide-edge pt-1">
          {events.map((evt) => (
            <div key={evt.id} className="py-2.5 first:pt-0 last:pb-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-mono tabular-nums font-semibold text-charcoal-muted">
                  Hr {evt.hour} ({evt.timeLabel})
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-bold text-crimson-ink">{evt.source}</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-charcoal-muted">{evt.category}</span>
              </div>
              <p className="text-sm text-charcoal">{evt.message}</p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Override Confirmation Modal */}
      {pendingOverride && pendingLoadDef && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="override-confirm-title"
        >
          <div className="w-full sm:max-w-md bg-surface text-charcoal rounded-t-3xl sm:rounded-2xl border border-edge shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isCriticalTurnOff ? 'bg-crimson text-white' : 'bg-gold text-gold-band-ink'
                }`}
              >
                <ShieldAlert className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 id="override-confirm-title" className="text-lg font-bold text-charcoal">
                  Confirm Load Override
                </h3>
                <p className="text-sm text-charcoal-muted">
                  Set <span className="font-bold text-charcoal">{pendingLoadDef.name}</span> to{' '}
                  <span className="font-bold text-charcoal">
                    {pendingOverride.targetMode === 'auto'
                      ? 'Automatic Control'
                      : pendingOverride.targetMode === 'force_on'
                        ? 'Force ON'
                        : 'Force OFF'}
                  </span>
                </p>
              </div>
            </div>

            {isCriticalTurnOff && (
              <div className="rounded-xl bg-crit-bg border border-crit-border p-4 space-y-3">
                <p className="text-sm font-bold text-crit-ink">
                  LIFE-SAFETY &amp; CRITICAL SERVICE WARNING
                </p>
                <p className="text-sm text-charcoal leading-relaxed">
                  {pendingLoadDef.id === 'medical' &&
                    'Turning off Medical Device Charging cuts power to CPAP, oxygen concentrators, and resident life-support chargers.'}
                  {pendingLoadDef.id === 'fridge' &&
                    'Turning off the Medication Refrigerator risks spoiling insulin and cold-chain prescriptions.'}
                  {pendingLoadDef.id === 'comms' &&
                    'Turning off Hub Communications disables local Wi-Fi, satellite backhaul, and emergency radio repeaters.'}
                </p>
                <label className="flex items-start gap-2.5 text-sm font-semibold text-charcoal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criticalAck}
                    onChange={(e) => setCriticalAck(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-crimson"
                  />
                  <span>I am the Hub Lead and have verified no residents or medications are at risk.</span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingOverride(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-edge text-sm font-semibold text-charcoal hover:bg-surface-hover cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmOverride}
                disabled={isCriticalTurnOff && !criticalAck}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-crimson text-white text-sm font-bold hover:bg-crimson-dark disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
