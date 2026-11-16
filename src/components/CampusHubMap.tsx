interface CampusHubMapProps {
  headcount?: number;
  maxCapacity?: number;
  activeShuttleStopIndex?: number;
  className?: string;
}

const SHUTTLE_STOP_COORDS = [
  { x: 162, y: 128, label: 'Tompkins Stop' },
  { x: 298, y: 128, label: 'Montgomery Rd Stop' },
  { x: 344, y: 48, label: 'Moton Field Stop' },
] as const;

export function CampusHubMap({
  headcount,
  maxCapacity,
  activeShuttleStopIndex,
  className = 'w-full h-full',
}: CampusHubMapProps) {
  const activeStop =
    activeShuttleStopIndex !== undefined
      ? SHUTTLE_STOP_COORDS[activeShuttleStopIndex % SHUTTLE_STOP_COORDS.length]
      : null;

  const occupancyLabel =
    headcount !== undefined && maxCapacity !== undefined
      ? `Tompkins Hall Hub (${headcount}/${maxCapacity})`
      : 'Tompkins Hall Hub';

  return (
    <svg
      viewBox="0 0 420 230"
      className={`pointer-events-none select-none block ${className}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Non-interactive campus schematic of Tompkins Hall, its public entrance on University Avenue, simplified walking path, and shuttle stops"
    >
      {/* Campus Ground & Lawn */}
      <rect width="420" height="230" fill="#EDE5D2" />

      {/* Surrounding Campus Quadrangles */}
      <rect x="18" y="16" width="128" height="94" rx="8" fill="#E1D6BC" stroke="#CFC2A3" strokeWidth="1" />
      <rect x="176" y="20" width="106" height="84" rx="8" fill="#E4DAC2" stroke="#D2C6AA" strokeWidth="1" />
      <rect x="308" y="16" width="96" height="86" rx="8" fill="#E1D6BC" stroke="#CFC2A3" strokeWidth="1" />
      <rect x="22" y="148" width="124" height="66" rx="8" fill="#E4DAC2" stroke="#D2C6AA" strokeWidth="1" />
      <rect x="176" y="148" width="110" height="66" rx="8" fill="#E4DAC2" stroke="#D2C6AA" strokeWidth="1" />

      {/* Roads: University Ave & Montgomery Rd */}
      <path d="M 0 128 L 420 128" stroke="#FAF4E6" strokeWidth="15" />
      <path d="M 0 120.5 L 420 120.5" stroke="#CBB993" strokeWidth="1" />
      <path d="M 0 135.5 L 420 135.5" stroke="#CBB993" strokeWidth="1" />

      <path d="M 162 0 L 162 230" stroke="#FAF4E6" strokeWidth="11" />
      <path d="M 298 0 L 298 230" stroke="#FAF4E6" strokeWidth="11" />

      {/* Street Name Labels */}
      <text x="230" y="131" textAnchor="middle" className="fill-[#574E42] text-[8.5px] font-semibold">
        University Ave
      </text>
      <text
        x="301"
        y="86"
        textAnchor="middle"
        transform="rotate(-90 301 86)"
        className="fill-[#574E42] text-[8px] font-semibold"
      >
        Montgomery Rd
      </text>

      {/* Shuttle Route Loop */}
      <path
        d="M 114 102 L 162 128 L 298 128 L 344 48"
        fill="none"
        stroke="#8B1E24"
        strokeWidth="3"
        strokeDasharray="6 4"
        strokeLinecap="round"
      />

      {/* Tompkins Hall Building Footprint */}
      <rect
        x="42"
        y="46"
        width="88"
        height="54"
        rx="6"
        fill="#FFF9EE"
        stroke="#8B1E24"
        strokeWidth="2"
      />
      <rect x="48" y="52" width="76" height="10" rx="2" fill="#8B1E24" fillOpacity="0.12" />
      <text x="86" y="75" textAnchor="middle" className="fill-[#6D1419] text-[9.5px] font-bold">
        TOMPKINS HALL
      </text>
      <text x="86" y="86" textAnchor="middle" className="fill-[#574E42] text-[7.5px] font-semibold">
        Resilience Hub
      </text>

      {/* Simplified Walking Path (from Public Entrance to University Ave & Campus Walk) */}
      <path
        d="M 96 100 L 96 128 L 154 128"
        fill="none"
        stroke="#966F12"
        strokeWidth="3.5"
        strokeDasharray="3 3"
        strokeLinecap="round"
      />
      <path
        d="M 96 128 L 138 164"
        fill="none"
        stroke="#966F12"
        strokeWidth="2.5"
        strokeDasharray="3 3"
        strokeLinecap="round"
      />
      <rect
        x="32"
        y="148"
        width="74"
        height="15"
        rx="4"
        fill="#FAF4E6"
        stroke="#966F12"
        strokeWidth="1"
      />
      <text x="69" y="158" textAnchor="middle" className="fill-[#6D4F07] text-[8px] font-bold">
        Walking Path
      </text>

      {/* Public Entrance (Step-Free Ramp at South Facade) */}
      <rect x="86" y="95" width="20" height="9" rx="2" fill="#C99A2E" stroke="#1E1D1C" strokeWidth="1.5" />
      <polygon points="96,105 92,111 100,111" fill="#1E1D1C" />
      <rect x="14" y="103" width="74" height="14" rx="4" fill="#1E1D1C" />
      <text x="51" y="112.5" textAnchor="middle" className="fill-[#FAF4E6] text-[7.5px] font-bold">
        Public Entrance
      </text>

      {/* Hub Marker */}
      <circle cx="42" cy="46" r="10" fill="#8B1E24" stroke="#FAF4E6" strokeWidth="2" />
      <text x="42" y="49.5" textAnchor="middle" className="fill-white text-[9px] font-bold">
        H
      </text>
      <rect x="28" y="20" width="132" height="16" rx="4" fill="#8B1E24" />
      <text x="94" y="31" textAnchor="middle" className="fill-white text-[8.5px] font-bold">
        {occupancyLabel}
      </text>

      {/* Shuttle Stop 1: Tompkins Hub Stop */}
      <circle cx="162" cy="128" r="6" fill="#FAF4E6" stroke="#8B1E24" strokeWidth="2.5" />
      <rect x="134" y="106" width="58" height="13" rx="3" fill="#FAF4E6" stroke="#8B1E24" strokeWidth="0.9" />
      <text x="163" y="115" textAnchor="middle" className="fill-[#6D1419] text-[7.5px] font-bold">
        Hub Stop
      </text>

      {/* Shuttle Stop 2: Montgomery Rd Stop */}
      <circle cx="298" cy="128" r="6" fill="#FAF4E6" stroke="#1E1D1C" strokeWidth="2.2" />
      <rect x="249" y="140" width="96" height="14" rx="3" fill="#FAF4E6" stroke="#1E1D1C" strokeWidth="0.9" />
      <text x="297" y="149.5" textAnchor="middle" className="fill-[#1E1D1C] text-[7.5px] font-bold">
        Montgomery Rd Stop
      </text>

      {/* Shuttle Stop 3: Moton Field Stop */}
      <circle cx="344" cy="48" r="6.5" fill="#FAF4E6" stroke="#1E1D1C" strokeWidth="2.5" />
      <rect x="303" y="23" width="84" height="14" rx="3" fill="#FAF4E6" stroke="#1E1D1C" strokeWidth="0.9" />
      <text x="345" y="32.5" textAnchor="middle" className="fill-[#1E1D1C] text-[8px] font-bold">
        Moton Field Stop
      </text>

      {/* Active Shuttle Marker (if provided) */}
      {activeStop && (
        <g transform={`translate(${activeStop.x}, ${activeStop.y})`}>
          <circle cx="0" cy="0" r="10" fill="#C99A2E" stroke="#1E1D1C" strokeWidth="2" />
          <text x="0" y="3" textAnchor="middle" className="fill-[#1E1D1C] text-[9px] font-bold">
            B
          </text>
        </g>
      )}

      {/* Compass North Indicator */}
      <g transform="translate(394, 34)">
        <circle cx="0" cy="0" r="10" fill="#FAF4E6" stroke="#CBB993" strokeWidth="1" />
        <text x="0" y="3" textAnchor="middle" className="fill-[#1E1D1C] text-[8px] font-bold">
          N
        </text>
      </g>

      {/* Non-Interactive Schematic Key */}
      <g transform="translate(298, 166)">
        <rect x="0" y="0" width="112" height="52" rx="6" fill="#FAF4E6" fillOpacity="0.95" stroke="#CBB993" strokeWidth="1" />
        <line x1="8" y1="14" x2="26" y2="14" stroke="#8B1E24" strokeWidth="2.5" strokeDasharray="4 3" />
        <text x="32" y="17" className="fill-[#1E1D1C] text-[7.5px] font-semibold">
          Shuttle Route
        </text>
        <line x1="8" y1="28" x2="26" y2="28" stroke="#966F12" strokeWidth="2.5" strokeDasharray="2.5 2.5" />
        <text x="32" y="31" className="fill-[#1E1D1C] text-[7.5px] font-semibold">
          Walking Path
        </text>
        <circle cx="17" cy="42" r="4" fill="#FAF4E6" stroke="#1E1D1C" strokeWidth="1.8" />
        <text x="32" y="45" className="fill-[#1E1D1C] text-[7.5px] font-semibold">
          Shuttle Stop
        </text>
      </g>
    </svg>
  );
}
