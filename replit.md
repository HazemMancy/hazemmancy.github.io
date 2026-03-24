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
- **Heat Exchanger Sizing (Revised)**: A 5-tab wizard for FEED-level preliminary thermal sizing. Key revisions: (1) Both-outlets-known duty policy uses average (Q_h + Q_c)/2 — not max; mismatch flagged explicitly; (2) Phase-change service (condensing/boiling) triggers a mandatory prominent banner with an explicit acknowledgement checkbox — calculate button is gated until user confirms screening-only intent; (3) `hxInputSchema`, `hxCaseSchema`, `hxUInputSchema`, `hxConfigSchema` Zod schemas added to `validation.ts` and `safeParse()` called at top of `handleCalculate` before invoking the solver; (4) allowApproxF and allowEstimatedU are enforced inside the solver path (throw if disabled); (5) Geometry module limitations disclaimer expanded (lists what Bell-Delaware, baffle, vibration items are NOT calculated); (6) Export/methodology panel strengthened with explicit preliminary-sizing-only scope, duty basis, phase-change limitation, F-correlation approximation level, and geometry screening disclosure; (7) Solver assumptions rewritten to clearly state FEED/screening scope and limitations; (8) Energy balance row relabeled with duty basis (avg or given) explicitly shown in UI.
- **Control Valve Sizing (Revised)**: A 7-tab wizard for IEC 60534-informed preliminary Cv screening. Key revisions: (1) Fp override now explicitly described as affecting the Cv equation and choked-flow check — helper text added to UI explaining FLP and xTP remain geometry-based and Fp ≠ FLP; (2) Fp override is NOT copied into FLP — FLP always computed from `computeFLP()` using valve/pipe geometry independently; (3) Fd de-emphasized consistently — labeled "reference only, not used in Cv calculation" in UI, export, and all assumptions; simplified viscosity correction (FR) disclosed; (4) "Valve Authority" renamed to "Valve Authority (Screening)" / "authority screening estimate" everywhere — Tab 5 description, UI labels, summary rows, export datasheet all updated; (5) Zod schema validation added to `validation.ts` (`cvOperatingPointSchema`, `cvLiquidPropsSchema`, `cvGasPropsSchema`, `cvValveDataSchema`, `cvInstallationSchema`, `cvEnabledPointsSchema`) and `safeParse()` called in `handleCalcSizing` before invoking solver — validates flow, pressures, temperatures, MW, k>1, Z, density, viscosity, FL/xT ranges, Fp override range, and operating points; (6) Cavitation wording already uses "screening indication" and "may be required — verify with vendor" language throughout; (7) Steam branch limitations prominent amber banner already present; (8) Export methodology panel fully rewritten with per-branch disclosure (liquid/gas/steam each explicitly labeled as screening-only, Fd/authority/Fp/steam limitations all stated); (9) Standards wording revised — "mandatory" → "recommended" for noise warnings, all overclaiming language softened to "screening-level only"; (10) Gas/steam velocity not displayed in results (already 0 for gas/steam — confirmed not rendered in UI).
- **Compressor & Pump Sizing**: Multi-tab wizard calculators based on API and GPSA standards, including polytropic/isentropic models, NPSHa, and motor sizing.
- **Unit Management**: Robust system for toggling between SI and Field units with in-place conversion.
- **Piping Components Module (Revised)**: Lookup tables and calculators for pipe dimensions, flanges, fittings, gaskets, valves, olets, line-blanks, and flexibility/safe spans, using IndexedDB for persistence. Key revisions: (1) Row-selection stability fixed on all 7 lookup pages — uses stable row key (`nps|schedule` etc.) instead of filtered-array index, preserving selection across filter changes; (2) Dataset provenance card added to each lookup page when using built-in data — shows the standard edition (e.g., "ASME B36.10M:2018, B36.19M:2018") and the full dataset disclaimer text from each `*_DATA_PROVENANCE` constant; (3) Each lookup page badge updated to show `Built-in: <edition>` instead of generic "Built-in ASME Data"; (4) Bottom disclaimers on all 7 pages upgraded from generic text to the specific `*_DATA_PROVENANCE.disclaimer` and labeled "Dimensional Reference Tool — Not for Direct Design Use"; (5) Page subtitles updated to include "dimensional reference only"; (6) Pipe flexibility restraint type field remains documentation-only (already labeled as such); (7) Flexibility and safe-spans screening banners already comprehensive.
- **API 2000 Tank Venting (Fully Revised)**: A 6-tab wizard covering all 8 API 2000 venting scenarios. Key revisions: EmergencyCaseDetail interface; allCasesConsidered / governingCaseLabel / appliedCreditsSummary on EmergencyVentingResult; VentSizingResult NPS fields renamed to pressureApproxConnSize / vacuumApproxConnSize / emergencyApproxConnSize with emergencyDPBasis_mbar / normalDPBasis fields; sizeVentForDP returns approxConnSize with DN equivalents; governing scenario block rewritten with explicit case comparison logic; strengthened assumptions block; api2000InputSchema added to validation.ts; full UI update (screening banner, subtitle, safeParse, rim seal warning, governing case matrix card, ΔP basis disclosure card, export data updated).
- **Pipe Wall Thickness Calculator (Revised)**: A 5-tab wizard for pressure design per ASME B31.3, B31.4, and B31.8, with a comprehensive material database. Key revisions: (1) Page subtitle updated to "Preliminary Wall Thickness & Schedule Screening Tool — results require engineering review before use in design"; (2) Prominent `USER_OVERRIDE_ACTIVE` banner added in results tab when user has bypassed built-in stress/joint-factor/design-factor lookup; (3) `PRELIMINARY_DATA` banner added in results tab when data quality is set to preliminary; (4) FBW joint type already blocked for B31.8 (§817.1); (5) Temperature warnings for both high and low temperatures already in engine (MATERIAL_TEMP_LIMIT, LOW_TEMP_CLAMPED, TEMP_ABOVE_DERATING_TABLE flags); (6) Separate QUALITY_FACTORS_PIPELINE table for B31.4/B31.8 already implemented with correct ERW E = 0.80.
- **Standardized Engineering Basis**: A dedicated reference page detailing industry standards and calculation methods.
- **Safety Disclaimers**: Prominent "Screening Tool Only" banners for specific calculators.
- **Custom Numeric Input**: A custom `NumericInput` component for decimal-safe number entry.
- **Restriction Orifice Engine (ISO 5167-2:2003)**: Implements Reader-Harris/Gallagher Cd, permanent pressure loss, gas expansion factor Y, cavitation assessment, erosional velocity, and multi-stage pressure distribution. Gas properties are handled via Manual, Peng-Robinson EoS, or SRK EoS modes, with Van der Waals mixing rules, Chueh-Prausnitz BIPs, and Lee-Gonzalez-Eakin gas viscosity.
- **Gas Mixing Calculator**: Calculates Z, ρ, μ, Cp/Cv, γ, and speed of sound at specified T & P using Peng-Robinson EoS, SRK EoS, or Pitzer correlation, supporting 20 common O&G species.
- **PRD / Flare Relief Calculator (Revised Task H)**: 9-tab wizard per API 520/521/526. Key revisions: relieving temperature bug fixed (now uses actual sizing-basis temperature, not normal operating temperature); Kb/Kw label conditional on fluid type (Kb for gas/steam, Kw for liquid per API 520 §5.7.2); `kwFactor` and `relievingTemperature` added to `PRDSizingResult`; schema validation via `validatePRDSizingInput()`; steam preliminary-only warning card; two-phase limitation warning in scenario cards and flags/warnings in `buildFinalResult()`; gas API-informed-screening disclosure warning; device recommendation preview labeled as "preliminary only" with rationale note; piping check discloses approximate density/viscosity basis; all export methodology/assumptions text softened to "API-informed screening" wording.
- **Thermal Expansion Relief Calculator (Fully Revised — Task II)**: 9-tab wizard per API 521/520/526. All revisions complete and deployed: (1) File header rewritten to "Preliminary Sizing / Screening Tool" with explicit limitations block; (2) `highViscosityFlag: boolean` added to `ThermalSizingResult` interface and returned from `calculateTRVSizing()` as `fluid.viscosity > 10`; (3) `OUTLET_DP_FAIL` removed from `FLAG_LABELS` (replaced with `HIGH_VISCOSITY` flag with correct severity); (4) `estimatePressureRiseRate` renamed to `estimatePressureRiseSensitivity` with JSDoc clarifying it is dP/dT not a time-rate; (5) `calculateReliefRate()` dual-method label updated to `[conservative screening: max of both methods]`; (6) `buildCalcTrace` assumptions block fully rewritten with explicit SCREENING TOOL notice, Kv omission, α constancy, governing rate methodology, Kw caveat, outlet hydraulics limitation; (7) `FLAG_LABELS` entries improved: LARGE_TEMP_RISE, INLET_DP_FAIL, HIGH_BACKPRESSURE, ALPHA_TEMP_DEPENDENT all updated with clearer text; (8) `thermalEquipmentSchema`, `thermalFluidSchema`, `thermalDeviceSizingSchema` Zod schemas added to validation.ts; `safeParse()` called at top of `handleCalcReliefRate()` and `handleCalcSizing()`; (9) UI page subtitle updated to "Preliminary Sizing / Screening Tool — Blocked-in Liquid Overpressure (API 521/520/526)"; (10) Screening banner expanded with 4 specific bullet limitations (Kv not applied, α constant, governing rate conservative, outlet no pass/fail); (11) Fluid tab: α input adds "assumed constant over ΔT" note; viscosity input shows amber inline warning when > 10 cP; (12) Sizing tab: Kw hint strengthened ("Kw = 1.0 is NOT universally correct"); high-viscosity amber warning shown below Kw when applicable; (13) Relief Rate tab description explains max(both methods) = conservative FEED approach; (14) Piping tab description strengthened with explicit outlet limitations (flashing, valve body losses, header interactions not modelled); (15) Results tab: highViscosityFlag amber card shown when true; "Pressure Rise per °C (Approx.)" relabeled "Pressure Rise Sensitivity (dP/dT, indicative)".

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