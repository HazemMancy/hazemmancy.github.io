# Hazem El Mancy — Process Engineer Portfolio & Calculator Suite

## Overview
Professional engineering portfolio website with validated process engineering calculators for Oil & Gas applications. Built for Hazem El Mancy, a Process Engineer specializing in FEED/EPC projects.

## Architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js (serves frontend, minimal API)
- **Routing**: wouter (client-side)
- **State**: React local state (no database needed - static portfolio + client-side calculators)
- **Engineering Library**: Separate calculation modules in `client/src/lib/engineering/`
- **Theme**: Dark navy (#0c1222) + golden amber (#d4a04a), single-page scrolling portfolio

## Project Structure
```
client/src/
  components/
    engineering/     - Reusable calculator UI components
    layout/          - Navbar, Footer
    theme-provider   - Dark mode (always dark)
    theme-toggle
  lib/engineering/   - Engineering calculation modules
    constants.ts     - Physical constants, pipe data, common liquids, fitting K values
    unitConversion.ts - SI/Field unit conversion (pressure, head, power, flow, etc.)
    validation.ts    - Zod schemas for calc inputs
    gasSizing.ts     - Gas line sizing (Darcy-Weisbach)
    liquidSizing.ts  - Liquid line sizing
    multiphase.ts    - Multiphase screening (API RP 14E)
    gasMixing.ts     - Gas mixture MW calculation
    gasVolume.ts     - Standard/actual volume conversion
    pumpSizing.ts    - Centrifugal pump sizing (TDH, power, NPSH)
  pages/
    home.tsx         - Single-page portfolio (Hero, About, Experience, Projects, Skills, Contact)
    calculators/     - 6 calculator pages
      gas-line-sizing.tsx
      liquid-line-sizing.tsx
      multiphase-line.tsx
      gas-mixing.tsx
      gas-volume.tsx
      pump-sizing.tsx
```

## Running
- `npm run dev` starts both Express backend and Vite frontend
- Frontend binds to port 5000

## Key Decisions
- No database: All content is hardcoded (portfolio) or computed client-side (calculators)
- Engineering calculations separated from UI in dedicated library modules
- Dark mode only (dark navy theme)
- Unit system toggle (SI / Field units) on every calculator
- Single-page scrolling portfolio with section anchors (#home, #about, etc.)
- Calculator pages on separate routes (/calculators/*)
