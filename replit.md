# Hazem El Mancy — Process Engineer Portfolio & Calculator Suite

## Overview
Professional engineering portfolio website with validated process engineering calculators for Oil & Gas applications. Built for Hazem El Mancy, a Process Engineer specializing in FEED/EPC projects.

## Architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js (serves frontend, minimal API)
- **Routing**: wouter (client-side)
- **State**: React local state (no database needed - static portfolio + client-side calculators)
- **Engineering Library**: Separate calculation modules in `client/src/lib/engineering/`

## Project Structure
```
client/src/
  components/
    engineering/     - Reusable calculator UI components
    layout/          - Navbar, Footer
    theme-provider   - Dark/light mode
    theme-toggle
  lib/engineering/   - Engineering calculation modules
    constants.ts     - Physical constants, pipe data
    unitConversion.ts - SI/Field unit conversion
    validation.ts    - Zod schemas for calc inputs
    gasSizing.ts     - Gas line sizing (Darcy-Weisbach)
    liquidSizing.ts  - Liquid line sizing
    multiphase.ts    - Multiphase screening (API RP 14E)
    gasMixing.ts     - Gas mixture MW calculation
    gasVolume.ts     - Standard/actual volume conversion
  pages/
    home.tsx         - Landing page
    about.tsx        - Professional profile
    experience.tsx   - Work experience
    projects.tsx     - Project portfolio
    calculators/     - 5 calculator pages
```

## Running
- `npm run dev` starts both Express backend and Vite frontend
- Frontend binds to port 5000

## Key Decisions
- No database: All content is hardcoded (portfolio) or computed client-side (calculators)
- Engineering calculations separated from UI in dedicated library modules
- Dark mode support via ThemeProvider
- Unit system toggle (SI / Field units) on every calculator
