import { useState } from 'react';
import { Bus, CheckCircle2, HeartPulse, LifeBuoy, MapPin, Navigation, WifiOff, X } from 'lucide-react';
import { HelpLocationRequest } from '../types/hub';
import { CampusHubMap } from './CampusHubMap';

interface LocalHubMapProps {
  headcount: number;
  maxCapacity: number;
  currentHour: number;
  cellServiceUp?: boolean;
  helpRequests: HelpLocationRequest[];
  onSubmitHelpRequest?: (params: {
    landmark: string;
    helpType: HelpLocationRequest['helpType'];
    note: string;
    xPct: number;
    yPct: number;
  }) => void;
  onOpenMedicalFlag?: () => void;
}

const LANDMARKS: { name: string; xPct: number; yPct: number }[] = [
  { name: 'Tompkins Lobby', xPct: 24, yPct: 44 },
  { name: 'University Ave Gate', xPct: 38, yPct: 68 },
  { name: 'Montgomery Rd Stop', xPct: 74, yPct: 54 },
  { name: 'Moton Field Lot', xPct: 82, yPct: 24 },
];

export function LocalHubMap({
  headcount,
  maxCapacity,
  currentHour,
  cellServiceUp = true,
  helpRequests,
  onSubmitHelpRequest,
  onOpenMedicalFlag,
}: LocalHubMapProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedLandmark, setSelectedLandmark] = useState(LANDMARKS[1].name);
  const [helpType, setHelpType] = useState<HelpLocationRequest['helpType']>('Shuttle Pickup');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const activePins = helpRequests.filter((r) => r.status !== 'resolved');

  const shuttleStops = [
    { eta: 'At Tompkins · 0 min' },
    { eta: 'Montgomery Rd · 5 min' },
    { eta: 'Moton Field · 12 min' },
  ];
  const shuttleIdx = currentHour % shuttleStops.length;
  const shuttlePos = shuttleStops[shuttleIdx];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmitHelpRequest) return;
    const lm = LANDMARKS.find((l) => l.name === selectedLandmark) ?? LANDMARKS[0];
    onSubmitHelpRequest({
      landmark: lm.name,
      helpType,
      note: note.trim(),
      xPct: lm.xPct,
      yPct: lm.yPct,
    });
    setSubmitted(true);
    setNote('');
    setTimeout(() => {
      setSubmitted(false);
      setHelpOpen(false);
    }, 1500);
  };

  return (
    <section className="rounded-2xl bg-surface border border-edge overflow-hidden">
      {!cellServiceUp && (
        <div className="px-4 py-2.5 bg-gold-band text-gold-band-ink border-b border-edge flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <WifiOff className="w-4 h-4 text-crimson-ink shrink-0" aria-hidden="true" />
            <span>Live map and forecast return when the connection is back.</span>
          </span>
          <span className="font-mono text-[11px]">Built-in Campus Map · Local Wi-Fi</span>
        </div>
      )}

      {/* Offline SVG Campus Map Canvas */}
      <div className="relative h-64 sm:h-72 bg-[#EDE6D4] overflow-hidden select-none">
        <CampusHubMap
          headcount={headcount}
          maxCapacity={maxCapacity}
          activeShuttleStopIndex={shuttleIdx}
          className="w-full h-full object-cover"
        />

        {activePins.map((pin) => (
          <div
            key={pin.id}
            style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <div className="px-2 py-0.5 rounded-md bg-surface border-2 border-crimson shadow-md text-[10px] font-bold text-crimson-ink whitespace-nowrap">
              {pin.helpType}
            </div>
          </div>
        ))}

        <div className="absolute top-3 left-3 bg-surface/95 backdrop-blur-xs border border-edge rounded-xl px-3 py-1.5 shadow-xs flex items-center gap-2 text-xs font-semibold text-charcoal">
          <Bus className="w-4 h-4 text-crimson-ink shrink-0" aria-hidden="true" />
          <span>Shuttle: {shuttlePos.eta}</span>
        </div>

        {(onSubmitHelpRequest || onOpenMedicalFlag) && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2.5">
            {onSubmitHelpRequest ? (
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-crimson text-white text-xs sm:text-sm font-bold shadow-md hover:bg-crimson-dark active:scale-[0.98] inline-flex items-center gap-1.5 cursor-pointer border border-gold/40"
              >
                <LifeBuoy className="w-4 h-4" aria-hidden="true" />
                <span>Request Help</span>
              </button>
            ) : (
              <span />
            )}

            {onOpenMedicalFlag && (
              <button
                type="button"
                onClick={onOpenMedicalFlag}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-surface text-charcoal border border-edge-strong text-xs sm:text-sm font-bold shadow-md hover:bg-surface-hover active:scale-[0.98] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <HeartPulse className="w-4 h-4 text-crimson-ink" aria-hidden="true" />
                <span>Medical Power</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-surface-alt border-t border-edge flex flex-wrap items-center justify-between gap-2 text-xs text-charcoal-muted">
        <span className="inline-flex items-center gap-1.5 font-semibold text-charcoal">
          <MapPin className="w-3.5 h-3.5 text-crimson-ink" aria-hidden="true" />
          <span>Public Entrance (University Ave) · Walking Path · 3 Shuttle Stops</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Year-round loop every 30 min</span>
        </span>
      </div>

      {helpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-help-title"
        >
          <div className="w-full sm:max-w-md bg-surface text-charcoal rounded-t-3xl sm:rounded-2xl border border-edge shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="request-help-title" className="text-lg font-bold text-charcoal">
                  Request Help (Low-Key Location)
                </h3>
                <p className="text-xs text-charcoal-muted">Drops a pin for Hub Staff — no ID required.</p>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                aria-label="Close help request"
                className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-charcoal-muted hover:bg-surface-hover cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitted ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-ok-ink mx-auto" />
                <p className="text-base font-bold text-charcoal">Help Pin Dropped for Staff</p>
                <p className="text-xs text-charcoal-muted">
                  {helpType} at {selectedLandmark}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label htmlFor="help-landmark" className="block text-xs font-bold text-charcoal">
                    Nearest spot
                  </label>
                  <select
                    id="help-landmark"
                    value={selectedLandmark}
                    onChange={(e) => setSelectedLandmark(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-edge bg-input-bg text-sm text-charcoal"
                  >
                    {LANDMARKS.map((l) => (
                      <option key={l.name} value={l.name}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold text-charcoal">What do you need?</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Shuttle Pickup', 'Mobility / Escort', 'Medical Power', 'Supply Drop'] as const).map(
                      (type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setHelpType(type)}
                          className={`min-h-[42px] px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                            helpType === type
                              ? 'bg-crimson text-white border-crimson-dark'
                              : 'bg-surface-alt text-charcoal border-edge hover:bg-surface-hover'
                          }`}
                        >
                          {type}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional short note (e.g., blue jacket)"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-edge bg-input-bg text-sm text-charcoal"
                />

                <button
                  type="submit"
                  className="w-full min-h-[48px] rounded-xl bg-crimson text-white font-bold text-sm hover:bg-crimson-dark cursor-pointer"
                >
                  Send Location Pin to Staff
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
