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
    restrictionOrifice.ts - Restriction orifice sizing (ISO 5167, liquid & gas, 5-tab wizard engine: bisection solver, choked-flow detection, cavitation/flashing checks, β correction, calc traces)
    controlValve.ts  - Control valve Cv sizing (IEC 60534/ISA S75, 7-tab wizard engine: multi-point min/normal/max, liquid/gas/steam, valve selection, cavitation/flashing/noise risk)
    separatorSizing.ts - Separator/KO drum sizing (Souders-Brown, 7-tab wizard engine: multi-case operating points, horizontal iterative solver, holdup/surge/retention, KO drum & 3-phase preliminary, geometry assembly, engineering flags, calc traces)
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
      restriction-orifice.tsx  - RO sizing calculator (5-tab wizard: Project → Service → Sizing → Results → Recommendations)
      control-valve.tsx
      separator.tsx        - Separator/KO drum calculator (7-tab wizard: Project → Cases → Design → Gas Sizing → Holdup → Geometry → Results)
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
- Restriction Orifice Calculator: 5-tab wizard (Project → Service → Sizing → Results → Recommendations)
  - Engine module: restrictionOrifice.ts with bisection solver, β⁴ correction, calc traces
  - Liquid: W = Cd·A·√(2·ρ·ΔP/(1-β⁴)), cavitation/flashing checks using Pv, Reynolds number
  - Gas: choked detection x_crit = (2/(k+1))^(k/(k-1)), subcritical with Y expansion factor, choked with f(k) critical flow function
  - Sizing modes: "Size for flow" (solver finds d) and "Predict ΔP" (given d, compute flow)
  - Engineering flags: CHOKED_FLOW, CAVITATION_RISK, FLASHING_LIKELY, HIGH_DP_FRACTION, BETA_OUT_OF_RANGE, etc.
  - Rule-based recommendations engine + next-steps checklist
  - Legacy calculateROLiquid/calculateROGas interfaces preserved for backward compatibility
- Separator / KO Drum Calculator: 7-tab wizard (Project → Cases → Design → Gas Sizing → Holdup → Geometry → Results)
  - Engine module: separatorSizing.ts with multi-case operating points, Souders-Brown core, horizontal iterative solver
  - Core: v_s,max = K × √((ρ_l − ρ_g) / ρ_g), A_req = Q_g / v_s,max, D_req = √(4 × A_req / π)
  - Horizontal: iterative gas-area correction for liquid level fraction with segment area calculation
  - Separator types: Vertical, Horizontal, KO Drum, 3-Phase (preliminary)
  - Multi-case: Normal/Maximum/Fire/Upset/Startup/Blowdown — governing case by largest D_req
  - Holdup: residence time, surge time, slug volume, KO drum drain, 3-phase oil/water retention
  - Geometry: vessel assembly with configurable allowances (inlet, disengagement, mist, sump, nozzle)
  - Engineering flags: FOAM_RISK, SLUGGING_RISK, SOLIDS_SAND, HYDRATE_WAX, HIGH_LIQUID_LOAD, etc.
  - K-value guidance: typical ranges for vertical/horizontal/KO drum with mesh/vane/none
  - Test cases: Flare KO Drum (2-case) and Horizontal Production Separator (2-case)
  - Legacy calculateSeparatorSizing interface preserved for backward compatibility
- Control Valve Calculator: 7-tab wizard (Project → Service Data → Valve Type → Sizing → Selection → Risk → Results)
  - Engine module: controlValve.ts with multi-point Cv sizing (min/normal/max), liquid/gas/steam modes
  - Valve selection: opening %, rangeability check, valve authority assessment
  - Risk assessment: cavitation index (σ vs FL²), flashing, choked gas, high noise screening
  - Viscosity correction for high-viscosity liquids (Re-based FR factor)
  - Test cases: Cooling Water (liquid) and Natural Gas (gas)
  - Legacy calculateCVLiquid/calculateCVGas functions preserved for backward compatibility
