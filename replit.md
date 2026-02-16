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
    constants.ts     - Physical constants, PIPE_SPECS (66 NPS entries), common liquids, fitting K values
    unitConversion.ts - SI/Field unit conversion (pressure, head, power, flow, etc.)
    unitToggle.ts    - convertFormValues helper for in-place unit conversion on toggle
    validation.ts    - Zod schemas for calc inputs
    gasSizing.ts     - Gas line sizing (Darcy-Weisbach)
    liquidSizing.ts  - Liquid line sizing
    multiphase.ts    - Multiphase screening (API RP 14E)
    gasMixing.ts     - Gas mixture MW calculation
    gasVolume.ts     - Standard/actual volume conversion
    pumpSizing.ts    - Centrifugal pump sizing (TDH, power, NPSH)
    restrictionOrifice.ts - Restriction orifice sizing (ISO 5167, liquid & gas)
    controlValve.ts  - Control valve Cv sizing (IEC 60534, liquid & gas)
    separatorSizing.ts - Separator/KO drum sizing (Souders-Brown)
    heatExchanger.ts - Heat exchanger area (LMTD/Kern)
    prdSizing.ts     - PRD/Flare relief device sizing (API 521/520/526, 9-tab wizard engine)
    psvSizing.ts     - (Legacy) PSV sizing screening — replaced by prdSizing.ts
    thermalRelief.ts - Thermal expansion relief screening (API 521)
    compressorSizing.ts - Compressor sizing (polytropic/isentropic, multi-stage, API 617/618)
  pages/
    home.tsx         - Single-page portfolio (Hero, About, Experience, Projects, Skills, Contact)
    calculators/     - 13 calculator pages
      gas-line-sizing.tsx
      liquid-line-sizing.tsx
      multiphase-line.tsx
      gas-mixing.tsx
      gas-volume.tsx
      pump-sizing.tsx
      restriction-orifice.tsx
      control-valve.tsx
      separator.tsx
      heat-exchanger.tsx
      psv-sizing.tsx   - Now: PRD/Flare Relief Calculator (9-tab wizard)
      thermal-relief.tsx
      compressor.tsx
```

## Running
- `npm run dev` starts both Express backend and Vite frontend
- Frontend binds to port 5000

## Key Decisions
- No database: All content is hardcoded (portfolio) or computed client-side (calculators)
- Engineering calculations separated from UI in dedicated library modules
- Dark mode only (dark navy theme)
- Unit system toggle (SI / Field units) on every calculator
- Unit toggle converts input values in-place when switching between SI and Field
- NPS pipe size selector with auto-fill of OD/WT/ID dimensions, manual override supported
- Single-page scrolling portfolio with section anchors (#home, #about, etc.)
- Calculator pages on separate routes (/calculators/*)
- Navbar dropdown categorizes 13 calculators by discipline: Hydraulics, Fluid Properties, Equipment, Relief
- Relief calculators (PRD, Thermal) labeled as "SCREENING TOOL — NOT FOR FINAL DESIGN"
- All engine modules include comprehensive equation references (API, ISO, IEC, TEMA standards)
- Feedback section on every calculator page (FormSubmit.co to mancy.hazem@gmail.com)
- FeedbackSection component at `client/src/components/engineering/feedback-section.tsx`
- Gas volume conversion: standard units (Nm3/h, Sm3/h, SCFM, MMSCFD) have disabled P/T/Z fields (fixed reference conditions)
- PRD Calculator: 9-tab wizard (Project → Equipment → Scenarios → Governing → Device → Sizing → Orifice → Piping → Results)
  - Engine module: prdSizing.ts with gas/vapor, steam, liquid sizing, API 526 orifice selection, inlet/outlet piping checks
  - Supports API 521 scenario screening (blocked outlet, fire, CW failure, tube rupture, thermal expansion, etc.)
  - Device type recommendation based on backpressure and service conditions
  - Replaced simpler PSV sizing calculator (route path preserved at /calculators/psv-sizing)
