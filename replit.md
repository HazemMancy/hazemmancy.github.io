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
- Export dropdown (ONE per calculator, on Results tab only): 3 items — "Calc Note (Print / PDF)", "Export as Excel", "Export as JSON"
- "Calc Note (Print / PDF)" opens a browser HTML engineering calc note via `exportToCalcNote()` in exportUtils.ts — opens in new window with Print button
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
- **Heat Exchanger Sizing** (Rev C — engineering-issued): A 5-tab wizard for thermal design and geometry, displaying symbolic equations, LMTD, F-factor calculations, and offering TEMA guidance with detailed warnings for approach temperatures, F-factors, and fouling. Engineering fixes applied: (1) Shell ID formula corrected — clearance values (12/25/35/45 mm) are diametral per Kern §11 / TEMA Table C-5; prior code doubled them; (2) HIGH_OVERDESIGN flag threshold corrected to >30% (was >40%) to match FLAG_LABELS; (3) NTU trace explicitly labelled "counter-current basis, informational" per Kays & London §2; (4) Bundle diameter step now cites Coulson & Richardson Vol.6 §12.5 / HEDH for K1/n1 constants; (5) Shell ID trace step updated to state "diametral clearance"; (6) Co-current ΔT₁/ΔT₂ equation labels are now dynamic — show inlet/outlet pairing for co-current and standard convention for counter-current (was hardcoded); (7) Approach temperature minimum converted as difference (×5/9, no offset) in Field units; (8) Engine trace Ch/Cc equations now show (ṁ/3600)×Cp explicitly [kg/h ÷ 3600 = kg/s]; (9) UI Energy Balance Q equations include /3600 annotation; (10) Governing duty uses max(Qh, Qc) — conservative basis covering both sides — with explicit trace step; (11) Phase/Service selectors (single phase / condensing / boiling) added to both hot and cold stream inputs, activating PHASE_CHANGE_NOT_MODELED flag and TEMA guidance correctly; (12) R and P labels disambiguated — "R (heat capacity ratio, Bowman et al.)" and "P (temperature effectiveness, Bowman et al.)"; C_r renamed "C_r = Cmin/Cmax (NTU-ε method)" to eliminate substring collision; (13) Calc Note HTML expanded — now includes phase/service, both side duties, governing duty basis, R, P, U_clean, cleanliness factor, overdesign %, ε, NTU, and C_r in results table.
- **Compressor & Pump Sizing** (Rev C — engineering-issued): Multi-tab wizard calculators based on API and GPSA standards, including polytropic/isentropic models, auto-staging, NPSHa assessment, and motor sizing guidance. Engineering fixes applied: (1) Motor nameplate guidance unconditionally displayed for both centrifugal and PD pumps with correct API 610 Table 8 / API 674/676 margins (brake power × margin%; prior code always-true bug eliminated); (2) Compressor motor guidance unconditionally shown per API 617 §5.1.5.6 / API 618 §6.1.5 (110% × shaft power; prior logic fired when η_motor > 90.9% only); (3) Compressor trace: Polytropic Exponent and Polytropic Head steps suppressed in isentropic mode; (4) Gas power equation correctly labels η_is vs η_p by model; (5) Adiabatic efficiency added as explicit trace step with ASME PTC-10 / GPSA §13-2 formula; (6) Standard conditions ISO 13443 / GPSA §13 / API MPMS Ch.14.3 cited in assumptions; (7) Pump speed (rpm) added as optional user input for Ns calculation (HI 1.3); HI 1.3 cited in specific speed warning with "assumed" flag when defaulted.
- **Unit Management**: A robust unit system allows toggling between SI and Field units with in-place conversion across all calculators.
- **Piping Components Module**: Provides lookup tables for pipe dimensions, flanges, fittings, gaskets, valves, and olets, along with calculators for pipe flexibility and safe spans using IndexedDB for data persistence.
- **API 2000 Tank Venting**: A 6-tab wizard calculator comprehensively covers all 8 API 2000 venting scenarios, including normal and emergency venting, scenario applicability logic, and governing case identification.
- **Pipe Wall Thickness Calculator** (Rev B — engineering-issued): A 5-tab wizard calculator for pressure design of straight pipe per ASME B31.3:2022 §304.1.2 (process piping), B31.4:2019 §403.2.1 (liquid pipelines), and B31.8:2022 §841.11 (gas transmission). Implements temperature-interpolated allowable stress from B31.3 Table A-1, thick-wall Lamé equation check (§304.1.2(c)), ASME B36.10M schedule selection with pass/fail, MAOP back-calculation at corroded end-of-life, hoop stress utilisation, and MAOP margin flag. Material database covers ASTM A106 A/B/C, A333 Gr. 6, A312 TP304/316/316L, and API 5L grades B/X42/X52/X60/X65/X70/X80 (21 NPS sizes ½"–24" including 1-1/4", 3-1/2", 5"). Key engineering fixes: B31.4/B31.8 ERW E=0.80 (not 0.85, per B31.4 Table 403.2.1-1/B31.8 §841.11); Y coefficient boundary corrected to 566°C for Y=0.7 (per Table 304.1.1); separate QUALITY_FACTORS_PIPELINE constant for B31.4/B31.8 with PSL2 ERW option. Located at `/calculators/pipe-wall-thickness`, listed under Piping Components.
- **Standardized Engineering Basis**: A dedicated reference page (`/engineering-basis`) details all industry standards and calculation methods used throughout the suite, organized by discipline.
- **Safety Disclaimers**: Specific calculators (e.g., PRD/Flare Relief, Thermal Expansion Relief) feature prominent "Screening Tool Only" banners to emphasize their intended use.
- **Custom Numeric Input**: A custom `NumericInput` component ensures decimal-safe number entry across all calculator pages, preventing common React controlled input issues.
- **Restriction Orifice Engine (ISO 5167-2:2003)**: Full ISO 5167-2 Reader-Harris/Gallagher Cd (Eq.1, D-correction, Re-dependent terms), ISO 5167-2 Annex D permanent pressure loss fraction, ISO 5167-2 gas expansion factor Y, cavitation assessment (σ=(P₁−Pv)/ΔP vs σᵢ=2.7/σch=1.5 per ISA-RP75.23), API RP 14E erosional velocity (Ve=122/√ρ m/s), plate thickness Cd correction (thin/thick/short-tube regimes), geometric multi-stage pressure distribution (equal P₂/P₁ per stage), and straight-pipe L/D recommendations per ISO 5167-2 Table 3. Flags: CAVITATION_INCIPIENT, CAVITATION_SEVERE, EROSIONAL_VELOCITY_EXCEEDED, THICK_ORIFICE, LOW_REYNOLDS (17 total).

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

**How it works:** The Vite build compiles all React/TypeScript source code into pure HTML, CSS, and JavaScript files in the `dist/` folder. GitHub Pages then serves those static files — no server required. The source code is never pushed to GitHub Pages; only the compiled output is deployed.

### Automatic deployment (GitHub Actions — CONFIGURED)
The file `.github/workflows/deploy.yml` automates the full build-and-deploy pipeline:
1. Triggered on every push to the `main` branch
2. Builds the project with `npx vite build`
3. Deploys the `dist/` folder to GitHub Pages via the official `actions/deploy-pages` action

**One-time GitHub setup required:**
1. Go to the repository on GitHub → **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. Push the code (including `.github/workflows/deploy.yml`) to the `main` branch
4. GitHub Actions runs automatically — the site will be live at `https://hazemmancy.github.io`

### What the build produces (`dist/`)
- `dist/index.html` — pure HTML entry point (no React/TypeScript visible)
- `dist/404.html` — copy of index.html for SPA routing (any URL works)
- `dist/.nojekyll` — prevents GitHub Pages from running Jekyll processing
- `dist/assets/` — all compiled CSS and JavaScript chunks (plain `.css` and `.js` files)

### Base path note
The `vite.config.ts` uses no explicit `base` (defaults to `/`), which is correct for the user pages repo `hazemmancy.github.io`. If this were a project pages repo (e.g., `hazemmancy.github.io/project-name`), `base: '/project-name/'` would be needed.