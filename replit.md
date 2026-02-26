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
- **Calculator Suite**: 13 discipline-specific calculators covering hydraulics, fluid properties, equipment sizing, and relief systems.
- **Wizard-style UI**: Complex calculators (e.g., Restriction Orifice, Control Valve, Separator, Heat Exchanger, PRD/Flare Relief) utilize multi-tab wizard interfaces for guided input and calculation flow.
- **Unit Management**: A robust unit system toggle (SI / Field units) is present on every calculator, with in-place conversion of input values.
- **Piping Components Module**: Includes lookup tables for pipe dimensions (ASME B36.10M/B36.19M), flanges, fittings, gaskets, valves, line blanks, and olets, along with calculators for pipe flexibility and safe spans. This module uses IndexedDB for data persistence and supports CSV/JSON imports.
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