# Hazem El Mancy — Process Engineer Portfolio & Calculator Suite

## Overview
This project is a professional engineering portfolio for Hazem El Mancy, a Process Engineer, combined with a suite of client-side process engineering calculators. It aims to showcase expertise in Oil & Gas applications, particularly for FEED/EPC projects, and provide practical, discipline-specific tools. The calculators execute client-side for immediate feedback and data privacy.

## User Preferences
### Engineering Discipline Rules
- Always enforce correct workflow: define scenario/basis → compute governing case → sizing/result → checks → recommendations
- If two-phase/phase uncertainty is likely, flag and block or require explicit user acknowledgement — never silently proceed as single-phase
- Do not fabricate physical properties. Require inputs, or clearly label defaults as "assumed"
- Show equations symbolically + step-by-step intermediate values in both UI and report
- Maintain an "Assumptions Log" and "Warnings/Flags" list for every case
- Never hide "magic constants." Every coefficient must be user-visible, editable, and traceable

### Calculation Trace (Mandatory)
Every solver/calc must return a structured trace object containing:
- inputs (canonical SI + user units)
- steps[] (name, equationId, variables, numericSubstitution, result)
- intermediateValues map
- assumptions[], warnings[], flags[]
- Version stamps (engine/data/schema) where applicable

### Units (Mandatory)
- Store canonical internal units in SI
- Every field displays units; tooltips show SI+USC equivalents where practical
- Never mix gauge and absolute pressure silently; force user to choose and convert explicitly
- Provide unit-safe typing via wrappers + conventions

### Validation & Safety
- Validate physical plausibility (e.g., Pabs>0, ρ>0, k>1, sum of mole fractions=1)
- Do not "auto-fix" bad inputs without showing what changed
- Provide "Normalize" or "Reject" options where relevant
- Guard against NaN/Infinity; deterministic results (same inputs → same outputs)

### Solvers
- Use stable, bracketed root-finding (bisection) as default; optional Newton only if safe
- Always report convergence details (iterations, tolerance, bracket)
- If non-convergent, return diagnostics and recommended user actions

### Code Quality
- No large functions. Keep functions small and composable
- Explicit naming, no cryptic variables; 100% typed inputs/outputs
- Add docstrings for every public engine function (purpose, required inputs, assumptions, references)
- All calculations MUST live in `client/src/lib/engineering/` as pure functions, separate from UI

### UI/UX Rules
- Wizard-style workflow with "cannot proceed" gates where necessary
- Provide "Compare cases" view (min/normal/max) where applicable
- Export dropdown (ONE per calculator, on Results tab only): 3 items — "Calc Note (Print / PDF)", "Export as Excel", "Export as JSON"
- "Calc Note (Print / PDF)" opens a browser HTML engineering calc note via `exportToCalcNote()` in exportUtils.ts — opens in new window with Print button
- Provide "Engineering Flags" banner always visible on results
- Provide "Assumptions" panel editable by user where applicable

### Reporting
- Include: title block, basis, inputs+units, assumptions, step-by-step calculations, results+pass/fail, warnings/flags/action items
- Stamp reports with engine version where available

## System Architecture
The application is a pure static single-page application (SPA) with no backend server or database. It is built with React, Vite, Tailwind CSS, and shadcn/ui, using a dark navy and golden amber theme. Client-side routing is managed by `wouter`. All calculator logic and data processing run entirely in the browser, with engineering calculations strictly modularized into pure functions within `client/src/lib/engineering/`.

**Key architectural features include:**
- **Calculator Suite**: Comprises 16 discipline-specific calculators with multi-tab wizard interfaces for guided input, including Separator Sizing, Heat Exchanger, Compressor, Pump Sizing, API 2000 Tank Venting, Pipe Wall Thickness, and Restriction Orifice Engine.
- **Unified Separator Sizing**: An 8-tab wizard supporting various service types (2-phase/3-phase, vertical/horizontal) based on API 12J and GPSA standards.
- **Flare Knock Out Drum Sizing**: A 7-tab wizard based on API 521 for flare/vent systems.
- **Heat Exchanger Sizing**: A 5-tab wizard for thermal design and geometry, displaying symbolic equations, LMTD, F-factor calculations, and TEMA guidance.
- **Compressor & Pump Sizing**: Multi-tab wizard calculators based on API and GPSA standards, including polytropic/isentropic models, NPSHa, and motor sizing.
- **Unit Management**: Robust system for toggling between SI and Field units with in-place conversion.
- **Piping Components Module**: Lookup tables and calculators for pipe dimensions, flanges, fittings, and flexibility/safe spans, using IndexedDB for persistence.
- **API 2000 Tank Venting**: A 6-tab wizard covering all 8 API 2000 venting scenarios.
- **Pipe Wall Thickness Calculator**: A 5-tab wizard for pressure design per ASME B31.3, B31.4, and B31.8, with a comprehensive material database.
- **Standardized Engineering Basis**: A dedicated reference page detailing industry standards and calculation methods.
- **Safety Disclaimers**: Prominent "Screening Tool Only" banners for specific calculators.
- **Custom Numeric Input**: A custom `NumericInput` component for decimal-safe number entry.
- **Restriction Orifice Engine (ISO 5167-2:2003)**: Implements Reader-Harris/Gallagher Cd, permanent pressure loss, gas expansion factor Y, cavitation assessment, erosional velocity, and multi-stage pressure distribution. Gas properties are handled via Manual, Peng-Robinson EoS, or SRK EoS modes, with Van der Waals mixing rules, Chueh-Prausnitz BIPs, and Lee-Gonzalez-Eakin gas viscosity.
- **Gas Mixing Calculator**: Calculates Z, ρ, μ, Cp/Cv, γ, and speed of sound at specified T & P using Peng-Robinson EoS, SRK EoS, or Pitzer correlation, supporting 20 common O&G species.

## Flare KO Drum — Revision Notes (Task E, March 2026)
Ten corrections applied to `flareKODrum.ts` and `flare-ko-drum.tsx`:
1. **K_eff unit label fixed**: "Effective K (pressure-corrected)" step unit corrected from `"-"` to `"m/s"`. Label updated to include "approx. screening".
2. **K-pressure correction disclosed**: Assumptions log, checkbox label, and methodology all now explicitly state the pressure correction is an approximate screening treatment; verify against project/company design basis for final design.
3. **Liquid design-volume heuristic replaced**: The hidden `holdupTime / sum(durations)` proportional scaling removed. `designLiquidVol = liquidAccum.netAccumulation_m3` — governing scenario net accumulation after drain credit, directly and traceably.
4. **Drain adequacy relabeled**: Step label and flag text updated to "instantaneous drain-rate screening (preliminary only)". Note added that final adequacy depends on event duration, total liquid, level philosophy, and drain behavior.
5. **mistFaceVelocity → grossFaceVelocity**: `GeometryResult` interface, `assembleGeometry` return, calc step label, UI geometry table, and export data all updated. Label reads "Gross Vessel Face Velocity (screening est. — based on gross vessel area, not actual pad area)".
6. **API 521 minimum diameter wording softened**: Calc step label → "Flare KO screening minimum diameter (API 521-based)". Flag label → "Flare KO screening minimum diameter of 1500 mm applied per API 521-based screening practice".
7. **Dynamic simulation flag narrowed**: `DYNAMIC_SIM_REQUIRED` now only fires when `scenarios.length > 1` AND at least one blowdown/depressuring scenario is present. Flag text softened: "Multiple scenarios include transient/blowdown events — assess whether overlapping or sequential loads require dynamic review."
8. **Standard gas basis disclosed**: `computeActualGasFlow` step label now states "std basis: 15°C, 1.01325 bar(a) per ISO 13443". Added to `generateAssumptions`.
9. **Schema validation added**: Full validation loop in `calculateFlareKODrum` before solve: pressure > 0, temperature > −273.15°C, gas density ≥ 0, liquidDensity > gasDensity where both given, MW > 0 and Z > 0 for standard basis, liquid carryover ≥ 0, duration > 0, liquidDensity > 0, kValue > 0, levelFraction in (0,1), allowances ≥ 0, rainoutFraction in [0,1], drainRate ≥ 0.
10. **Souders–Brown limitations disclosed**: `generateAssumptions` now explicitly states no inlet-device, droplet-size distribution, CFD, slug, or foam/re-entrainment modeling. Scope banner added to Results tab. Subtitle updated to "Preliminary sizing / FEED screening per API 521 — not final design authority". Methodology section in exports fully updated.

## Separator Sizing — Revision Notes (Task D, March 2026)
Ten corrections applied to `separatorSizing.ts` and `separator-sizing.tsx`:
1. **K-pressure correction abs/gauge fix**: `computeEffectiveK` now accepts `P_bara` and converts internally (`P_barg = P_bara - 1.01325`). Step logged in calc trace.
2. **Per-case K correction**: K_eff is computed per-case inside the case loop using each case's own operating pressure. Governing case K_eff reported in assumptions. `CaseGasResult` now carries `K_eff`, `pressureCorrected`, `foamDerated`.
3. **API RP 14E reference removed**: References updated to API 12J, GPSA Section 7, and Stewart & Arnold only.
4. **Schema validation**: Formal input validation added for gasPressure > 0, gasTemperature > absolute zero, liquidDensity > 0, flow rates ≥ 0, levelFraction in (0,1), residenceTime/surgeTime/slugVolume ≥ 0, waterCut in [0,1], dropletDiameter_um > 0.
5. **3-phase scope disclosure**: Amber banner added in Results tab for 3-phase mode. `buildAssumptions` and `buildRecommendations` strengthened with explicit scope limitations and next-step guidance.
6. **Stokes Re warning corrected**: Step label and FLAG_LABELS updated to correctly state Stokes OVERPREDICTS v_t when Re_p > 1 (non-conservative — may miss carryover).
7. **Hidden L/D cap removed**: `Math.min(config.maxLD, 5)` removed; user's value is applied directly. UI helper text added explaining the change.
8. **Density mismatch visible warning**: Density cross-check result propagated to `warnings[]` array (shown in UI) for >20% deviation between user density and ideal-gas estimate.
9. **Standard gas basis disclosed**: Assumptions log now includes "Standard gas flow basis: 15°C and 1.01325 bar(a) per ISO 13443". Step label in standard-to-actual conversion updated accordingly.
10. **Mist face velocity relabeled**: Renamed to `grossFaceVelocity` (field + UI label) with note that actual demister face velocity requires vendor pad area.

## External Dependencies
- **React**: Frontend UI library.
- **TypeScript**: For type safety.
- **Vite**: Frontend build tool and dev server.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Reusable UI components.
- **wouter**: Client-side routing.
- **jsPDF & jspdf-autotable**: For PDF report generation.
- **xlsx**: For Excel data export.
- **Zod**: For schema validation.
- **FormSubmit.co**: For calculator feedback submission.