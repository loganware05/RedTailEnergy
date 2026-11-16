export type ThemeId = 'heritage' | 'command' | 'goldfield';

export type RoleId = 'home' | 'resident' | 'staff' | 'lead' | 'engineer';

export type LoadId = 'lighting' | 'medical' | 'fridge' | 'phone' | 'comms';

export type LoadOverrideMode = 'auto' | 'force_on' | 'force_off';

export type WeatherMode = 'clear' | 'storm';

export interface DayWeatherSchedule {
  day1: WeatherMode;
  day2: WeatherMode;
}

export type ServiceAvailability = 'Available' | 'Limited' | 'Paused';

export type PowerHealthColor = 'green' | 'yellow' | 'red';

export type ShedStage = 0 | 1 | 2 | 3;

export interface LoadDefinition {
  id: LoadId;
  name: string;
  shortName: string;
  nominalKw: number;
  critical: boolean;
  description: string;
}

export interface ComputedLoadState {
  id: LoadId;
  name: string;
  shortName: string;
  nominalKw: number;
  actualKw: number;
  status: 'ON' | 'DIMMED_50' | 'OFF_DAYLIGHT' | 'SHED_AUTO' | 'OFF_MANUAL';
  statusLabel: string;
  overrideMode: LoadOverrideMode;
  critical: boolean;
}

export interface ChargingPort {
  id: string;
  station: 'Table A' | 'Table B' | 'Wall Strip C';
  inUse: boolean;
}

export interface BatteryPack {
  packNumber: number;
  status: 'available' | 'checked_out' | 'overdue';
  borrowerLabel?: string;
  checkedOutHour?: number;
  dueHour?: number;
}

export interface MedicalRequest {
  id: string;
  deviceType: string;
  note: string;
  requestedHour: number;
  requestedTimeLabel: string;
  status: 'waiting' | 'assigned' | 'completed';
  station?: string;
}

export interface Announcement {
  id: string;
  category: 'Power' | 'Shuttle' | 'Training' | 'Update';
  title: string;
  body: string;
  postedHour: number;
  postedTimeLabel: string;
  author: string;
  upvotes: number;
  upvoted?: boolean;
}

export interface HelpLocationRequest {
  id: string;
  landmark: string;
  helpType: 'Medical Power' | 'Shuttle Pickup' | 'Mobility / Escort' | 'Supply Drop';
  note: string;
  hour: number;
  timeLabel: string;
  status: 'waiting' | 'en_route' | 'resolved';
  xPct: number;
  yPct: number;
}

export interface TrainingSession {
  id: string;
  title: string;
  schedule: string;
  detail: string;
  rsvp: boolean;
}

export interface ShiftMember {
  id: string;
  name: string;
  role: string;
  shiftWindow: string;
  contactChannel: string;
}

export interface HubEvent {
  id: string;
  hour: number;
  timeLabel: string;
  source: 'Automatic' | 'Staff' | 'Hub Lead' | 'Resident' | 'Demo';
  category: 'Load Shed' | 'Override' | 'Generator' | 'Capacity' | 'Medical' | 'Battery Desk' | 'Updates';
  message: string;
}

export interface GeneratorRecharge {
  id: string;
  hour: number;
  kwhAdded: number;
  status: 'requested' | 'completed';
  note: string;
}

export interface HourlyPoint {
  hour: number;
  clockLabel: string;
  dayLabel: string;
  isDaylight: boolean;
  solarKw: number;
  loadKw: number;
  batteryPct: number;
  noShedBatteryPct: number;
  shedStage: ShedStage;
}

export interface InspectionChecklistItem {
  id: string;
  label: string;
  detail: string;
  checked: boolean;
}

export interface ShedEventRow {
  id: string;
  hour: number;
  timestamp: string;
  batteryPct: number;
  stage: ShedStage;
  action: string;
  loadDeltaKw: number;
}

export interface AlertItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
}

export type WalkieChannel = 'ch1_lead' | 'ch2_staff' | 'ch3_neighbor';

export interface WalkieMessage {
  id: string;
  channel: WalkieChannel;
  senderRole: 'Resident' | 'Hub Staff' | 'Hub Lead';
  senderLabel: string;
  hour: number;
  timeLabel: string;
  kind: 'voice' | 'text';
  durationSec?: number;
  transcript: string;
  audioUrl?: string;
}

export interface HubSimulationResult {
  hourlySeries: HourlyPoint[];
  currentPoint: HourlyPoint;
  loads: ComputedLoadState[];
  totalLoadKw: number;
  solarKw: number;
  batteryPct: number;
  batteryKwh: number;
  hoursRemaining: number;
  healthColor: PowerHealthColor;
  healthLabel: string;
  shedStage: ShedStage;
  shedExplanation: string;
  day1SolarKwh: number;
  day2SolarKwh: number;
  totalEnergyGeneratedKwh: number;
  totalEnergyUsedKwh: number;
  estimatedDollarsSaved: number;
  noShedZeroHour: number | null;
  minShedBatteryPct: number;
  minNoShedBatteryPct: number;
  shedEvents: ShedEventRow[];
}
