# OpenRemote scenario telemetry (play + graph + weather)

**Date:** 2026-11-16  
**Repo:** https://github.com/loganware05/RedTailEnergy  
**PR:** https://github.com/loganware05/RedTailEnergy/pull/1  
**Commit:** `ba063aae2e07f769cf45be3a74b0cf924706eac6`  
**Branch:** `feat/openremote-scenario-telemetry`  
**Install point:** `32.42898750800647, -85.70454560185496`

## Intent

Extend Demo Presentation Controls OpenRemote telemetry with:

1. Outage Timeline play/pause scrubber
2. Deduped OR-only attribute strip (Battery / Solar / Load / Occupancy stay in the live strip)
3. OpenRemote-style energy chart (SOC / solar / critical load)
4. Two scenario packages with conducted-power totals
5. GHI + cloud cover from Open-Meteo ERA5 at the Tompkins install point for **both** packages

## Changes

| Area | Behavior |
| --- | --- |
| `DemoControlsDrawer` | Play/pause advances hour every ~900ms; scrubbing pauses |
| `OpenRemoteEnergyChart` | 48h SOC / solar kW / critical load with playhead |
| `OpenRemoteTelemetryPanel` | Scenario buttons + chart + GHI/cloud attrs when `weather_obs` present |
| `hurricane_isaias_48h.json` | Archive weather/solar at install point (Aug 2020 window) |
| `cloudy_night_48h.json` | Same install-point `weather_obs` for GHI/cloud; planning `solar_kw` unchanged |
| `App.tsx` | `openRemoteScenario` state drives aligned indicators |

## Verification

- `npm run lint` → pass (`lint.txt`)
- Scenario metrics (`scenario-metrics.json`):
  - Cloudy night: 86.4 kWh gen · 83.6 conducted · 16.7 unmet; hr18 GHI **669** W/m² · cloud **43%**
  - Isaias: 102.4 kWh gen · 76.8 conducted · 3.1 unmet; hr18 GHI **768** W/m² · cloud **56%**
- All 48 hours in both packages include `weather_obs` at the install lat/lon
- UI screenshots: `ui-isaias-scenarios.png`, `ui-cloudy-ghi-cloudcover.png`

## Known presenter caveats (non-blocking for this PR)

- Demo scrubber clock (hub day starting 08:00) and OR `timestamp_local` share **index**, not wall-clock — e.g. scrubber hr 4 ≈ noon hub copy vs OR 22:00 cloudy-night incident hour.
- Legacy Clear/Storm toggles still feed `run48HourSimulation` series; live strip SOC/solar/load overlay OR values.

## NorthStar witness

- Product readiness: `northstar-readiness.json` — `partial (3/8 pillars scored)` @ `ba063aa`
- Portfolio: `northstar-portfolio.json` — RedTail product partial + captains-compass control ready
- Control-plane deposit: captains-compass `.agent/evidence/xrv/redtail-openremote-scenario-2026-11-16/`
- EER: captains-compass `.agent/evidence/xrv/eer-redtail-openremote-scenario-telemetry.json`
