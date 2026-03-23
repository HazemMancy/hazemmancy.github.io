# Hazem El Mancy — Process Engineer Portfolio & Calculator Suite

## Overview
This project serves as a professional engineering portfolio for Hazem El Mancy, a Process Engineer, showcasing expertise in Oil & Gas FEED/EPC projects. It integrates a client-side suite of process engineering calculators designed to provide immediate feedback and ensure data privacy. The primary purpose is to offer practical, discipline-specific tools while demonstrating engineering proficiency.

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
The application is a pure static single-page application (SPA) with no backend server or database, running entirely client-side. It utilizes React, Vite, Tailwind CSS, and shadcn/ui, featuring a dark navy and golden amber theme. Client-side routing is handled by `wouter`. All engineering calculation logic is modularized into pure functions within `client/src/lib/engineering/`.

**Key architectural features include:**
- **Calculator Suite**: Comprises 16 discipline-specific calculators with multi-tab wizard interfaces for guided input, including Separator Sizing, Heat Exchanger, Compressor, Pump Sizing, API 2000 Tank Venting, Pipe Wall Thickness, and Restriction Orifice Engine.
- **Unified Separator Sizing**: An 8-tab wizard supporting various service types (2-phase/3-phase, vertical/horizontal) based on API 12J and GPSA standards.
- **Flare Knock Out Drum Sizing**: A 7-tab wizard based on API 521.
- **Heat Exchanger Sizing**: A 5-tab wizard for thermal design and geometry, displaying symbolic equations, LMTD, F-factor, and TEMA guidance.
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
- **PRD / Flare Relief Calculator (Revised Task H)**: 9-tab wizard per API 520/521/526. Key revisions: relieving temperature bug fixed (now uses actual sizing-basis temperature, not normal operating temperature); Kb/Kw label conditional on fluid type (Kb for gas/steam, Kw for liquid per API 520 §5.7.2); `kwFactor` and `relievingTemperature` added to `PRDSizingResult`; schema validation via `validatePRDSizingInput()`; steam preliminary-only warning card; two-phase limitation warning in scenario cards and flags/warnings in `buildFinalResult()`; gas API-informed-screening disclosure warning; device recommendation preview labeled as "preliminary only" with rationale note; piping check discloses approximate density/viscosity basis; all export methodology/assumptions text softened to "API-informed screening" wording.
- **Thermal Expansion Relief Calculator (Revised Task I)**: 9-tab wizard per API 521/520/526. Key revisions (10 items): `pressureRiseRate` renamed to `pressureRisePerDegC` (clearer label "Pressure Rise per °C (Approx.)") throughout engine and UI; outlet piping changed from 3% pass/fail to "hydraulic estimate only" with blue ESTIMATE badge (no pass/fail criterion — `isOutlet` param added to `calculateThermalPiping()`); viscosity warning added when fluid viscosity > 10 cP (no viscosity correction factor in API 520 liquid equation); temperature validation relaxed for heat-input-only mode (no `heatingDuration`); Kw help text updated to "Verify per API 520 §5.7.2 — depends on device type and service conditions"; governing relief-rate disclosure added to calcTrace assumptions; α constancy disclosure added to assumptions; piping tab header clearly separates inlet 3% rule from outlet hydraulic-estimate-only; velocity warning now labeled "FEED screening guidance (6 m/s)"; `validateInputs()` called at top of `handleCalcReliefRate()` and `handleCalcSizing()` staged solvers.

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