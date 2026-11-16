import { useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { DemoControlsDrawer } from './components/DemoControlsDrawer';
import { EngineerView } from './components/EngineerView';
import { LeadView } from './components/LeadView';
import { PinModal } from './components/PinModal';
import { ResidentView } from './components/ResidentView';
import { RoleSwitcherHome } from './components/RoleSwitcherHome';
import { SettingsModal } from './components/SettingsModal';
import { StaffView } from './components/StaffView';
import { TopBar } from './components/TopBar';
import {
  getSimulatedHelpRequestsForHour,
  getSimulatedMedicalRequestsForHour,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_BATTERY_PACKS,
  INITIAL_EVENTS,
  INITIAL_INSPECTION_CHECKLIST,
  INITIAL_OVERRIDES,
  INITIAL_PORTS,
  INITIAL_SHIFT_ROSTER,
  INITIAL_TRAININGS,
  INITIAL_WALKIE_MESSAGES,
} from './data/initialState';
import {
  getOpenRemoteAlignedIndicators,
  type OpenRemoteScenarioId,
} from './data/openremote/telemetry';
import {
  BATTERY_CAPACITY_KWH,
  formatOutageHour,
  getPackDueHour,
  getShedStageForSoc,
  HUB_CAPACITY_MAX,
  HUB_CAPACITY_WARN,
  isHubOvernightClosed,
  run48HourSimulation,
} from './simulation/engine';
import {
  AlertItem,
  Announcement,
  BatteryPack,
  ChargingPort,
  DayWeatherSchedule,
  GeneratorRecharge,
  HelpLocationRequest,
  HubEvent,
  InspectionChecklistItem,
  LoadId,
  LoadOverrideMode,
  MedicalRequest,
  RoleId,
  ThemeId,
  TrainingSession,
  WalkieChannel,
  WalkieMessage,
  WeatherMode,
} from './types/hub';

const MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? '';
const THEME_STORAGE_KEY = 'redtail-hub-theme';
const DEFAULT_HANDOFF_NOTE =
  'Battery healthy after midday solar peak. Packs #01–#03 on overnight loan (due Day 2, 12:00 PM). Keep Station M1 clear for incoming CPAP guest.';

function readInitialTheme(): ThemeId {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'heritage' || saved === 'command' || saved === 'goldfield') {
      return saved;
    }
  } catch {
    // Ignore storage errors in sandboxed iframes
  }
  return 'heritage';
}

export default function App() {
  const [theme, setTheme] = useState<ThemeId>(readInitialTheme);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const [activeRole, setActiveRole] = useState<RoleId>('home');
  const [pendingPinRole, setPendingPinRole] = useState<RoleId | null>(null);
  const [unlockedRoles, setUnlockedRoles] = useState<Record<RoleId, boolean>>({
    home: true,
    resident: true,
    staff: false,
    lead: false,
    engineer: false,
  });

  const [demoOpen, setDemoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors in sandboxed iframes
    }
  }, [theme]);

  useEffect(() => {
    const onQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  // Core simulation & demo state (Day 1 storm ~29 kWh, Day 2 clear ~58 kWh -> ~87 kWh 48h total)
  const [currentHour, setCurrentHour] = useState<number>(4); // Day 1, 12:00 PM
  const [dayWeather, setDayWeather] = useState<DayWeatherSchedule>({
    day1: 'storm',
    day2: 'clear',
  });
  const [cellOverride, setCellOverride] = useState<boolean | null>(null);
  const [hotspotDemoEnabled, setHotspotDemoEnabled] = useState<boolean>(true);
  /** Extra SOC delta from Demo "Drain Battery" on top of OpenRemote hour SOC. */
  const [batteryDemoDeltaPct, setBatteryDemoDeltaPct] = useState<number>(0);
  const [openRemoteScenario, setOpenRemoteScenario] =
    useState<OpenRemoteScenarioId>('cloudy-night');

  // Operational state shared across all views
  const [hubOpen, setHubOpen] = useState<boolean>(true);
  const [headcountOffset, setHeadcountOffset] = useState<number>(0);
  const [ports, setPorts] = useState<ChargingPort[]>(INITIAL_PORTS);
  const [batteryPacks, setBatteryPacks] = useState<BatteryPack[]>(INITIAL_BATTERY_PACKS);

  // Time-progressive queues + manual staff overrides/additions
  const [customMedicalRequests, setCustomMedicalRequests] = useState<MedicalRequest[]>([]);
  const [medStatusOverrides, setMedStatusOverrides] = useState<
    Record<string, { status: MedicalRequest['status']; station?: string }>
  >({});
  const [customHelpRequests, setCustomHelpRequests] = useState<HelpLocationRequest[]>([]);
  const [helpStatusOverrides, setHelpStatusOverrides] = useState<
    Record<string, HelpLocationRequest['status']>
  >({});

  const [inspectionChecklist, setInspectionChecklist] = useState<InspectionChecklistItem[]>(
    INITIAL_INSPECTION_CHECKLIST
  );
  const [trainings, setTrainings] = useState<TrainingSession[]>(INITIAL_TRAININGS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [walkieMessages, setWalkieMessages] = useState<WalkieMessage[]>(INITIAL_WALKIE_MESSAGES);
  const [overrides, setOverrides] = useState<Record<LoadId, LoadOverrideMode>>(INITIAL_OVERRIDES);
  const [generatorRecharges, setGeneratorRecharges] = useState<GeneratorRecharge[]>([]);
  const [handoffNote, setHandoffNote] = useState<string>(DEFAULT_HANDOFF_NOTE);
  const [events, setEvents] = useState<HubEvent[]>(INITIAL_EVENTS);

  const eventCounter = useRef(100);
  const appendEvent = (
    hour: number,
    source: HubEvent['source'],
    category: HubEvent['category'],
    message: string
  ) => {
    eventCounter.current += 1;
    const meta = formatOutageHour(hour);
    const nextEvt: HubEvent = {
      id: `evt-${eventCounter.current}`,
      hour,
      timeLabel: `${meta.dayLabel}, ${meta.clockLabel}`,
      source,
      category,
      message,
    };
    setEvents((prev) => [nextEvt, ...prev]);
  };

  // Overnight closed rule: hub is a day support location (closed 9 PM to 7 AM)
  const isOvernightClosed = isHubOvernightClosed(currentHour);
  const effectiveHubOpen = hubOpen && !isOvernightClosed;

  // OpenRemote cloudy-night hour is the authority for shared live indicators
  const openRemoteIndicators = useMemo(
    () => getOpenRemoteAlignedIndicators(currentHour, openRemoteScenario),
    [currentHour, openRemoteScenario]
  );

  // Headcount ↔ OpenRemote occupancy (same number in Demo Controls + OR panel)
  const simulatedBaseHeadcount = openRemoteIndicators.occupancyCount;
  const maxAllowedHeadcount = HUB_CAPACITY_MAX;
  const headcount = Math.max(
    0,
    Math.min(maxAllowedHeadcount, simulatedBaseHeadcount + headcountOffset)
  );

  // Cell service: off for hours 0-12, on after hour 12 unless manually toggled in Demo Controls
  const cellServiceUp = cellOverride !== null ? cellOverride : currentHour > 12;

  // Run full 48-hour microgrid simulation, then overlay OpenRemote live readouts
  const sim = useMemo(() => {
    const base = run48HourSimulation({
      currentHour,
      weather: dayWeather,
      overrides,
      batteryOffsetPct: 0,
      generatorRecharges,
    });

    const batteryPct = Math.max(
      0,
      Math.min(
        100,
        Math.round(openRemoteIndicators.batterySocPct + batteryDemoDeltaPct)
      )
    );
    const batteryKwh = Number(
      (
        openRemoteIndicators.batterySocKwh +
        (batteryDemoDeltaPct / 100) * BATTERY_CAPACITY_KWH
      ).toFixed(1)
    );
    const solarKw = Number(openRemoteIndicators.solarAcPowerKw.toFixed(2));
    const totalLoadKw = Number(openRemoteIndicators.criticalLoadKw.toFixed(2));
    const shedStage = getShedStageForSoc(batteryPct);
    const hoursRemaining =
      totalLoadKw > 0.01 ? Number((batteryKwh / totalLoadKw).toFixed(1)) : 99;

    let healthColor: typeof base.healthColor = 'green';
    let healthLabel = 'Healthy';
    if (batteryPct <= 15) {
      healthColor = 'red';
      healthLabel = 'Critical Reserve';
    } else if (batteryPct <= 50) {
      healthColor = 'yellow';
      healthLabel = 'Conservation';
    }

    const currentPoint = {
      ...base.currentPoint,
      solarKw,
      loadKw: totalLoadKw,
      batteryPct,
      shedStage,
    };

    const hourlySeries = base.hourlySeries.map((pt) =>
      pt.hour === currentHour ? { ...pt, ...currentPoint, hour: pt.hour } : pt
    );

    return {
      ...base,
      hourlySeries,
      currentPoint,
      solarKw,
      totalLoadKw,
      batteryPct,
      batteryKwh,
      hoursRemaining,
      healthColor,
      healthLabel,
      shedStage,
      shedExplanation: openRemoteIndicators.phonesShed
        ? `${base.shedExplanation} OpenRemote replay: phone charging shed for this hour.`
        : base.shedExplanation,
    };
  }, [
    currentHour,
    dayWeather,
    overrides,
    generatorRecharges,
    openRemoteIndicators,
    batteryDemoDeltaPct,
  ]);

  const packsReady = useMemo(
    () => batteryPacks.filter((p) => p.status === 'available').length,
    [batteryPacks]
  );

  // Merge time-progressive simulated medical queue with live resident submissions & staff actions
  const medicalRequests: MedicalRequest[] = useMemo(() => {
    const simulated = getSimulatedMedicalRequestsForHour(currentHour);
    const custom = customMedicalRequests.filter((r) => r.requestedHour <= currentHour);
    return [...custom, ...simulated]
      .map((req) => {
        const ov = medStatusOverrides[req.id];
        return ov ? { ...req, status: ov.status, station: ov.station ?? req.station } : req;
      })
      .sort((a, b) => b.requestedHour - a.requestedHour);
  }, [currentHour, customMedicalRequests, medStatusOverrides]);

  // Merge time-progressive help pins with live resident submissions & staff actions
  const helpRequests: HelpLocationRequest[] = useMemo(() => {
    const simulated = getSimulatedHelpRequestsForHour(currentHour);
    const custom = customHelpRequests.filter((h) => h.hour <= currentHour);
    return [...custom, ...simulated]
      .map((req) => {
        const ov = helpStatusOverrides[req.id];
        return ov ? { ...req, status: ov } : req;
      })
      .sort((a, b) => b.hour - a.hour);
  }, [currentHour, customHelpRequests, helpStatusOverrides]);

  // Hub offline hotspot works without internet as long as Comms circuit is powered and hotspot isn't down
  const commsLoad = sim.loads.find((l) => l.id === 'comms');
  const hotspotUp = hotspotDemoEnabled && Boolean(commsLoad && commsLoad.actualKw > 0);

  // Derive live overdue status on battery packs (overdue only after 12:00 PM day after checkout)
  const effectivePacks: BatteryPack[] = useMemo(
    () =>
      batteryPacks.map((pack) => {
        if (pack.status === 'available') return pack;
        if (pack.dueHour !== undefined && currentHour > pack.dueHour) {
          return { ...pack, status: 'overdue' };
        }
        return { ...pack, status: 'checked_out' };
      }),
    [batteryPacks, currentHour]
  );

  // Live alerts list shared by Staff & Lead
  const alerts: AlertItem[] = useMemo(() => {
    const list: AlertItem[] = [];

    if (sim.batteryPct <= 15) {
      list.push({
        id: 'alert-batt-crit',
        severity: 'critical',
        title: `Critical Battery Reserve (${sim.batteryPct}%)`,
        detail:
          'Lighting off (emergency lighting only), generator recharge recommended. Critical loads remain protected.',
      });
    } else if (sim.batteryPct <= 30) {
      list.push({
        id: 'alert-batt-30',
        severity: 'warning',
        title: `Low Battery (${sim.batteryPct}%) — Stage 2 Conservation`,
        detail: 'Phone charging is paused and nighttime lighting is dimmed to 50%.',
      });
    } else if (sim.batteryPct <= 50) {
      list.push({
        id: 'alert-batt-50',
        severity: 'warning',
        title: `Battery at ${sim.batteryPct}% — Phone Charging Paused`,
        detail: 'Automatic Stage 1 shed paused phone ports (0.2 kW) to preserve medical and fridge power.',
      });
    }

    if (isOvernightClosed) {
      list.push({
        id: 'alert-overnight-closed',
        severity: 'info',
        title: `Closed Overnight · Staff Only (OpenRemote occupancy ${headcount})`,
        detail: 'Tompkins Hall opens for daytime community support at 7:00 AM.',
      });
    } else if (headcount >= HUB_CAPACITY_MAX) {
      list.push({
        id: 'alert-cap-max',
        severity: 'critical',
        title: `At Maximum Capacity (${headcount}/${HUB_CAPACITY_MAX})`,
        detail: 'New check-ins are blocked until guests depart.',
      });
    } else if (headcount >= HUB_CAPACITY_WARN) {
      list.push({
        id: 'alert-cap-warn',
        severity: 'warning',
        title: `Approaching Capacity Limit (${headcount}/${HUB_CAPACITY_MAX})`,
        detail: 'Warn incoming shuttles and prepare overflow guidance.',
      });
    }

    const overduePacks = effectivePacks.filter((p) => p.status === 'overdue');
    if (overduePacks.length > 0) {
      list.push({
        id: 'alert-pack-overdue',
        severity: 'warning',
        title: `${overduePacks.length} Portable Battery Pack${overduePacks.length > 1 ? 's' : ''} Overdue`,
        detail: `Overdue: ${overduePacks.map((p) => `Pack #${String(p.packNumber).padStart(2, '0')}`).join(', ')}. Follow up with ticket holders (due 12:00 PM day after checkout).`,
      });
    }

    const waitingMed = medicalRequests.filter((m) => m.status === 'waiting');
    if (waitingMed.length > 0) {
      list.push({
        id: 'alert-med-waiting',
        severity: 'critical',
        title: `${waitingMed.length} Medical Device Priority Request${waitingMed.length > 1 ? 's' : ''} Waiting`,
        detail: `Next in queue: ${waitingMed[0].deviceType}. Assign a protected medical outlet.`,
      });
    }

    const waitingHelp = helpRequests.filter((h) => h.status === 'waiting');
    if (waitingHelp.length > 0) {
      list.push({
        id: 'alert-help-waiting',
        severity: 'warning',
        title: `${waitingHelp.length} Location Help Pin${waitingHelp.length > 1 ? 's' : ''} Waiting`,
        detail: `${waitingHelp[0].helpType} at ${waitingHelp[0].landmark}.`,
      });
    }

    if (!hotspotUp) {
      list.push({
        id: 'alert-hotspot-down',
        severity: 'critical',
        title: 'Local Wi-Fi Hotspot Offline',
        detail: 'Switch team to handheld VHF/FRS walkie-talkies (Ch 1 Lead · Ch 2 Staff · Ch 3 Neighbor).',
      });
    }

    if (!cellServiceUp) {
      list.push({
        id: 'alert-cell-down',
        severity: 'info',
        title: 'Area Cellular Service Down',
        detail: hotspotUp
          ? 'Offline hotspot (RedTail-Hub-Local) serving residents with no internet needed; built-in campus map active.'
          : 'Cell and Wi-Fi both offline — use handheld VHF radios and satellite backhaul.',
      });
    }

    return list;
  }, [
    sim.batteryPct,
    isOvernightClosed,
    headcount,
    effectivePacks,
    medicalRequests,
    helpRequests,
    cellServiceUp,
    hotspotUp,
  ]);

  // Role switching with PIN gate for Staff, Lead, Engineer
  const handleSelectRole = (role: RoleId) => {
    if (unlockedRoles[role]) {
      setActiveRole(role);
    } else {
      setPendingPinRole(role);
    }
  };

  const handlePinSuccess = (role: RoleId) => {
    setUnlockedRoles((prev) => ({ ...prev, [role]: true }));
    setPendingPinRole(null);
    setActiveRole(role);
  };

  // Operational handlers
  const handleChangeHeadcount = (delta: number) => {
    if (isOvernightClosed && delta > 0) return;
    setHeadcountOffset((prevOffset) => {
      const prevCount = Math.max(0, Math.min(maxAllowedHeadcount, simulatedBaseHeadcount + prevOffset));
      const nextCount = Math.max(0, Math.min(maxAllowedHeadcount, prevCount + delta));
      if (nextCount !== prevCount) {
        if (nextCount >= HUB_CAPACITY_MAX && prevCount < HUB_CAPACITY_MAX) {
          appendEvent(currentHour, 'Staff', 'Capacity', 'Hub reached 250/250 maximum capacity; new check-ins blocked.');
        } else if (nextCount >= HUB_CAPACITY_WARN && prevCount < HUB_CAPACITY_WARN) {
          appendEvent(currentHour, 'Staff', 'Capacity', `Occupancy reached ${nextCount}/250 warning threshold.`);
        } else if (Math.abs(delta) >= 25) {
          appendEvent(
            currentHour,
            'Demo',
            'Capacity',
            `Demo adjusted occupancy by ${delta > 0 ? `+${delta}` : delta} to ${nextCount}/250 (OpenRemote occupancy aligned).`
          );
        }
      }
      return nextCount - simulatedBaseHeadcount;
    });
  };

  const handleTogglePort = (portId: string) => {
    setPorts((prev) =>
      prev.map((p) => (p.id === portId ? { ...p, inUse: !p.inUse } : p))
    );
  };

  const handleFlagMedicalNeed = (deviceType: string, note: string) => {
    const meta = formatOutageHour(currentHour);
    const newReq: MedicalRequest = {
      id: `med-custom-${Date.now()}`,
      deviceType,
      note: note || 'Resident flagged via hub portal',
      requestedHour: currentHour,
      requestedTimeLabel: `${meta.dayLabel}, ${meta.clockLabel}`,
      status: 'waiting',
    };
    setCustomMedicalRequests((prev) => [newReq, ...prev]);
    appendEvent(currentHour, 'Resident', 'Medical', `Priority medical device power flagged: ${deviceType}.`);
  };

  const handleUpdateMedicalStatus = (id: string, status: 'assigned' | 'completed') => {
    const target = medicalRequests.find((r) => r.id === id);
    if (!target) return;
    const idx = medicalRequests.findIndex((r) => r.id === id);
    const station = status === 'assigned' ? target.station || `Station M${(Math.max(0, idx) % 4) + 1}` : target.station;
    setMedStatusOverrides((prev) => ({
      ...prev,
      [id]: { status, station },
    }));
    appendEvent(
      currentHour,
      'Staff',
      'Medical',
      status === 'assigned'
        ? `Assigned ${target.deviceType} to ${station}.`
        : `Completed medical charging session for ${target.deviceType}.`
    );
  };

  const handleCheckoutPack = (packNumber: number, borrowerLabel: string) => {
    const dueHour = getPackDueHour(currentHour);
    const dueMeta = formatOutageHour(dueHour);
    setBatteryPacks((prev) =>
      prev.map((p) =>
        p.packNumber === packNumber
          ? {
              ...p,
              status: 'checked_out',
              borrowerLabel,
              checkedOutHour: currentHour,
              dueHour,
            }
          : p
      )
    );
    appendEvent(
      currentHour,
      'Staff',
      'Battery Desk',
      `Checked out Pack #${String(packNumber).padStart(2, '0')} (${borrowerLabel}), due ${dueMeta.dayLabel}, ${dueMeta.clockLabel}.`
    );
  };

  const handleCheckinPack = (packNumber: number) => {
    setBatteryPacks((prev) =>
      prev.map((p) =>
        p.packNumber === packNumber
          ? {
              packNumber: p.packNumber,
              status: 'available',
            }
          : p
      )
    );
    appendEvent(
      currentHour,
      'Staff',
      'Battery Desk',
      `Checked in Pack #${String(packNumber).padStart(2, '0')} for recharging.`
    );
  };

  const handleSubmitHelpRequest = (params: {
    landmark: string;
    helpType: HelpLocationRequest['helpType'];
    note: string;
    xPct: number;
    yPct: number;
  }) => {
    const meta = formatOutageHour(currentHour);
    const nextHelp: HelpLocationRequest = {
      id: `help-custom-${Date.now()}`,
      landmark: params.landmark,
      helpType: params.helpType,
      note: params.note,
      hour: currentHour,
      timeLabel: `${meta.dayLabel} · ${meta.clockLabel}`,
      status: 'waiting',
      xPct: params.xPct,
      yPct: params.yPct,
    };
    setCustomHelpRequests((prev) => [nextHelp, ...prev]);
    appendEvent(currentHour, 'Resident', 'Capacity', `Help pin dropped: ${params.helpType} at ${params.landmark}.`);
  };

  const handleUpdateHelpStatus = (id: string, status: 'en_route' | 'resolved') => {
    const target = helpRequests.find((h) => h.id === id);
    if (!target) return;
    setHelpStatusOverrides((prev) => ({
      ...prev,
      [id]: status,
    }));
    appendEvent(currentHour, 'Staff', 'Capacity', `Help pin (${target.landmark}) marked ${status}.`);
  };

  const handleToggleInspectionItem = (id: string) => {
    setInspectionChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleToggleTrainingRsvp = (id: string) => {
    setTrainings((prev) =>
      prev.map((t) => (t.id === id ? { ...t, rsvp: !t.rsvp } : t))
    );
  };

  const handleUpvoteAnnouncement = (id: string) => {
    setAnnouncements((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, upvoted: !a.upvoted, upvotes: a.upvoted ? a.upvotes - 1 : a.upvotes + 1 }
          : a
      )
    );
  };

  const handlePostAnnouncement = (
    category: Announcement['category'],
    title: string,
    body: string
  ) => {
    const meta = formatOutageHour(currentHour);
    const nextAnn: Announcement = {
      id: `ann-${Date.now()}`,
      category,
      title,
      body,
      postedHour: currentHour,
      postedTimeLabel: `${meta.dayLabel} · ${meta.clockLabel}`,
      author: activeRole === 'lead' ? 'Hub Lead' : 'Hub Staff',
      upvotes: 1,
      upvoted: true,
    };
    setAnnouncements((prev) => [nextAnn, ...prev]);
    appendEvent(
      currentHour,
      activeRole === 'lead' ? 'Hub Lead' : 'Staff',
      'Updates',
      `Posted ${category} update: "${title}".`
    );
  };

  const handleSetLoadOverride = (loadId: LoadId, mode: LoadOverrideMode) => {
    setOverrides((prev) => ({ ...prev, [loadId]: mode }));
    const modeLabel =
      mode === 'auto' ? 'Automatic' : mode === 'force_on' ? 'Manual Force ON' : 'Manual Force OFF';
    appendEvent(currentHour, 'Hub Lead', 'Override', `Set ${loadId} circuit to ${modeLabel}.`);
  };

  const handleRequestGenerator = () => {
    const req: GeneratorRecharge = {
      id: `gen-req-${Date.now()}`,
      hour: currentHour,
      kwhAdded: 0,
      status: 'requested',
      note: 'Facilities crew notified via Radio Ch 3 to prep Tompkins backup generator.',
    };
    setGeneratorRecharges((prev) => [...prev, req]);
    appendEvent(currentHour, 'Hub Lead', 'Generator', 'Requested backup generator dispatch for battery recharge.');
  };

  const handleLogGeneratorCompleted = () => {
    const completed: GeneratorRecharge = {
      id: `gen-done-${Date.now()}`,
      hour: currentHour,
      kwhAdded: 9.5,
      status: 'completed',
      note: 'Completed 1-hour backup generator recharge (+9.5 kWh / +35% SOC).',
    };
    setGeneratorRecharges((prev) => [
      ...prev.filter((g) => g.status !== 'requested'),
      completed,
    ]);
    setBatteryDemoDeltaPct((prev) => prev + 35);
    appendEvent(
      currentHour,
      'Hub Lead',
      'Generator',
      'Logged completed generator recharge (+9.5 kWh / +35% battery).'
    );
  };

  const handleSaveHandoffNote = (note: string) => {
    setHandoffNote(note);
    appendEvent(currentHour, 'Hub Lead', 'Updates', 'Updated shift handoff note.');
  };

  // Demo Controls Handlers
  const handleDrainBattery10 = () => {
    setBatteryDemoDeltaPct((prev) => prev - 10);
    const projectedPct = Math.max(0, sim.batteryPct - 10);
    appendEvent(
      currentHour,
      'Demo',
      'Load Shed',
      `Demo drained battery by 10% (now ~${projectedPct}%). OpenRemote SOC readout stays aligned.`
    );
  };

  const handleChangeHour = (hour: number) => {
    setCurrentHour(hour);
    setHeadcountOffset(0);
    setBatteryDemoDeltaPct(0);
    const aligned = getOpenRemoteAlignedIndicators(hour, openRemoteScenario);
    const dayKey = hour < 24 ? 'day1' : 'day2';
    setDayWeather((prev) =>
      prev[dayKey] === aligned.weatherMode ? prev : { ...prev, [dayKey]: aligned.weatherMode }
    );
  };

  const handleChangeOpenRemoteScenario = (scenario: OpenRemoteScenarioId) => {
    setOpenRemoteScenario(scenario);
    setHeadcountOffset(0);
    setBatteryDemoDeltaPct(0);
    const aligned = getOpenRemoteAlignedIndicators(currentHour, scenario);
    const dayKey = currentHour < 24 ? 'day1' : 'day2';
    setDayWeather((prev) =>
      prev[dayKey] === aligned.weatherMode ? prev : { ...prev, [dayKey]: aligned.weatherMode }
    );
  };

  const handleToggleDayWeather = (day: 'day1' | 'day2', nextWeather: WeatherMode) => {
    if (dayWeather[day] === nextWeather) return;
    setDayWeather((prev) => ({ ...prev, [day]: nextWeather }));
    const dayLabel = day === 'day1' ? 'Day 1 (Hrs 0–24)' : 'Day 2 (Hrs 24–48)';
    appendEvent(
      currentHour,
      'Demo',
      'Load Shed',
      `${dayLabel} weather changed to ${nextWeather === 'storm' ? 'Storm Clouds (½ Solar)' : 'Clear Sky (Full Solar)'}.`
    );
  };

  const handleToggleCellService = (up: boolean) => {
    setCellOverride(up);
    appendEvent(
      currentHour,
      'Demo',
      'Updates',
      `Area cell service toggled ${up ? 'ON (Restored)' : 'OFF (Offline hotspot mode)'}.`
    );
  };

  const handleToggleHotspot = (up: boolean) => {
    setHotspotDemoEnabled(up);
    appendEvent(
      currentHour,
      'Demo',
      'Updates',
      up
        ? 'Local offline hotspot (RedTail-Hub-Local) restored — no internet required.'
        : 'Local Wi-Fi hotspot offline — walkie-talkie fallback active on VHF Ch 1–3.'
    );
  };

  const handleSendWalkieMessage = (params: {
    channel: WalkieChannel;
    senderRole: 'Resident' | 'Hub Staff' | 'Hub Lead';
    kind: 'voice' | 'text';
    durationSec?: number;
    transcript: string;
    audioUrl?: string;
  }) => {
    const meta = formatOutageHour(currentHour);
    const senderLabel =
      params.senderRole === 'Hub Lead'
        ? 'Jordan Carter (Hub Lead)'
        : params.senderRole === 'Hub Staff'
          ? 'Amara Brooks (Hub Staff)'
          : 'Resident · Hub Guest';
    const nextMsg: WalkieMessage = {
      id: `wt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      channel: params.channel,
      senderRole: params.senderRole,
      senderLabel,
      hour: currentHour,
      timeLabel: `${meta.dayLabel}, ${meta.clockLabel}`,
      kind: params.kind,
      durationSec: params.durationSec,
      transcript: params.transcript,
      audioUrl: params.audioUrl,
    };
    setWalkieMessages((prev) => [nextMsg, ...prev]);
    appendEvent(
      currentHour,
      params.senderRole === 'Hub Staff' ? 'Staff' : params.senderRole,
      'Updates',
      `Walkie-talkie (${params.channel}): ${params.transcript}`
    );
  };

  const handleResetDemo = () => {
    setCurrentHour(4);
    setDayWeather({ day1: 'storm', day2: 'clear' });
    setCellOverride(null);
    setHotspotDemoEnabled(true);
    setBatteryDemoDeltaPct(0);
    setOpenRemoteScenario('cloudy-night');
    setHubOpen(true);
    setHeadcountOffset(0);
    setPorts(INITIAL_PORTS);
    setBatteryPacks(INITIAL_BATTERY_PACKS);
    setCustomMedicalRequests([]);
    setMedStatusOverrides({});
    setCustomHelpRequests([]);
    setHelpStatusOverrides({});
    setInspectionChecklist(INITIAL_INSPECTION_CHECKLIST);
    setTrainings(INITIAL_TRAININGS);
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
    setWalkieMessages(INITIAL_WALKIE_MESSAGES);
    setOverrides(INITIAL_OVERRIDES);
    setGeneratorRecharges([]);
    setHandoffNote(DEFAULT_HANDOFF_NOTE);
    setEvents(INITIAL_EVENTS);
  };

  return (
    <APIProvider
      apiKey={MAPS_API_KEY || 'MISSING_MAPS_KEY'}
      libraries={['marker', 'places']}
      language="en"
      region="US"
    >
      <div className="min-h-screen flex flex-col bg-canvas text-charcoal">
        {quotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}

        <TopBar
          activeRole={activeRole}
          onGoHome={() => setActiveRole('home')}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenDemoControls={() => setDemoOpen(true)}
        />

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">
          {activeRole === 'home' && (
            <RoleSwitcherHome
              hubOpen={effectiveHubOpen}
              isOvernightClosed={isOvernightClosed}
              headcount={headcount}
              currentHour={currentHour}
              cellServiceUp={cellServiceUp}
              hotspotUp={hotspotUp}
              dayWeather={dayWeather}
              sim={sim}
              unlockedRoles={unlockedRoles}
              onSelectRole={handleSelectRole}
            />
          )}

          {activeRole === 'resident' && (
            <ResidentView
              mapsApiKey={MAPS_API_KEY}
              hubOpen={effectiveHubOpen}
              isOvernightClosed={isOvernightClosed}
              headcount={headcount}
              currentHour={currentHour}
              cellServiceUp={cellServiceUp}
              hotspotUp={hotspotUp}
              dayWeather={dayWeather}
              sim={sim}
              ports={ports}
              batteryPacks={effectivePacks}
              announcements={announcements}
              helpRequests={helpRequests}
              trainings={trainings}
              walkieMessages={walkieMessages}
              onFlagMedicalNeed={handleFlagMedicalNeed}
              onSubmitHelpRequest={handleSubmitHelpRequest}
              onToggleTrainingRsvp={handleToggleTrainingRsvp}
              onUpvoteAnnouncement={handleUpvoteAnnouncement}
              onSendWalkieMessage={handleSendWalkieMessage}
            />
          )}

          {activeRole === 'staff' && (
            <StaffView
              hubOpen={effectiveHubOpen}
              isOvernightClosed={isOvernightClosed}
              headcount={headcount}
              currentHour={currentHour}
              cellServiceUp={cellServiceUp}
              hotspotUp={hotspotUp}
              sim={sim}
              alerts={alerts}
              ports={ports}
              batteryPacks={effectivePacks}
              medicalRequests={medicalRequests}
              helpRequests={helpRequests}
              announcements={announcements}
              walkieMessages={walkieMessages}
              onChangeHeadcount={handleChangeHeadcount}
              onTogglePort={handleTogglePort}
              onUpdateMedicalStatus={handleUpdateMedicalStatus}
              onUpdateHelpStatus={handleUpdateHelpStatus}
              onCheckoutPack={handleCheckoutPack}
              onCheckinPack={handleCheckinPack}
              onPostAnnouncement={handlePostAnnouncement}
              onUpvoteAnnouncement={handleUpvoteAnnouncement}
              onSendWalkieMessage={handleSendWalkieMessage}
            />
          )}

          {activeRole === 'lead' && (
            <LeadView
              mapsApiKey={MAPS_API_KEY}
              hubOpen={effectiveHubOpen}
              isOvernightClosed={isOvernightClosed}
              onToggleHubOpen={(open) => {
                setHubOpen(open);
                appendEvent(currentHour, 'Hub Lead', 'Capacity', `Hub marked ${open ? 'OPEN' : 'CLOSED'} by Hub Lead.`);
              }}
              headcount={headcount}
              currentHour={currentHour}
              cellServiceUp={cellServiceUp}
              hotspotUp={hotspotUp}
              dayWeather={dayWeather}
              onToggleDayWeather={handleToggleDayWeather}
              sim={sim}
              alerts={alerts}
              ports={ports}
              batteryPacks={effectivePacks}
              medicalRequests={medicalRequests}
              helpRequests={helpRequests}
              announcements={announcements}
              walkieMessages={walkieMessages}
              overrides={overrides}
              generatorRecharges={generatorRecharges}
              shiftRoster={INITIAL_SHIFT_ROSTER}
              handoffNote={handoffNote}
              events={events}
              inspectionChecklist={inspectionChecklist}
              onToggleInspectionItem={handleToggleInspectionItem}
              onChangeHeadcount={handleChangeHeadcount}
              onTogglePort={handleTogglePort}
              onUpdateMedicalStatus={handleUpdateMedicalStatus}
              onUpdateHelpStatus={handleUpdateHelpStatus}
              onCheckoutPack={handleCheckoutPack}
              onCheckinPack={handleCheckinPack}
              onPostAnnouncement={handlePostAnnouncement}
              onUpvoteAnnouncement={handleUpvoteAnnouncement}
              onSendWalkieMessage={handleSendWalkieMessage}
              onSetLoadOverride={handleSetLoadOverride}
              onRequestGenerator={handleRequestGenerator}
              onLogGeneratorCompleted={handleLogGeneratorCompleted}
              onSaveHandoffNote={handleSaveHandoffNote}
            />
          )}

          {activeRole === 'engineer' && (
            <EngineerView
              currentHour={currentHour}
              dayWeather={dayWeather}
              sim={sim}
              overrides={overrides}
              generatorRecharges={generatorRecharges}
            />
          )}
        </main>

        <footer className="border-t-2 border-edge-strong bg-surface mt-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-charcoal-muted">
            <span className="inline-flex items-center gap-2 font-semibold text-charcoal">
              <img
                src="/assets/aistudio/Red_Tail_Energy_logo_828a9735.jpg"
                alt="Red Tail Energy"
                className="w-6 h-6 rounded-md bg-white p-0.5 object-contain border border-edge shrink-0"
              />
              <span>Red Tail Hub · Tompkins Hall, Tuskegee University · Red Tail Energy</span>
            </span>
            <span>Prototype - simulated data</span>
          </div>
        </footer>

        <PinModal
          targetRole={pendingPinRole}
          onCancel={() => setPendingPinRole(null)}
          onSuccess={handlePinSuccess}
        />

        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          theme={theme}
          onChangeTheme={setTheme}
        />

        <DemoControlsDrawer
          open={demoOpen}
          onClose={() => setDemoOpen(false)}
          currentHour={currentHour}
          onChangeHour={handleChangeHour}
          dayWeather={dayWeather}
          onToggleDayWeather={handleToggleDayWeather}
          cellServiceUp={cellServiceUp}
          onToggleCellService={handleToggleCellService}
          hotspotUp={hotspotUp}
          onToggleHotspot={handleToggleHotspot}
          headcount={headcount}
          packsReady={packsReady}
          onAddPeople={handleChangeHeadcount}
          onDrainBattery10={handleDrainBattery10}
          onResetDemo={handleResetDemo}
          sim={sim}
          openRemoteScenario={openRemoteScenario}
          onChangeOpenRemoteScenario={handleChangeOpenRemoteScenario}
        />
      </div>
    </APIProvider>
  );
}
