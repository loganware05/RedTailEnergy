# Red Tail Energy — Tompkins Hall Resilience Hub

Community energy resilience hub prototype for **Tompkins Hall** at Tuskegee University, built for the AABE Energy Hackathon by **Red Tail Energy**.

Includes a campus map for cell-off / local Wi‑Fi mode, shuttle and service status, a community message board, and a walkie-talkie style staff interface — with Resident, Staff, Lead, and Engineer role views.

Originally remixed from [Google AI Studio](https://ai.studio/apps/704b43cc-35eb-4358-874f-e36d686ec21d).

## Features

- Role home + PIN-gated staff / lead / engineer views
- 48-hour energy simulation (battery, solar, priority loads, packs)
- Campus and local hub maps (Google Maps when a key is configured)
- Message board, walkie channels, demo controls drawer
- Heritage / command / goldfield themes

## Run locally

**Prerequisites:** Node.js 22+ (or Bun)

1. Install dependencies:

   ```bash
   npm install
   # or: bun install
   ```

2. Copy env template and add keys:

   ```bash
   cp .env.example .env.local
   ```

   Set:

   - `GEMINI_API_KEY` — optional Gemini features
   - `VITE_GOOGLE_MAPS_API_KEY` — Maps JS / Places / Weather
   - `APP_URL` — optional app base URL

3. Start the app:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000/

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Typecheck (`tsc --noEmit`) |

## Notes

- Do not commit `.env` / `.env.local`.
- Readings and demo scenarios are labeled for hackathon simulation unless otherwise noted.
- Microphone permission is requested for walkie-talkie style demos (`metadata.json`).
