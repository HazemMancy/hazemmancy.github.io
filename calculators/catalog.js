/* Single source of truth for the calculator list.
   Used by calculators/index.html (full list) and index.html (live-tool count and preview).
   href is relative to the calculators/ folder. status: 'live' | 'wip'. */
window.CALCULATORS = [
  // HYDRAULICS
  { title:'Single Phase Liquid Hydraulics',            cat:'Hydraulics', icon:'droplets',        standard:'Darcy-Weisbach · Swamee-Jain · fittings K-losses · service checks', status:'live', href:'liquid-hydraulics.html' },
  { title:'Single Phase Gas Hydraulics',               cat:'Hydraulics', icon:'wind',            standard:'Darcy-Weisbach · Swamee-Jain · real-gas density · fittings K-losses', status:'live', href:'gas-hydraulics.html' },
  { title:'Mixed-Phase Line Sizing',                   cat:'Hydraulics', icon:'blend',           standard:'Friedel · Chisholm-Baroczy · Lockhart-Martinelli · Beggs & Brill',  status:'live', href:'mixed-phase-hydraulics.html' },
  { title:'Surge Pressure',                            cat:'Hydraulics', icon:'waves',           standard:'Joukowsky equation · wave celerity · allowable surge screening',     status:'live', href:'surge-pressure.html' },
  // FLUID PROPERTIES
  { title:'Gas Mixing',                                cat:'Fluids',     icon:'blend',           standard:'Mole fraction weighted MW · PR/SRK/Generalized Z · auto-normalisation', status:'live', href:'gas-mixing.html' },
  { title:'Gas Volume Conversion',                     cat:'Fluids',     icon:'arrow-left-right',standard:'Real gas · Z-factor correction · standard/actual volume conversion', status:'live', href:'gas-volume.html' },
  { title:'Settle-Out Pressure & Temperature',         cat:'Fluids',     icon:'thermometer',     standard:'Closed system equalisation',                     status:'wip' },
  { title:'Hydrate Inhibitor Requirements',            cat:'Fluids',     icon:'snowflake',       standard:'Hammerschmidt equation · MEG / MeOH dosing',      status:'wip' },
  { title:'Units of Measure Conversions',              cat:'Fluids',     icon:'arrow-left-right',standard:'Engineering unit conversion reference',           status:'wip' },
  { title:'CO₂ Corrosion Rate Calculation (NORSOK M506)',cat:'Fluids', icon:'zap',            standard:'NORSOK Std. M506 (2005)',                        status:'wip' },
  // EQUIPMENT
  { title:'Pump Sizing',                                cat:'Equipment',  icon:'gauge',           standard:'Head · NPSHa · hydraulic and shaft power · shut-off screening',      status:'live', href:'pump-sizing.html' },
  { title:'Horizontal 2-Phase Separator Tool',         cat:'Equipment',  icon:'container',       standard:'Gas-liquid settling · demister checks · holdup/surge · nozzle screening', status:'live', href:'horizontal-2-phase-separator.html' },
  { title:'Horizontal 3-Phase Separator Tool',         cat:'Equipment',  icon:'container',       standard:'Gas-liquid settling · oil-water separation · weir/boot/standpipe · nozzle screening', status:'live', href:'horizontal-3-phase-separator.html' },
  { title:'Vertical 2-Phase Separator Tool',           cat:'Equipment',  icon:'container',       standard:'API 12J · droplet settling',                     status:'wip' },
  { title:'Separator Sizing Calculation Sheets',       cat:'Equipment',  icon:'clipboard-list',  standard:'API 12J · gas and liquid capacity checks',       status:'wip' },
  { title:'Minimum Inlet Separator Pressure',          cat:'Equipment',  icon:'gauge',           standard:'Two-phase inlet flashing determination',         status:'wip' },
  { title:'Shell & Tube H.EX. Preliminary Sizing',     cat:'Equipment',  icon:'thermometer',     standard:'LMTD · F-factor correction · TEMA fouling',       status:'wip' },
  { title:'Preliminary Sizing of Air Cooled Heat Exchanger',cat:'Equipment',icon:'wind',         standard:'LMTD · air-side duty estimation',                status:'wip' },
  { title:'Kettle Type Reboiler Hydraulic Calculation',cat:'Equipment',  icon:'thermometer',     standard:'Two-phase thermosiphon / kettle circuit',        status:'wip' },
  { title:'Hot Oil System Expansion Vessel Sizing',    cat:'Equipment',  icon:'thermometer',     standard:'Thermal expansion volume calculation',           status:'wip' },
  { title:'Process Tank Sizing',                       cat:'Equipment',  icon:'container',       standard:'Retention time · holdup volume',                 status:'wip' },
  { title:'Total, Partial Volume & Wetted Area — Vertical & Horizontal Vessels', cat:'Equipment', icon:'container', standard:'Vertical & horizontal vessels — partial fill', status:'wip' },
  { title:'Vessel Heat Loss',                          cat:'Equipment',  icon:'thermometer',     standard:'Conduction / convection / radiation losses',     status:'wip' },
  // PIPING
  { title:'Orifice Sizing',                            cat:'Piping',     icon:'circle-dot',      standard:'AS 2360.1.1 · concentric square-edged orifice · β ratio · expansibility checks', status:'live', href:'orifice.html' },
  { title:'Pipe Heat Loss',                            cat:'Piping',     icon:'thermometer',     standard:'Conduction / convection losses per unit length',  status:'wip' },
  { title:'Insulation Thickness Verification',         cat:'Piping',     icon:'layers',          standard:'Heat loss limit · economic insulation thickness',  status:'wip' },
  { title:'Blowdown Orifice Sizing',                   cat:'Piping',     icon:'circle-dot',      standard:'Critical vapour flow · thick-orifice correction · critical pressure check', status:'live', href:'bd-orifice.html' },
  // RELIEF
  { title:'PSV Relief Sizing Tool',                    cat:'Relief',     icon:'shield',          standard:'API 520 · gas / liquid / steam / two-phase',     status:'wip' },
  { title:'PSV Gas Expansion Fire Case',               cat:'Relief',     icon:'flame',           standard:'API 521 fire case · gas-filled vessels',         status:'wip' },
  { title:'Pressure Safety Valve Sizing — Supercritical Fluids', cat:'Relief', icon:'shield', standard:'API 520 · supercritical region correction',      status:'wip' },
  { title:'Design of Liquid, Vapor & Two-Phase Relieving Valve', cat:'Relief', icon:'shield',    standard:'API 520 · all fluid phases',                     status:'wip' },
  { title:'Relief Valve Sizing',                       cat:'Relief',     icon:'shield',          standard:'API 520 · orifice area calculation',             status:'wip' },
  { title:'Atmospheric & Low Pressure Tank Venting (API 2000)', cat:'Relief', icon:'cloud-rain', standard:'API 2000 5th Ed. · normal & emergency venting',   status:'wip' },
  { title:'Flare Stack Sizing',                        cat:'Relief',     icon:'flame',           standard:'API 521 · radiation / dispersion',               status:'wip' },
  { title:'Flare System Purge Gas Estimate (API 521)', cat:'Relief',     icon:'flame',           standard:'API 521 · purge rate calculation',               status:'wip' },
  { title:'Flare Noise Prediction',                    cat:'Relief',     icon:'volume-2',        standard:'Combustion noise estimation',                    status:'wip' },
  { title:'Gas Dispersion from Vents & Flares',        cat:'Relief',     icon:'wind',            standard:'Dispersion modelling — passive release',         status:'wip' },
  // OTHER
  { title:'Cost Estimation',                           cat:'Other',      icon:'chart-column',    standard:'Factored estimate — CAPEX screening',            status:'wip' },
];
