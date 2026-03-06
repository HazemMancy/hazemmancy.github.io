# Hazem El Mancy — Process Engineer Portfolio & Calculator Suite

## Overview
This project serves as a professional engineering portfolio for Hazem El Mancy, a Process Engineer, integrated with a suite of validated client-side process engineering calculators. Its primary goal is to demonstrate expertise in Oil & Gas applications, particularly for FEED/EPC projects, and to offer practical, discipline-specific tools. The calculators are designed for client-side execution, ensuring immediate feedback and data privacy.

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
The application is a **pure static single-page application (SPA)** — no backend server. It is built with React, Vite, Tailwind CSS, and shadcn/ui, using a dark navy and golden amber theme. Client-side routing is managed by `wouter`. There is no database; all portfolio content is hardcoded, and all calculator logic and data processing run entirely in the browser. Engineering calculations are strictly modularized into pure functions within `client/src/lib/engineering/`, ensuring clear separation from UI components.

**Build & Hosting:**
- `npx vite` — development server (port 5000 on Replit)
- `npx vite build` — produces static output in `dist/` (HTML, CSS, JS)
- `dist/404.html` — copy of index.html for GitHub Pages SPA routing
- `dist/.nojekyll` — prevents Jekyll processing on GitHub Pages
- The `dist/` folder can be deployed to GitHub Pages, Netlify, Vercel, or any static host
- No Express server, no server-side code, no API endpoints

Key architectural features and implementations include:
- **Calculator Suite**: Comprises 16 discipline-specific calculators, featuring complex multi-tab wizard interfaces for guided input (e.g., Separator Sizing, Heat Exchanger, Compressor, Pump Sizing, API 2000 Tank Venting). These wizards include progress bars, step headers, and bottom navigation.
- **Unified Separator Sizing**: A single, comprehensive 8-tab wizard calculator supports various service types and configurations (2-phase/3-phase, vertical/horizontal), incorporating API 12J and GPSA standards for sizing and providing configuration recommendations based on process conditions.
- **Flare Knock Out Drum Sizing**: A 7-tab wizard calculator based on API 521 for flare/vent systems, handling multi-scenario liquid accumulation and enforcing minimum vessel diameter.
- **Heat Exchanger Sizing**: A 5-tab wizard for thermal design and geometry, displaying symbolic equations, LMTD, F-factor calculations, and offering TEMA guidance with detailed warnings for approach temperatures, F-factors, and fouling.
- **Compressor & Pump Sizing**: Multi-tab wizard calculators based on API and GPSA standards, including polytropic/isentropic models, auto-staging, NPSHa assessment, and motor sizing margins.
- **Unit Management**: A robust unit system allows toggling between SI and Field units with in-place conversion across all calculators.
- **Piping Components Module**: Provides lookup tables for pipe dimensions, flanges, fittings, gaskets, valves, and olets, along with calculators for pipe flexibility and safe spans using IndexedDB for data persistence.
- **API 2000 Tank Venting**: A 6-tab wizard calculator comprehensively covers all 8 API 2000 venting scenarios, including normal and emergency venting, scenario applicability logic, and governing case identification.
- **Standardized Engineering Basis**: A dedicated reference page (`/engineering-basis`) details all industry standards and calculation methods used throughout the suite, organized by discipline.
- **Safety Disclaimers**: Specific calculators (e.g., PRD/Flare Relief, Thermal Expansion Relief) feature prominent "Screening Tool Only" banners to emphasize their intended use.
- **Custom Numeric Input**: A custom `NumericInput` component ensures decimal-safe number entry across all calculator pages, preventing common React controlled input issues.

## External Dependencies
- **React**: Frontend UI library.
- **TypeScript**: For type safety in JavaScript.
- **Vite**: Frontend build tool and dev server.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Reusable UI components.
- **wouter**: Client-side routing.
- **jsPDF & jspdf-autotable**: For PDF report generation.
- **xlsx**: For Excel data export.
- **Zod**: For schema validation.
- **FormSubmit.co**: For calculator feedback submission (client-side POST).

## GitHub Pages Deployment
To deploy to GitHub Pages:
1. Run `npx vite build` — generates `dist/` with static files
2. The build automatically includes `404.html` (SPA routing fallback) and `.nojekyll`
3. Push the `dist/` folder to the `gh-pages` branch, or configure GitHub Actions to build and deploy
4. If using a repository subpath (e.g., `username.github.io/repo-name`), set `base: '/repo-name/'` in `vite.config.ts`