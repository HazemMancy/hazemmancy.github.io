# Hazem El Mancy — Process Engineer Portfolio & Calculator Suite

## Overview
This project is a professional engineering portfolio website for Hazem El Mancy, a Process Engineer, coupled with a suite of validated process engineering calculators. The primary purpose is to showcase expertise and provide practical tools for Oil & Gas applications, particularly in FEED/EPC projects. The calculators are designed to be client-side and cover various engineering disciplines.

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
- Provide "copy as JSON" and "export report" always visible
- Provide "Engineering Flags" banner always visible on results
- Provide "Assumptions" panel editable by user where applicable

### Reporting
- Include: title block, basis, inputs+units, assumptions, step-by-step calculations, results+pass/fail, warnings/flags/action items
- Stamp reports with engine version where available

## System Architecture
The application features a React-based frontend built with TypeScript, Vite, Tailwind CSS, and shadcn/ui for a modern, responsive user interface. The UI/UX adopts a single-page scrolling portfolio design with a dark navy and golden amber theme. Client-side routing is handled by `wouter`. The backend is a minimal Express.js server primarily responsible for serving the frontend.

A core architectural decision is the absence of a database; all portfolio content is hardcoded, and all calculator logic and data processing occur client-side. Engineering calculations are modularized into a dedicated library (`client/src/lib/engineering/`) containing pure functions, ensuring separation of concerns from the UI components.

Key features and implementations include:
- **Calculator Suite**: 16 discipline-specific calculators covering hydraulics, fluid properties, equipment sizing, and relief systems.
- **Wizard-style UI**: Complex calculators (e.g., Restriction Orifice, Control Valve, Conventional Separator, Two-Phase Separator, Flare KO Drum, Heat Exchanger, PRD/Flare Relief, Compressor, Pump Sizing) utilize multi-tab wizard interfaces for guided input and calculation flow.
- **Conventional Separator (7-Tab Wizard)**: Project → Cases → Design → Gas Sizing → Holdup → Geometry → Results. API 12J production separator sizing. Vertical/horizontal orientations, 2-phase and 3-phase (gas-oil-water) configurations. Souders-Brown gas capacity sizing with API 12J K-value guidance. Liquid holdup/surge design with 3-phase oil/water retention times. Engineering flags, recommendations, next steps. Engine: `conventionalSeparator.ts`.
- **Two-Phase Separator (7-Tab Wizard)**: Project → Cases → Design → Gas Sizing → Holdup → Geometry → Results. GPSA Section 7 gas scrubber/inlet separator sizing. Service types: gas scrubber, inlet separator, slug catcher, test separator. Souders-Brown with GPSA K-factors. Optional Stokes' law droplet settling verification. Slug catcher volume accommodation. Engine: `twoPhaseSeparator.ts`.
- **Flare KO Drum (7-Tab Wizard)**: Project → Scenarios → Design → Gas Sizing → Liquid Accumulation → Geometry → Results. API 521 knockout drum sizing for flare/vent systems. Conservative K-factors (0.02-0.06 gravity settling). Multi-scenario relief/blowdown cases with liquid accumulation from transient events. Drain rate adequacy check. Typically bare vessel or simple wire mesh. Engine: `flareKODrum.ts`.
- **Heat Exchanger Sizing (5-Tab Wizard)**: Basis (project + streams) → Configuration (arrangement, passes, U & fouling) → Thermal Design (calculate with inline equation display: Energy Balance, LMTD, F-Factor, Area) → Geometry (tube sizing, TEMA guidance, area verification) → Summary (results table, case comparison, export). Calculate stays on Thermal Design tab (no auto-jump). Step progress indicator at top. Equations shown symbolically with numeric results in monospace cards. Geometry/Summary tabs gated until calculation runs. Engine functions: `computeTubeGeometry()`, `generateTEMAGuidance()`, `STANDARD_TUBE_SIZES`, `TEMA_TYPES`, `BUNDLE_CONSTANTS`.
- **Compressor Sizing (5-Tab Wizard)**: Project → Gas & Conditions → Sizing → Stages → Summary. Supports centrifugal (API 617) and reciprocating (API 618) compressors with polytropic/isentropic models. Auto-staging based on compression ratio and discharge temperature limits. Sizing tab shows inline equations (polytropic exponent, discharge temperature, head, power) as monospace cards with symbolic + numeric substitution. Stage-by-stage breakdown table and compressor curve chart. Stages/Summary tabs gated until calculation runs. Engine: `compressorSizing.ts` with CalcTrace.
- **Pump Sizing (5-Tab Wizard)**: Project → Fluid & Piping → Pump Config → Hydraulics → Summary. Supports centrifugal (API 610) and positive displacement (API 674/676) pumps. Darcy-Weisbach with Swamee-Jain friction factor. Fitting K-value entry system. Hydraulics tab shows inline equations (Reynolds, friction, TDH, NPSHa, power) as monospace cards. Pump/PD curve charts. Hydraulics/Summary tabs gated until calculation runs. Engine: `pumpSizing.ts` with PumpCalcTrace.
- **Unit Management**: A robust unit system toggle (SI / Field units) is present on every calculator, with in-place conversion of input values.
- **Piping Components Module**: Includes lookup tables for pipe dimensions (ASME B36.10M/B36.19M) with weight_kg_per_m populated for all rows, flanges (WN/SO/BL types, Class 150/300/600), fittings (90LR/45LR/TEE/CAP/RED_CON/RED_ECC), gaskets (SWG/RF types), valves (GATE/GLOBE/BALL/CHECK, Class 150/300/600), line blanks (SPECTACLE/SPADE/SPACER), and olets (WELDOLET/SOCKOLET/THREADOLET), along with calculators for pipe flexibility (guided cantilever method: σ=3·E·Do·δ/L² per M.W. Kellogg/ASME B31.3) and safe spans (superposition of distributed + concentrated loads with bisection solver, beam coefficients for simple/fixed/continuous supports). This module uses IndexedDB for data persistence and supports CSV/JSON imports.
- **API 2000 Tank Venting Calculator**: Comprehensive scenario-based calculator covering all 8 API 2000 venting scenarios. Normal venting: N1 thermal outbreathing (C_out×V^0.7, Table 2), N2 thermal inbreathing (C_in×V^0.7, Table 3), N3 liquid pump-in outbreathing (fill_rate×flash_factor, Section 4.4.1), N4 liquid pump-out inbreathing (empty_rate, Section 4.4.2). Emergency venting: E1 external fire bare tank (Q=43,200×F×A_w^0.82, Section 5.2), E2 fire with insulation credit (Section 5.2.3), E3 fire with drainage provisions (Section 5.2.2), E4 floating roof rim seal fire (Section 5.4). Features: scenario matrix with applicability logic (floating roof excludes E1-E3, underground excludes all fire), Section 5.3 normal credit against emergency, separate vent sizing for PV valve pressure/vacuum and emergency vent (Cd=0.62/0.55), governing case identification. 6-tab wizard: Tank → Product → Normal → Emergency → Scenarios → Results. Engine: `api2000.ts`.
- **Calculation Engines**: Each calculator module (`.ts` file) contains detailed engineering logic based on industry standards (e.g., API, ISO, IEC). Engines provide comprehensive calculation traces, handle validation, and incorporate engineering flags for warnings and recommendations.
- **NPS Pipe Size Selector**: Auto-fills OD/WT/ID dimensions with manual override capability.
- **Theming**: A consistent dark navy theme is enforced throughout the application.

## External Dependencies
- **React**: Frontend UI library.
- **TypeScript**: Superset of JavaScript for type safety.
- **Vite**: Frontend build tool.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Reusable UI components.
- **Express.js**: Backend web framework.
- **wouter**: Client-side routing library.
- **jsPDF & jspdf-autotable**: For generating PDF reports.
- **xlsx**: For exporting data to Excel format.
- **Zod**: For schema validation of calculator inputs.
- **FormSubmit.co**: For handling calculator feedback submissions.