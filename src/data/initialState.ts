import {
  Announcement,
  BatteryPack,
  ChargingPort,
  HelpLocationRequest,
  HubEvent,
  InspectionChecklistItem,
  LoadId,
  LoadOverrideMode,
  MedicalRequest,
  ShiftMember,
  TrainingSession,
  WalkieMessage,
} from '../types/hub';

export const DEMO_PIN = '1881';

export const INITIAL_OVERRIDES: Record<LoadId, LoadOverrideMode> = {
  lighting: 'auto',
  medical: 'auto',
  fridge: 'auto',
  phone: 'auto',
  comms: 'auto',
};

export const INITIAL_PORTS: ChargingPort[] = [
  // Table A (8 ports)
  { id: 'A1', station: 'Table A', inUse: true },
  { id: 'A2', station: 'Table A', inUse: true },
  { id: 'A3', station: 'Table A', inUse: true },
  { id: 'A4', station: 'Table A', inUse: false },
  { id: 'A5', station: 'Table A', inUse: true },
  { id: 'A6', station: 'Table A', inUse: false },
  { id: 'A7', station: 'Table A', inUse: false },
  { id: 'A8', station: 'Table A', inUse: true },
  // Table B (8 ports)
  { id: 'B1', station: 'Table B', inUse: true },
  { id: 'B2', station: 'Table B', inUse: false },
  { id: 'B3', station: 'Table B', inUse: true },
  { id: 'B4', station: 'Table B', inUse: false },
  { id: 'B5', station: 'Table B', inUse: false },
  { id: 'B6', station: 'Table B', inUse: true },
  { id: 'B7', station: 'Table B', inUse: false },
  { id: 'B8', station: 'Table B', inUse: false },
  // Wall Strip C (8 ports)
  { id: 'C1', station: 'Wall Strip C', inUse: true },
  { id: 'C2', station: 'Wall Strip C', inUse: true },
  { id: 'C3', station: 'Wall Strip C', inUse: false },
  { id: 'C4', station: 'Wall Strip C', inUse: false },
  { id: 'C5', station: 'Wall Strip C', inUse: false },
  { id: 'C6', station: 'Wall Strip C', inUse: false },
  { id: 'C7', station: 'Wall Strip C', inUse: false },
  { id: 'C8', station: 'Wall Strip C', inUse: false },
];

export const INITIAL_BATTERY_PACKS: BatteryPack[] = [
  { packNumber: 1, status: 'checked_out', borrowerLabel: 'Room 104 · Desk Ticket #12', checkedOutHour: 1, dueHour: 28 },
  { packNumber: 2, status: 'checked_out', borrowerLabel: 'M. Davis · Ticket #07', checkedOutHour: 0, dueHour: 28 },
  { packNumber: 3, status: 'checked_out', borrowerLabel: 'Table B · Ticket #15', checkedOutHour: 2, dueHour: 28 },
  { packNumber: 4, status: 'available' },
  { packNumber: 5, status: 'available' },
  { packNumber: 6, status: 'available' },
  { packNumber: 7, status: 'available' },
  { packNumber: 8, status: 'available' },
  { packNumber: 9, status: 'available' },
  { packNumber: 10, status: 'available' },
];

export const INITIAL_MEDICAL_REQUESTS: MedicalRequest[] = [
  {
    id: 'med-1',
    deviceType: 'CPAP Battery Backup',
    note: 'Assigned to Medical Station M1',
    requestedHour: 2,
    requestedTimeLabel: 'Day 1, 10:00 AM',
    status: 'assigned',
    station: 'Station M1',
  },
  {
    id: 'med-2',
    deviceType: 'Portable Oxygen Concentrator',
    note: 'Awaiting table outlet check',
    requestedHour: 4,
    requestedTimeLabel: 'Day 1, 12:00 PM',
    status: 'waiting',
  },
];

interface SimulatedMedicalSeed {
  id: string;
  deviceType: string;
  note: string;
  requestedHour: number;
  requestedTimeLabel: string;
  assignedAtHour: number;
  completedAtHour: number;
  station: string;
}

const SIMULATED_MEDICAL_TIMELINE: SimulatedMedicalSeed[] = [
  {
    id: 'med-1',
    deviceType: 'CPAP Battery Backup',
    note: 'Assigned to Medical Station M1',
    requestedHour: 2,
    requestedTimeLabel: 'Day 1, 10:00 AM',
    assignedAtHour: 2,
    completedAtHour: 7,
    station: 'Station M1',
  },
  {
    id: 'med-2',
    deviceType: 'Portable Oxygen Concentrator',
    note: 'Table outlet priority check',
    requestedHour: 4,
    requestedTimeLabel: 'Day 1, 12:00 PM',
    assignedAtHour: 6,
    completedAtHour: 11,
    station: 'Station M2',
  },
  {
    id: 'med-3',
    deviceType: 'Pediatric Nebulizer',
    note: 'Afternoon breathing treatment before 9 PM close',
    requestedHour: 9,
    requestedTimeLabel: 'Day 1, 5:00 PM',
    assignedAtHour: 10,
    completedAtHour: 13,
    station: 'Station M1',
  },
  {
    id: 'med-4',
    deviceType: 'Insulin Cooler Check',
    note: 'Morning cold-chain verification & top-up',
    requestedHour: 25,
    requestedTimeLabel: 'Day 2, 9:00 AM',
    assignedAtHour: 26,
    completedAtHour: 31,
    station: 'Med Fridge A',
  },
  {
    id: 'med-5',
    deviceType: 'Powered Wheelchair Charger',
    note: 'Midday recharge during peak solar',
    requestedHour: 28,
    requestedTimeLabel: 'Day 2, 12:00 PM',
    assignedAtHour: 30,
    completedAtHour: 34,
    station: 'Station M3',
  },
  {
    id: 'med-6',
    deviceType: 'BiPAP Battery Swap',
    note: 'Pre-closing evening battery pack recharge',
    requestedHour: 33,
    requestedTimeLabel: 'Day 2, 5:00 PM',
    assignedAtHour: 34,
    completedAtHour: 37,
    station: 'Station M1',
  },
];

export function getSimulatedMedicalRequestsForHour(currentHour: number): MedicalRequest[] {
  return SIMULATED_MEDICAL_TIMELINE
    .filter((item) => item.requestedHour <= currentHour)
    .map((item): MedicalRequest => {
      if (currentHour >= item.completedAtHour) {
        return {
          id: item.id,
          deviceType: item.deviceType,
          note: item.note,
          requestedHour: item.requestedHour,
          requestedTimeLabel: item.requestedTimeLabel,
          status: 'completed',
          station: item.station,
        };
      }
      if (currentHour >= item.assignedAtHour) {
        return {
          id: item.id,
          deviceType: item.deviceType,
          note: item.note,
          requestedHour: item.requestedHour,
          requestedTimeLabel: item.requestedTimeLabel,
          status: 'assigned',
          station: item.station,
        };
      }
      return {
        id: item.id,
        deviceType: item.deviceType,
        note: item.note,
        requestedHour: item.requestedHour,
        requestedTimeLabel: item.requestedTimeLabel,
        status: 'waiting',
      };
    })
    .sort((a, b) => b.requestedHour - a.requestedHour);
}

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    category: 'Power',
    title: '48h outage window · Tompkins Hub running on solar + battery',
    body: 'Line crews clearing Hwy 80 feeders. Cooling, charging & med fridge open 7 AM – 9 PM.',
    postedHour: 1,
    postedTimeLabel: 'Day 1 · 9:00 AM',
    author: 'Hub Lead',
    upvotes: 34,
  },
  {
    id: 'ann-2',
    category: 'Shuttle',
    title: 'Free loop shuttle running every 30 min',
    body: 'Moton Field ↔ Montgomery Rd ↔ Tompkins North Loop (7 AM – 9 PM).',
    postedHour: 2,
    postedTimeLabel: 'Day 1 · 10:00 AM',
    author: 'Transit Desk',
    upvotes: 28,
  },
  {
    id: 'ann-3',
    category: 'Training',
    title: 'CPR & Storm Response Workshop — Sat 10 AM',
    body: 'Free hands-on CPR, AED, and backup power prep at Tompkins Hall. Year-round shuttle included.',
    postedHour: 3,
    postedTimeLabel: 'Day 1 · 11:00 AM',
    author: 'Red Tail Energy',
    upvotes: 41,
  },
  {
    id: 'ann-4',
    category: 'Update',
    title: 'No cell? Connect to RedTail-Hub-Local',
    body: 'Offline hotspot works with no internet or ID. Use Walkie-Talkie Ch 3 for desk help.',
    postedHour: 0,
    postedTimeLabel: 'Day 1 · 8:00 AM',
    author: 'Red Tail Tech',
    upvotes: 19,
  },
];

export const INITIAL_HELP_REQUESTS: HelpLocationRequest[] = [
  {
    id: 'help-1',
    landmark: 'University Ave Gate',
    helpType: 'Mobility / Escort',
    note: 'Need wheelchair ramp assist to lobby',
    hour: 4,
    timeLabel: 'Day 1 · 12:00 PM',
    status: 'waiting',
    xPct: 38,
    yPct: 68,
  },
  {
    id: 'help-2',
    landmark: 'Montgomery Rd Stop',
    helpType: 'Shuttle Pickup',
    note: '2 seniors waiting for next shuttle',
    hour: 3,
    timeLabel: 'Day 1 · 11:00 AM',
    status: 'en_route',
    xPct: 74,
    yPct: 54,
  },
];

interface SimulatedHelpSeed extends Omit<HelpLocationRequest, 'status'> {
  enRouteAtHour: number;
  resolvedAtHour: number;
}

const SIMULATED_HELP_TIMELINE: SimulatedHelpSeed[] = [
  {
    id: 'help-2',
    landmark: 'Montgomery Rd Stop',
    helpType: 'Shuttle Pickup',
    note: '2 seniors waiting for next shuttle',
    hour: 3,
    timeLabel: 'Day 1 · 11:00 AM',
    xPct: 74,
    yPct: 54,
    enRouteAtHour: 3,
    resolvedAtHour: 5,
  },
  {
    id: 'help-1',
    landmark: 'University Ave Gate',
    helpType: 'Mobility / Escort',
    note: 'Need wheelchair ramp assist to lobby',
    hour: 4,
    timeLabel: 'Day 1 · 12:00 PM',
    xPct: 38,
    yPct: 68,
    enRouteAtHour: 6,
    resolvedAtHour: 8,
  },
  {
    id: 'help-3',
    landmark: 'Moton Field Lot',
    helpType: 'Shuttle Pickup',
    note: 'Afternoon shuttle loop pickup',
    hour: 8,
    timeLabel: 'Day 1 · 4:00 PM',
    xPct: 82,
    yPct: 24,
    enRouteAtHour: 9,
    resolvedAtHour: 11,
  },
  {
    id: 'help-4',
    landmark: 'Moton Field Lot',
    helpType: 'Mobility / Escort',
    note: 'Morning ramp escort request',
    hour: 26,
    timeLabel: 'Day 2 · 10:00 AM',
    xPct: 82,
    yPct: 24,
    enRouteAtHour: 27,
    resolvedAtHour: 29,
  },
  {
    id: 'help-5',
    landmark: 'University Ave Gate',
    helpType: 'Supply Drop',
    note: 'Bottled water & battery pack drop-off',
    hour: 28,
    timeLabel: 'Day 2 · 12:00 PM',
    xPct: 38,
    yPct: 68,
    enRouteAtHour: 30,
    resolvedAtHour: 32,
  },
  {
    id: 'help-6',
    landmark: 'Tompkins Lobby',
    helpType: 'Medical Power',
    note: 'Visitor needing outlet escort near entrance',
    hour: 33,
    timeLabel: 'Day 2 · 5:00 PM',
    xPct: 24,
    yPct: 44,
    enRouteAtHour: 34,
    resolvedAtHour: 36,
  },
];

export function getSimulatedHelpRequestsForHour(currentHour: number): HelpLocationRequest[] {
  return SIMULATED_HELP_TIMELINE
    .filter((item) => item.hour <= currentHour)
    .map((item): HelpLocationRequest => {
      const status: HelpLocationRequest['status'] =
        currentHour >= item.resolvedAtHour
          ? 'resolved'
          : currentHour >= item.enRouteAtHour
            ? 'en_route'
            : 'waiting';
      return {
        id: item.id,
        landmark: item.landmark,
        helpType: item.helpType,
        note: item.note,
        hour: item.hour,
        timeLabel: item.timeLabel,
        status,
        xPct: item.xPct,
        yPct: item.yPct,
      };
    })
    .sort((a, b) => b.hour - a.hour);
}

export const INITIAL_INSPECTION_CHECKLIST: InspectionChecklistItem[] = [
  {
    id: 'insp-1',
    label: 'Rooftop PV array & racking visual check',
    detail: 'Confirm no storm debris, lifted modules, or loose roof conduits on the 16 kW array.',
    checked: false,
  },
  {
    id: 'insp-2',
    label: 'Rapid shutdown & DC isolator intact',
    detail: 'Verify rapid shutdown switch housing is dry, sealed, and fault-free.',
    checked: false,
  },
  {
    id: 'insp-3',
    label: 'Hybrid inverter & 27 kWh LFP battery enclosure',
    detail: 'Check ventilation clearances, floor dryness, and normal BMS green status.',
    checked: false,
  },
  {
    id: 'insp-4',
    label: 'Main distribution & critical load panels',
    detail: 'Confirm utility main isolation and all five critical circuits properly labeled.',
    checked: false,
  },
  {
    id: 'insp-5',
    label: 'Medication refrigerator cold-chain temp',
    detail: 'Verify insulin & prescription fridge holds 36°F–46°F (2°C–8°C).',
    checked: false,
  },
  {
    id: 'insp-6',
    label: 'Public entrance, walking path & emergency lighting',
    detail: 'Inspect University Ave ramp, walking path drainage, and egress lighting.',
    checked: false,
  },
];

export const INITIAL_TRAININGS: TrainingSession[] = [
  {
    id: 'tr-1',
    title: 'CPR & AED Certification',
    schedule: 'Tue & Thu · 5:30 PM',
    detail: 'Free hands-on certification · Shuttle from Moton Field',
    rsvp: false,
  },
  {
    id: 'tr-2',
    title: 'Storm & Blackout Prep',
    schedule: 'Sat · 10:00 AM',
    detail: 'Medical battery planning, cold-chain storage & radio basics',
    rsvp: false,
  },
  {
    id: 'tr-3',
    title: 'Community Solar Lab Tour',
    schedule: 'Wed · 3:00 PM',
    detail: '16 kW solar & 27 kWh microgrid demo by Tuskegee students',
    rsvp: false,
  },
];

export const INITIAL_SHIFT_ROSTER: ShiftMember[] = [
  { id: 's-1', name: 'Jordan Carter', role: 'Hub Lead (Current)', shiftWindow: '08:00 AM – 04:00 PM', contactChannel: 'Radio Ch 1' },
  { id: 's-2', name: 'Amara Brooks', role: 'Check-In & Desk Staff', shiftWindow: '08:00 AM – 04:00 PM', contactChannel: 'Radio Ch 2' },
  { id: 's-3', name: 'Devon Washington', role: 'EE Student / Microgrid Tech', shiftWindow: '08:00 AM – 04:00 PM', contactChannel: 'Radio Ch 3' },
  { id: 's-4', name: 'Nadia Grant', role: 'Incoming Hub Lead (Next)', shiftWindow: '04:00 PM – 12:00 AM', contactChannel: 'Radio Ch 1' },
];

export const INITIAL_EVENTS: HubEvent[] = [
  {
    id: 'evt-1',
    hour: 0,
    timeLabel: 'Day 1, 8:00 AM',
    source: 'Automatic',
    category: 'Load Shed',
    message: 'Island mode engaged at Tompkins Hall (16 kW solar · 27 kWh battery). Daylight rule turned hall lighting off automatically.',
  },
  {
    id: 'evt-2',
    hour: 1,
    timeLabel: 'Day 1, 9:00 AM',
    source: 'Hub Lead',
    category: 'Updates',
    message: 'Posted outage restoration bulletin and verified local Wi-Fi portal offline cache.',
  },
  {
    id: 'evt-3',
    hour: 2,
    timeLabel: 'Day 1, 10:00 AM',
    source: 'Staff',
    category: 'Medical',
    message: 'Assigned CPAP battery backup to Medical Station M1.',
  },
];

export const INITIAL_WALKIE_MESSAGES: WalkieMessage[] = [
  {
    id: 'wt-1',
    channel: 'ch2_staff',
    senderRole: 'Hub Staff',
    senderLabel: 'Shuttle Driver (Moton Loop)',
    hour: 3,
    timeLabel: 'Day 1, 11:00 AM',
    kind: 'voice',
    durationSec: 4,
    transcript: 'Loop shuttle arriving at University Ave entrance with 6 residents.',
  },
  {
    id: 'wt-2',
    channel: 'ch1_lead',
    senderRole: 'Hub Lead',
    senderLabel: 'Jordan Carter (Hub Lead)',
    hour: 3,
    timeLabel: 'Day 1, 11:15 AM',
    kind: 'voice',
    durationSec: 5,
    transcript: 'Copy. Solar array charging through storm clouds (~3.5 kW), battery at 100%. Keep Station M1 open.',
  },
  {
    id: 'wt-3',
    channel: 'ch3_neighbor',
    senderRole: 'Resident',
    senderLabel: 'Neighbor · University Ave',
    hour: 4,
    timeLabel: 'Day 1, 12:00 PM',
    kind: 'text',
    transcript: 'Connected to RedTail-Hub-Local hotspot — is the medication fridge open for insulin?',
  },
  {
    id: 'wt-4',
    channel: 'ch3_neighbor',
    senderRole: 'Hub Staff',
    senderLabel: 'Amara Brooks (Check-In)',
    hour: 4,
    timeLabel: 'Day 1, 12:02 PM',
    kind: 'voice',
    durationSec: 3,
    transcript: 'Yes, come right to the University Ave lobby desk and we will label and store it.',
  },
];
