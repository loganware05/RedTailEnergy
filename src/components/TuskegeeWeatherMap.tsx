import { useEffect, useMemo, useState } from 'react';
import {
  AdvancedMarker,
  APILoadingStatus,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiIsLoaded,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  HeartPulse,
  LifeBuoy,
  MapPin,
  Moon,
  RefreshCw,
  Sun,
  WifiOff,
  X,
} from 'lucide-react';
import {
  formatOutageHour,
  getSolarOutputKw,
  getWeatherForHour,
  isDaylightHour,
} from '../simulation/engine';
import { DayWeatherSchedule, HelpLocationRequest, WeatherMode } from '../types/hub';
import { LocalHubMap } from './LocalHubMap';

interface CampusPinData {
  id: string;
  name: string;
  address: string;
  roleLabel: string;
  category: 'hub' | 'shuttle' | 'help';
  position: google.maps.LatLngLiteral;
  detail: string;
}

interface TuskegeeWeatherMapProps {
  mode: 'resident' | 'lead';
  apiKey: string;
  cellServiceUp: boolean;
  hotspotUp: boolean;
  headcount: number;
  maxCapacity: number;
  currentHour: number;
  solarKw?: number;
  isOvernightClosed?: boolean;
  helpRequests: HelpLocationRequest[];
  dayWeather: DayWeatherSchedule;
  onSyncDayWeather?: (day: 'day1' | 'day2', weather: WeatherMode) => void;
  onSubmitHelpRequest?: (params: {
    landmark: string;
    helpType: HelpLocationRequest['helpType'];
    note: string;
    xPct: number;
    yPct: number;
  }) => void;
  onOpenMedicalFlag?: () => void;
}

const HELP_LANDMARKS = [
  { name: 'Tompkins Lobby', xPct: 24, yPct: 44 },
  { name: 'University Ave Gate', xPct: 38, yPct: 68 },
  { name: 'Montgomery Rd Stop', xPct: 74, yPct: 54 },
  { name: 'Moton Field Lot', xPct: 82, yPct: 24 },
];

const LANDMARK_QUERIES: {
  id: string;
  query: string;
  fallbackName: string;
  roleLabel: string;
  category: 'hub' | 'shuttle';
  detail: string;
}[] = [
  {
    id: 'hub-tompkins',
    query: 'Tompkins Hall Tuskegee University Tuskegee AL',
    fallbackName: 'Tompkins Hall Resilience Hub',
    roleLabel: 'Primary Microgrid Hub',
    category: 'hub',
    detail: '16 kW solar · 27 kWh battery · Cooling, medical outlets & med fridge',
  },
  {
    id: 'shuttle-moton',
    query: 'Moton Field Municipal Airport Tuskegee AL',
    fallbackName: 'Moton Field Shuttle Stop',
    roleLabel: 'Shuttle North Stop',
    category: 'shuttle',
    detail: 'Year-round loop shuttle stop · Every 30 min (7 AM – 9 PM)',
  },
  {
    id: 'shuttle-montgomery',
    query: 'Montgomery Road Tuskegee University Tuskegee AL',
    fallbackName: 'Montgomery Rd Transit Stop',
    roleLabel: 'East Campus Stop',
    category: 'shuttle',
    detail: 'Covered pickup stop along Tuskegee shuttle corridor',
  },
  {
    id: 'hub-campus',
    query: 'Tuskegee University Tuskegee AL',
    fallbackName: 'University Ave Entrance',
    roleLabel: 'Step-Free Hub Access',
    category: 'shuttle',
    detail: 'Main campus corridor · Step-free ramp & escort meeting point',
  },
];

function CampusPinMarker({
  pin,
  isSelected,
  onSelect,
  onClose,
}: {
  pin: CampusPinData;
  isSelected: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  const pinPalette =
    pin.category === 'hub'
      ? { background: '#8B1E24', borderColor: '#C99A2E', glyphColor: '#FFF8EC', glyphText: 'H' }
      : pin.category === 'help'
        ? { background: '#B91C1C', borderColor: '#FFFFFF', glyphColor: '#FFFFFF', glyphText: '!' }
        : { background: '#C99A2E', borderColor: '#1E1A16', glyphColor: '#1E1A16', glyphText: 'S' };

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={pin.position}
        title={pin.name}
        onClick={onSelect}
      >
        <Pin
          background={pinPalette.background}
          borderColor={pinPalette.borderColor}
          glyphColor={pinPalette.glyphColor}
          glyphText={pinPalette.glyphText}
          scale={pin.category === 'hub' ? 1.2 : 1.0}
        />
      </AdvancedMarker>
      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={250} onCloseClick={onClose}>
          <div className="p-1 text-stone-900 space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#8B1E24]">
              {pin.roleLabel}
            </div>
            <div className="text-sm font-bold leading-snug">{pin.name}</div>
            {pin.address && (
              <div className="text-xs text-stone-600">{pin.address}</div>
            )}
            <div className="text-xs text-stone-700 leading-snug pt-0.5">{pin.detail}</div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function MapCameraSync({ center }: { center: google.maps.LatLngLiteral | null }) {
  const map = useMap();
  useEffect(() => {
    if (map && center) {
      map.panTo(center);
    }
  }, [map, center]);
  return null;
}

export function TuskegeeWeatherMap({
  mode,
  apiKey,
  cellServiceUp,
  hotspotUp,
  headcount,
  maxCapacity,
  currentHour,
  solarKw,
  isOvernightClosed = false,
  helpRequests,
  dayWeather,
  onSyncDayWeather,
  onSubmitHelpRequest,
  onOpenMedicalFlag,
}: TuskegeeWeatherMapProps) {
  const isApiLoaded = useApiIsLoaded();
  const apiStatus = useApiLoadingStatus();
  const placesLib = useMapsLibrary('places');

  const [viewMode, setViewMode] = useState<'weather' | 'offline'>(
    apiKey && cellServiceUp && hotspotUp ? 'weather' : 'offline'
  );
  const [showPins, setShowPins] = useState(true);
  const [showForecast, setShowForecast] = useState(true);

  const [cityCenter, setCityCenter] = useState<google.maps.LatLngLiteral | null>(null);
  const [campusPins, setCampusPins] = useState<CampusPinData[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [placesError, setPlacesError] = useState<string | null>(null);

  // Resident quick help modal state when viewing interactive map
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedLandmark, setSelectedLandmark] = useState(HELP_LANDMARKS[1].name);
  const [helpType, setHelpType] = useState<HelpLocationRequest['helpType']>('Shuttle Pickup');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canRenderGoogleMaps =
    cellServiceUp &&
    Boolean(apiKey) &&
    apiStatus !== APILoadingStatus.AUTH_FAILURE &&
    apiStatus !== APILoadingStatus.FAILED;

  // Automatically switch to interactive campus map when cell service returns
  useEffect(() => {
    if (!cellServiceUp) {
      setViewMode('offline');
    } else if (apiKey && hotspotUp) {
      setViewMode('weather');
    }
  }, [cellServiceUp, hotspotUp, mode, apiKey]);

  // Resolve Tuskegee, AL and Tuskegee University campus pins via Places API (New)
  useEffect(() => {
    if (!cellServiceUp || !placesLib || !canRenderGoogleMaps) return;
    let cancelled = false;

    async function resolveTuskegeePlaces() {
      try {
        const cityRes = await placesLib!.Place.searchByText({
          textQuery: 'Tuskegee, Alabama',
          fields: ['displayName', 'formattedAddress', 'location'],
          maxResultCount: 1,
        });

        const cityPlace = cityRes.places?.[0];
        const cityLoc = cityPlace?.location;

        const landmarkResults = await Promise.allSettled(
          LANDMARK_QUERIES.map((item) =>
            placesLib!.Place.searchByText({
              textQuery: item.query,
              fields: ['displayName', 'formattedAddress', 'location'],
              maxResultCount: 1,
              ...(cityLoc ? { locationBias: cityLoc } : {}),
            })
          )
        );

        if (cancelled) return;

        const isQuotaError = (reason: unknown): boolean => {
          const msg = String(reason ?? '');
          return (
            msg.includes('OVER_QUERY_LIMIT') ||
            msg.includes('RESOURCE_EXHAUSTED') ||
            msg.includes('QuotaExceededError') ||
            msg.includes('429')
          );
        };

        const resolvedPins: CampusPinData[] = [];
        LANDMARK_QUERIES.forEach((item, idx) => {
          const result = landmarkResults[idx];
          if (result.status === 'fulfilled') {
            const place = result.value.places?.[0];
            if (place?.location) {
              resolvedPins.push({
                id: item.id,
                name: place.displayName || item.fallbackName,
                address: place.formattedAddress || 'Tuskegee, AL',
                roleLabel: item.roleLabel,
                category: item.category,
                position: {
                  lat: place.location.lat(),
                  lng: place.location.lng(),
                },
                detail: item.detail,
              });
            }
          } else if (isQuotaError(result.reason)) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
        });

        const primaryHubPin = resolvedPins.find((p) => p.id === 'hub-tompkins') ?? resolvedPins[0];
        const centerPoint: google.maps.LatLngLiteral | null = primaryHubPin
          ? primaryHubPin.position
          : cityLoc
            ? { lat: cityLoc.lat(), lng: cityLoc.lng() }
            : null;

        if (!centerPoint) {
          setPlacesError('Unable to resolve Tuskegee location via Google Places.');
          return;
        }

        setCityCenter(centerPoint);
        setCampusPins(resolvedPins);
        setPlacesError(null);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err ?? '');
          if (
            msg.includes('OVER_QUERY_LIMIT') ||
            msg.includes('RESOURCE_EXHAUSTED') ||
            msg.includes('QuotaExceededError') ||
            msg.includes('429')
          ) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
          setPlacesError(err instanceof Error ? err.message : 'Places lookup failed.');
        }
      }
    }

    void resolveTuskegeePlaces();

    return () => {
      cancelled = true;
    };
  }, [cellServiceUp, placesLib, canRenderGoogleMaps]);

  // Map active Resident help pins to resolved campus landmarks
  const activeHelpRequests = helpRequests.filter((h) => h.status !== 'resolved');
  const helpPins: CampusPinData[] = useMemo(() => {
    if (!cityCenter) return [];
    return activeHelpRequests.map((req) => {
      const match =
        req.landmark.includes('Moton')
          ? campusPins.find((p) => p.id === 'shuttle-moton')
          : req.landmark.includes('Montgomery')
            ? campusPins.find((p) => p.id === 'shuttle-montgomery')
            : req.landmark.includes('University')
              ? campusPins.find((p) => p.id === 'hub-campus')
              : campusPins.find((p) => p.id === 'hub-tompkins');

      const base = match?.position ?? cityCenter;
      return {
        id: `help-pin-${req.id}`,
        name: `${req.helpType} · ${req.landmark}`,
        address: req.timeLabel,
        roleLabel: req.status === 'en_route' ? 'Staff En Route' : 'Resident Help Pin',
        category: 'help',
        position: {
          lat: base.lat + 0.00055,
          lng: base.lng - 0.00055,
        },
        detail: req.note || 'Waiting for Hub Staff assistance',
      };
    });
  }, [activeHelpRequests, campusPins, cityCenter]);

  const allMarkers = useMemo(() => {
    if (!showPins) return [];
    return [...campusPins, ...helpPins];
  }, [showPins, campusPins, helpPins]);

  const selectedPin = allMarkers.find((m) => m.id === selectedPinId) ?? null;

  // Simulated weather strictly driven by Day 1 / Day 2 storm & clear toggles
  const currentWeatherMode = getWeatherForHour(currentHour, dayWeather);
  const currentDaylight = isDaylightHour(currentHour);
  const currentSolarKw = solarKw ?? getSolarOutputKw(currentHour, dayWeather);
  const currentTimeMeta = formatOutageHour(currentHour);
  const simTempF = currentWeatherMode === 'storm'
    ? (currentDaylight ? 72 : 63)
    : (currentDaylight ? 84 : 67);

  const simulatedHourlyWindow = useMemo(() => {
    const items: {
      hour: number;
      label: string;
      weather: WeatherMode;
      daylight: boolean;
      solarKw: number;
      tempF: number;
    }[] = [];
    for (let offset = 0; offset < 12; offset += 1) {
      const h = Math.min(48, currentHour + offset);
      if (offset > 0 && h === items[items.length - 1]?.hour) break;
      const meta = formatOutageHour(h);
      const w = getWeatherForHour(h, dayWeather);
      const dl = isDaylightHour(h);
      items.push({
        hour: h,
        label: offset === 0 ? 'Now' : meta.clockLabel,
        weather: w,
        daylight: dl,
        solarKw: getSolarOutputKw(h, dayWeather),
        tempF: w === 'storm' ? (dl ? 72 : 63) : (dl ? 84 : 67),
      });
    }
    return items;
  }, [currentHour, dayWeather]);

  const handleSubmitHelp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmitHelpRequest) return;
    const lm = HELP_LANDMARKS.find((l) => l.name === selectedLandmark) ?? HELP_LANDMARKS[0];
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
    }, 1400);
  };

  if (!cellServiceUp || (mode === 'resident' && viewMode === 'offline')) {
    return (
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <span className="text-xs font-bold text-charcoal flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-crimson-ink" aria-hidden="true" />
            <span>
              {cellServiceUp ? 'Built-In Campus Map' : 'Built-In Campus Map (Cell Service Off)'}
            </span>
          </span>
          <span className="text-xs font-semibold text-charcoal-muted">
            {currentTimeMeta.dayLabel}:{' '}
            {currentWeatherMode === 'storm' ? 'Storm (½ Solar)' : 'Clear (Full Solar)'}
          </span>
          {cellServiceUp && canRenderGoogleMaps && hotspotUp && mode === 'resident' && (
            <button
              type="button"
              onClick={() => setViewMode('weather')}
              className="min-h-[36px] px-3 py-1 rounded-lg bg-crimson text-white text-xs font-bold hover:bg-crimson-dark cursor-pointer"
            >
              Switch to Tuskegee Campus Map
            </button>
          )}
        </div>
        <LocalHubMap
          headcount={headcount}
          maxCapacity={maxCapacity}
          currentHour={currentHour}
          cellServiceUp={cellServiceUp}
          helpRequests={helpRequests}
          onSubmitHelpRequest={mode === 'resident' ? onSubmitHelpRequest : undefined}
          onOpenMedicalFlag={mode === 'resident' ? onOpenMedicalFlag : undefined}
        />
      </div>
    );
  }

  return (
    <section className="rounded-2xl bg-surface border border-edge overflow-hidden">
      {/* Crimson & Gold Header Band */}
      <div className="bg-hero-bg text-hero-ink px-4 sm:px-5 py-3.5 border-b-2 border-hero-border flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {currentWeatherMode === 'storm' ? (
              <CloudRain className="w-4 h-4 text-gold shrink-0" aria-hidden="true" />
            ) : (
              <Sun className="w-4 h-4 text-gold shrink-0" aria-hidden="true" />
            )}
            <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">
              {mode === 'lead'
                ? 'Tuskegee, AL Simulated Weather & Hub Map'
                : 'Tuskegee, AL Weather & Campus Map'}
            </h2>
          </div>
          <p className="text-xs text-hero-sub mt-0.5">
            Tompkins Hall · Tuskegee University · Simulated Day 1 / Day 2 sky &amp; campus pins
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {mode === 'resident' && (
            <button
              type="button"
              onClick={() => setViewMode('offline')}
              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-gold text-gold-band-ink text-xs font-bold hover:brightness-95 cursor-pointer whitespace-nowrap"
            >
              Offline SVG Map
            </button>
          )}
        </div>
      </div>

      {/* Simulated Weather Summary Strip (Gold Band) */}
      <div className="bg-gold-band text-gold-band-ink px-4 sm:px-5 py-3 border-b border-edge">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-white/65 flex items-center justify-center shrink-0">
              {!currentDaylight ? (
                <Moon className="w-5 h-5 text-crimson-ink" aria-hidden="true" />
              ) : currentWeatherMode === 'storm' ? (
                <CloudRain className="w-5 h-5 text-crimson-ink" aria-hidden="true" />
              ) : (
                <Sun className="w-5 h-5 text-crimson-ink" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums">{simTempF}°F</span>
                <span className="text-sm font-bold truncate">
                  {currentTimeMeta.dayLabel}:{' '}
                  {currentWeatherMode === 'storm' ? 'Storm Clouds (½ Solar)' : 'Clear Sky (Full Solar)'}
                </span>
              </div>
              <div className="text-xs opacity-85 font-mono tabular-nums">
                {currentTimeMeta.clockLabel} · {currentDaylight ? 'Daylight window' : 'Overnight (0 kW PV)'} ·{' '}
                Solar output {currentSolarKw.toFixed(1)} kW
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold tabular-nums">
            <span>D1: {dayWeather.day1 === 'storm' ? 'Storm (½)' : 'Clear'}</span>
            <span aria-hidden="true">·</span>
            <span>D2: {dayWeather.day2 === 'storm' ? 'Storm (½)' : 'Clear'}</span>
          </div>
        </div>
      </div>

      {/* Hub Lead Simulated Day 1 / Day 2 Weather Controls */}
      {mode === 'lead' && onSyncDayWeather && (
        <div className="bg-surface-alt px-4 sm:px-5 py-2.5 border-b border-edge flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-charcoal">
            <span className="font-bold">Simulated Weather Schedule:</span>{' '}
            <span>Switch Day 1 or Day 2 between Clear (Full Solar) and Storm (½ Solar).</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['day1', 'day2'] as const).map((dayKey, idx) => (
              <div key={dayKey} className="inline-flex items-center gap-1 bg-surface border border-edge rounded-lg p-0.5">
                <span className="px-1.5 text-[11px] font-bold text-charcoal-muted">D{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => onSyncDayWeather(dayKey, 'clear')}
                  className={`min-h-[30px] px-2 py-0.5 rounded-md text-xs font-bold cursor-pointer ${
                    dayWeather[dayKey] === 'clear'
                      ? 'bg-crimson text-white'
                      : 'text-charcoal hover:bg-surface-hover'
                  }`}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => onSyncDayWeather(dayKey, 'storm')}
                  className={`min-h-[30px] px-2 py-0.5 rounded-md text-xs font-bold cursor-pointer ${
                    dayWeather[dayKey] === 'storm'
                      ? 'bg-crimson text-white'
                      : 'text-charcoal hover:bg-surface-hover'
                  }`}
                >
                  Storm ½
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map Layer Toolbar */}
      <div className="px-4 sm:px-5 py-2.5 bg-surface border-b border-edge flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowPins((v) => !v)}
            aria-pressed={showPins}
            className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer whitespace-nowrap ${
              showPins
                ? 'bg-crimson text-white border-crimson-dark'
                : 'bg-surface-alt text-charcoal border-edge hover:bg-surface-hover'
            }`}
          >
            Campus Pins ({campusPins.length + helpPins.length})
          </button>
          <button
            type="button"
            onClick={() => setShowForecast((v) => !v)}
            aria-pressed={showForecast}
            className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer whitespace-nowrap ${
              showForecast
                ? 'bg-crimson text-white border-crimson-dark'
                : 'bg-surface-alt text-charcoal border-edge hover:bg-surface-hover'
            }`}
          >
            12h Sim Forecast
          </button>
        </div>

        <div className="text-xs text-charcoal-muted font-medium">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#8B1E24] mr-1 align-middle" />
          <span>Hub</span>
          <span className="mx-2" aria-hidden="true">·</span>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#C99A2E] mr-1 align-middle" />
          <span>Shuttle</span>
          {helpPins.length > 0 && (
            <>
              <span className="mx-2" aria-hidden="true">·</span>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#B91C1C] mr-1 align-middle" />
              <span>Help Pin</span>
            </>
          )}
        </div>
      </div>

      {/* Google Map Viewport (Explicit Height Required — CF2) */}
      <div className="relative w-full h-72 sm:h-80 bg-surface-alt">
        {!canRenderGoogleMaps || placesError ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-2">
            <AlertTriangle className="w-7 h-7 text-crimson-ink" aria-hidden="true" />
            <p className="text-sm font-bold text-charcoal">
              {placesError || 'Interactive map unavailable right now.'}
            </p>
            {mode === 'resident' && (
              <button
                type="button"
                onClick={() => setViewMode('offline')}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-crimson text-white text-xs font-bold cursor-pointer"
              >
                Open Offline Campus Map
              </button>
            )}
          </div>
        ) : !isApiLoaded || !cityCenter ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-crimson-ink animate-spin" aria-hidden="true" />
            <p className="text-sm font-semibold text-charcoal">
              Locating Tompkins Hall &amp; Tuskegee, Alabama...
            </p>
          </div>
        ) : (
          <GoogleMap
            mapId="DEMO_MAP_ID"
            defaultCenter={cityCenter}
            defaultZoom={15}
            gestureHandling="greedy"
            disableDefaultUI={false}
            streetViewControl={false}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            <MapCameraSync center={cityCenter} />
            {allMarkers.map((pin) => (
              <CampusPinMarker
                key={pin.id}
                pin={pin}
                isSelected={selectedPin?.id === pin.id}
                onSelect={() => setSelectedPinId(pin.id)}
                onClose={() => setSelectedPinId(null)}
              />
            ))}
          </GoogleMap>
        )}

        {/* Resident Floating Quick Actions on Map */}
        {mode === 'resident' && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2.5 pointer-events-none">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="pointer-events-auto min-h-[44px] px-4 py-2 rounded-xl bg-crimson text-white text-xs sm:text-sm font-bold shadow-md hover:bg-crimson-dark active:scale-[0.98] inline-flex items-center gap-1.5 cursor-pointer border border-gold/50"
            >
              <LifeBuoy className="w-4 h-4" aria-hidden="true" />
              <span>Request Help</span>
            </button>

            {onOpenMedicalFlag && (
              <button
                type="button"
                onClick={onOpenMedicalFlag}
                className="pointer-events-auto min-h-[44px] px-4 py-2 rounded-xl bg-surface text-charcoal border border-edge-strong text-xs sm:text-sm font-bold shadow-md hover:bg-surface-hover active:scale-[0.98] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <HeartPulse className="w-4 h-4 text-crimson-ink" aria-hidden="true" />
                <span>Medical Power</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Simulated 12-Hour Weather & Solar Strip */}
      {showForecast && simulatedHourlyWindow.length > 0 && (
        <div className="px-4 sm:px-5 py-3 bg-surface-alt border-t border-edge space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-charcoal">Next 12 Hours · Simulated Hub Forecast</span>
            <span className="text-charcoal-muted font-mono">Sky · PV kW</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {simulatedHourlyWindow.map((hr) => (
              <div
                key={hr.hour}
                className="min-w-[78px] rounded-xl bg-surface border border-edge p-2 text-center space-y-1 shrink-0"
              >
                <div className="text-[11px] font-mono font-bold text-charcoal-muted">
                  {hr.label}
                </div>
                {!hr.daylight ? (
                  <Moon className="w-5 h-5 mx-auto text-charcoal-muted" aria-hidden="true" />
                ) : hr.weather === 'storm' ? (
                  <CloudRain className="w-5 h-5 mx-auto text-crimson-ink" aria-hidden="true" />
                ) : (
                  <Sun className="w-5 h-5 mx-auto text-gold-deep" aria-hidden="true" />
                )}
                <div className="text-xs font-bold text-charcoal">
                  {hr.weather === 'storm' ? 'Storm ½' : 'Clear'}
                </div>
                <div className="text-[11px] font-mono tabular-nums text-crimson-ink font-semibold">
                  {hr.solarKw.toFixed(1)} kW
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Directions Summary */}
      <div className="px-4 sm:px-5 py-2.5 bg-surface border-t border-edge flex flex-wrap items-center justify-between gap-2 text-xs text-charcoal-muted">
        <span className="inline-flex items-center gap-1.5 font-semibold text-charcoal">
          <MapPin className="w-3.5 h-3.5 text-crimson-ink" aria-hidden="true" />
          <span>
            Tompkins Hall · {isOvernightClosed ? `Closed overnight (Staff ${headcount}/5)` : `Inside ${headcount}/${maxCapacity}`}
          </span>
        </span>
        <span>Tap any crimson or gold pin for campus hub &amp; shuttle info</span>
      </div>

      {/* Low-Key Request Help Modal (Resident) */}
      {helpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="weather-map-help-title"
        >
          <div className="w-full sm:max-w-md bg-surface text-charcoal rounded-t-3xl sm:rounded-2xl border border-edge shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="weather-map-help-title" className="text-lg font-bold text-charcoal">
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
              <form onSubmit={handleSubmitHelp} className="space-y-3.5">
                <div className="space-y-1">
                  <label htmlFor="weather-help-landmark" className="block text-xs font-bold text-charcoal">
                    Nearest spot
                  </label>
                  <select
                    id="weather-help-landmark"
                    value={selectedLandmark}
                    onChange={(e) => setSelectedLandmark(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-edge bg-input-bg text-sm text-charcoal"
                  >
                    {HELP_LANDMARKS.map((l) => (
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
