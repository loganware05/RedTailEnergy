import { useState } from 'react';
import {
  AlertCircle,
  Battery,
  CheckCircle2,
  GraduationCap,
  HeartPulse,
  PauseCircle,
  PhoneCall,
  PlugZap,
  Radio,
  Snowflake,
  ThermometerSnowflake,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { formatOutageHour, HUB_CAPACITY_MAX, HUB_CAPACITY_WARN } from '../simulation/engine';
import {
  Announcement,
  BatteryPack,
  ChargingPort,
  DayWeatherSchedule,
  HelpLocationRequest,
  HubSimulationResult,
  ServiceAvailability,
  TrainingSession,
  WalkieChannel,
  WalkieMessage,
} from '../types/hub';
import { CollapsibleSection } from './CollapsibleSection';
import { MessageBoardFeed } from './MessageBoardFeed';
import { TuskegeeWeatherMap } from './TuskegeeWeatherMap';
import { WalkieTalkiePanel } from './WalkieTalkiePanel';

interface ResidentViewProps {
  mapsApiKey: string;
  hubOpen: boolean;
  isOvernightClosed: boolean;
  headcount: number;
  currentHour: number;
  cellServiceUp: boolean;
  hotspotUp: boolean;
  dayWeather: DayWeatherSchedule;
  sim: HubSimulationResult;
  ports: ChargingPort[];
  batteryPacks: BatteryPack[];
  announcements: Announcement[];
  helpRequests: HelpLocationRequest[];
  trainings: TrainingSession[];
  walkieMessages: WalkieMessage[];
  onFlagMedicalNeed: (deviceType: string, note: string) => void;
  onSubmitHelpRequest: (params: {
    landmark: string;
    helpType: HelpLocationRequest['helpType'];
    note: string;
    xPct: number;
    yPct: number;
  }) => void;
  onToggleTrainingRsvp: (id: string) => void;
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

function getBusyShort(headcount: number, isOvernightClosed: boolean): string {
  if (isOvernightClosed) return 'Closed overnight';
  if (headcount >= HUB_CAPACITY_MAX) return 'Full';
  if (headcount >= HUB_CAPACITY_WARN) return 'Very Busy';
  if (headcount >= 140) return 'Moderate';
  return 'Quiet';
}

function availabilityTone(status: ServiceAvailability) {
  if (status === 'Available') return { text: 'text-ok-ink', Icon: CheckCircle2 };
  if (status === 'Limited') return { text: 'text-warn-ink', Icon: AlertCircle };
  return { text: 'text-crimson-ink', Icon: PauseCircle };
}

export function ResidentView({
  mapsApiKey,
  hubOpen,
  isOvernightClosed,
  headcount,
  currentHour,
  cellServiceUp,
  hotspotUp,
  dayWeather,
  sim,
  ports,
  batteryPacks,
  announcements,
  helpRequests,
  trainings,
  walkieMessages,
  onFlagMedicalNeed,
  onSubmitHelpRequest,
  onToggleTrainingRsvp,
  onUpvoteAnnouncement,
  onSendWalkieMessage,
}: ResidentViewProps) {
  const [medModalOpen, setMedModalOpen] = useState(false);
  const [deviceType, setDeviceType] = useState('CPAP / BiPAP');
  const [medNote, setMedNote] = useState('');
  const [medSubmitted, setMedSubmitted] = useState(false);

  const timeMeta = formatOutageHour(currentHour);
  const busyShort = getBusyShort(headcount, isOvernightClosed);

  const phoneLoad = sim.loads.find((l) => l.id === 'phone');
  const medicalLoad = sim.loads.find((l) => l.id === 'medical');
  const fridgeLoad = sim.loads.find((l) => l.id === 'fridge');

  const openPortsCount = ports.filter((p) => !p.inUse).length;
  const totalPortsCount = ports.length;

  const phoneStatus: ServiceAvailability = !hubOpen
    ? 'Paused'
    : phoneLoad && phoneLoad.actualKw > 0
      ? openPortsCount > 0
        ? 'Available'
        : 'Limited'
      : 'Paused';

  const phoneSub =
    !hubOpen
      ? isOvernightClosed
        ? 'Day support · Opens 7:00 AM'
        : 'Hub closed'
      : phoneStatus === 'Paused'
        ? 'Paused to save medical power'
        : openPortsCount >= 6
          ? `No wait · ${openPortsCount}/${totalPortsCount} open`
          : openPortsCount > 0
            ? `~5m wait · ${openPortsCount} open`
            : `~15m wait · Full`;

  const medicalStatus: ServiceAvailability = !hubOpen
    ? 'Paused'
    : medicalLoad && medicalLoad.actualKw > 0
      ? 'Available'
      : 'Paused';

  const fridgeStatus: ServiceAvailability = !hubOpen
    ? 'Paused'
    : fridgeLoad && fridgeLoad.actualKw > 0
      ? 'Available'
      : 'Paused';

  const cooledStatus: ServiceAvailability = !hubOpen
    ? 'Paused'
    : sim.batteryPct <= 15
      ? 'Paused'
      : sim.batteryPct <= 30 || headcount >= HUB_CAPACITY_WARN
        ? 'Limited'
        : 'Available';

  const availablePacks = batteryPacks.filter((p) => p.status === 'available').length;
  const packStatus: ServiceAvailability = !hubOpen
    ? 'Paused'
    : availablePacks === 0
      ? 'Paused'
      : availablePacks <= 2
        ? 'Limited'
        : 'Available';

  const services: {
    name: string;
    status: ServiceAvailability;
    sub: string;
    icon: typeof PlugZap;
  }[] = [
    { name: 'Phone Charging', status: phoneStatus, sub: phoneSub, icon: PlugZap },
    { name: 'Medical Power', status: medicalStatus, sub: 'Priority outlets · Never auto-shed', icon: HeartPulse },
    { name: 'Cooled Room', status: cooledStatus, sub: 'Day support (7 AM – 9 PM) · Not overnight shelter', icon: Snowflake },
    { name: 'Med Fridge', status: fridgeStatus, sub: 'Insulin & prescription storage', icon: ThermometerSnowflake },
    {
      name: 'Battery Packs',
      status: packStatus,
      sub: `${availablePacks}/10 ready · Overnight loan, due 12:00 PM next day (No ID)`,
      icon: Battery,
    },
  ];

  const handleSubmitMedicalFlag = (e: React.FormEvent) => {
    e.preventDefault();
    onFlagMedicalNeed(deviceType, medNote.trim());
    setMedSubmitted(true);
    setMedNote('');
    setTimeout(() => {
      setMedSubmitted(false);
      setMedModalOpen(false);
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-charcoal-muted">
        <span className="font-mono tabular-nums">
          Tompkins Hall · {timeMeta.dayLabel}, {timeMeta.clockLabel}
        </span>
        <span>Prototype - simulated data</span>
      </div>

      {/* Compact Hub Status Bar */}
      <section className="rounded-2xl bg-surface border border-edge px-4 py-3.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                hubOpen
                  ? 'bg-ok-bg border-ok-border text-ok-ink'
                  : 'bg-crit-bg border-crit-border text-crit-ink'
              }`}
            >
              {hubOpen ? 'OPEN' : isOvernightClosed ? 'CLOSED OVERNIGHT' : 'CLOSED'}
            </span>
            <span className="text-base sm:text-lg font-bold text-charcoal">{busyShort}</span>
            <span className="text-xs text-charcoal-muted">
              · {isOvernightClosed ? 'Opens 7:00 AM · Staff only' : 'No ID needed'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs sm:text-sm">
            <span className="inline-flex items-center gap-1.5 font-bold tabular-nums text-charcoal">
              <Users className="w-4 h-4 text-crimson-ink" aria-hidden="true" />
              <span>
                {isOvernightClosed ? `Staff ${headcount}/5` : `${headcount}/${HUB_CAPACITY_MAX}`}
              </span>
            </span>
            <span className={`inline-flex items-center gap-1 font-semibold ${hotspotUp ? 'text-ok-ink' : 'text-crimson-ink'}`}>
              <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{hotspotUp ? 'RedTail-Hub-Local' : 'Wi-Fi Out'}</span>
            </span>
          </div>
        </div>
        <p className="text-xs sm:text-sm font-medium text-charcoal-muted">
          This hub is running on rooftop solar and battery.
        </p>
      </section>

      {/* Interactive Tuskegee Weather & Campus Hub Map (with Built-In Offline fallback) */}
      <TuskegeeWeatherMap
        mode="resident"
        apiKey={mapsApiKey}
        cellServiceUp={cellServiceUp}
        hotspotUp={hotspotUp}
        headcount={headcount}
        maxCapacity={HUB_CAPACITY_MAX}
        currentHour={currentHour}
        solarKw={sim.solarKw}
        isOvernightClosed={isOvernightClosed}
        dayWeather={dayWeather}
        helpRequests={helpRequests}
        onSubmitHelpRequest={onSubmitHelpRequest}
        onOpenMedicalFlag={() => setMedModalOpen(true)}
      />

      {/* Services Strip */}
      <section className="rounded-2xl bg-surface border border-edge divide-y divide-edge">
        {services.map((svc) => {
          const Icon = svc.icon;
          const tone = availabilityTone(svc.status);
          const StatusIcon = tone.Icon;
          return (
            <div key={svc.name} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-surface-alt border border-edge flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-crimson-ink" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-bold text-charcoal">{svc.name}</div>
                  <div className="text-xs text-charcoal-muted truncate">{svc.sub}</div>
                </div>
              </div>
              <div className={`inline-flex items-center gap-1 text-xs sm:text-sm font-bold shrink-0 ${tone.text}`}>
                <StatusIcon className="w-4 h-4" aria-hidden="true" />
                <span>{svc.status}</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Walkie-Talkie */}
      <CollapsibleSection
        title="Walkie-Talkie"
        summary={hotspotUp ? 'Offline hotspot Ch 3 · Talk to Hub Desk' : 'Wi-Fi out · Handheld VHF Ch 1–3'}
        icon={Radio}
        defaultOpen
        highlightSummary={!hotspotUp}
      >
        <div className="pt-1">
          <WalkieTalkiePanel
            mode="resident"
            hotspotUp={hotspotUp}
            cellServiceUp={cellServiceUp}
            messages={walkieMessages}
            onSendMessage={onSendWalkieMessage}
          />
        </div>
      </CollapsibleSection>

      {/* Year-Round CPR, Storm Prep & Public Transit */}
      <CollapsibleSection
        title="CPR & Storm Prep Training"
        summary="Year-round classes + free shuttle · Tap to RSVP"
        icon={GraduationCap}
      >
        <div className="divide-y divide-edge pt-1">
          {trainings.map((tr) => (
            <div key={tr.id} className="py-3 first:pt-1 last:pb-0 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-bold text-charcoal">{tr.title}</div>
                <div className="text-xs text-charcoal-muted">
                  {tr.schedule} · {tr.detail}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleTrainingRsvp(tr.id)}
                className={`min-h-[38px] px-3.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer border ${
                  tr.rsvp
                    ? 'bg-ok-bg border-ok-border text-ok-ink'
                    : 'bg-surface-alt border-edge text-charcoal hover:bg-surface-hover'
                }`}
              >
                {tr.rsvp ? 'Going ✓' : 'RSVP'}
              </button>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Community Message Board */}
      <MessageBoardFeed
        announcements={announcements}
        onUpvote={onUpvoteAnnouncement}
      />

      {/* Medical Device Priority Flag Modal */}
      {medModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="med-flag-title"
        >
          <div className="w-full sm:max-w-md bg-surface text-charcoal rounded-t-3xl sm:rounded-2xl border border-edge shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="med-flag-title" className="text-lg font-bold text-charcoal">
                  Priority Medical Power
                </h3>
                <p className="text-xs text-charcoal-muted">No ID needed · Alerts desk staff right away.</p>
              </div>
              <button
                type="button"
                onClick={() => setMedModalOpen(false)}
                aria-label="Close"
                className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-charcoal-muted hover:bg-surface-hover cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {medSubmitted ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-ok-ink mx-auto" />
                <p className="text-base font-bold text-charcoal">Flag Sent to Staff Desk</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitMedicalFlag} className="space-y-3.5">
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="w-full min-h-[46px] px-3 rounded-xl border border-edge bg-input-bg text-sm text-charcoal"
                >
                  <option>CPAP / BiPAP</option>
                  <option>Oxygen Concentrator</option>
                  <option>Nebulizer</option>
                  <option>Powered Wheelchair</option>
                  <option>Insulin Cooler</option>
                </select>

                <input
                  type="text"
                  value={medNote}
                  onChange={(e) => setMedNote(e.target.value)}
                  placeholder="Optional note (e.g., arriving in 5 min)"
                  className="w-full min-h-[46px] px-3 rounded-xl border border-edge bg-input-bg text-sm text-charcoal"
                />

                <button
                  type="submit"
                  className="w-full min-h-[48px] rounded-xl bg-crimson text-white font-bold text-sm hover:bg-crimson-dark flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" aria-hidden="true" />
                  <span>Flag Priority to Staff</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
