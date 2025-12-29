/**
 * Heat Exchanger Datasheet PDF Generator
 * Generates professional API/TEMA style datasheets
 */

import jsPDF from 'jspdf';

export interface DatasheetData {
  // General
  projectName: string;
  itemNumber: string;
  date: string;
  
  // Process Data
  hotFluid: {
    name: string;
    inletTemp: number;
    outletTemp: number;
    flowRate: number;
    density: number;
    viscosity: number;
    specificHeat: number;
    thermalConductivity: number;
    prandtl: number;
    foulingFactor: number;
  };
  coldFluid: {
    name: string;
    inletTemp: number;
    outletTemp: number;
    flowRate: number;
    density: number;
    viscosity: number;
    specificHeat: number;
    thermalConductivity: number;
    prandtl: number;
    foulingFactor: number;
  };
  
  // Performance
  heatDuty: number;
  lmtd: number;
  correctionFactor: number;
  effectiveLmtd: number;
  overallU: number;
  calculatedU: number;
  requiredArea: number;
  ntu: number;
  effectiveness: number;
  
  // Heat Transfer Coefficients
  hi: number;
  ho: number;
  tubeNusselt: number;
  shellNusselt: number;
  
  // Geometry
  shellDiameter: number;
  shellLength: number;
  tubeOD: number;
  tubeWallThickness: number;
  tubeLength: number;
  numberOfTubes: number;
  tubePitch: number;
  tubePattern: string;
  tubePasses: number;
  baffleSpacing: number;
  baffleCut: number;
  numberOfBaffles: number;
  tubeMaterial: string;
  
  // Pressure Drop
  tubeSidePressureDrop: number;
  shellSidePressureDrop: number;
  tubeSideVelocity: number;
  shellSideVelocity: number;
  tubeReynolds: number;
  shellReynolds: number;
  
  // Vibration
  naturalFrequency: number;
  vortexFrequency: number;
  criticalVelocity: number;
  vibrationStatus: string;
  
  // ASME
  shellThickness?: number;
  headThickness?: number;
  tubesheetThickness?: number;
  flangeClass?: string;
  designPressure?: number;
  designTemperature?: number;
  hydroTestPressure?: number;
  shellMaterial?: string;
  
  // Method
  shellSideMethod: string;
  tempUnit: string;
}

export function generateDatasheetPDF(data: DatasheetData): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Helper functions
  const addHeader = (text: string) => {
    doc.setFillColor(30, 40, 60);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin + 3, y + 5.5);
    doc.setTextColor(0, 0, 0);
    y += 10;
  };

  const addRow = (label: string, value: string, label2?: string, value2?: string) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    if (label2 && value2) {
      // Two column row
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin + 2, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 45, y + 4);
      
      doc.setFont('helvetica', 'bold');
      doc.text(label2, margin + 95, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.text(value2, margin + 138, y + 4);
    } else {
      // Single row
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin + 2, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 60, y + 4);
    }
    
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y + 6, margin + contentWidth, y + 6);
    y += 7;
  };

  const checkPageBreak = (needed: number) => {
    if (y + needed > 280) {
      doc.addPage();
      y = margin;
    }
  };

  // ===== Title Block =====
  doc.setFillColor(42, 85, 55);
  doc.rect(margin, y, contentWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SHELL & TUBE HEAT EXCHANGER DATASHEET', pageWidth / 2, y + 8, { align: 'center' });
  doc.setFontSize(10);
  doc.text('API 660 / TEMA Standards', pageWidth / 2, y + 15, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 25;

  // Project Info
  addRow('Project:', data.projectName, 'Item No.:', data.itemNumber);
  addRow('Date:', data.date, 'Shell-Side Method:', data.shellSideMethod);
  y += 3;

  // ===== Process Conditions =====
  checkPageBreak(60);
  addHeader('PROCESS CONDITIONS');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('', margin + 2, y + 4);
  doc.text('SHELL SIDE (HOT)', margin + 60, y + 4);
  doc.text('TUBE SIDE (COLD)', margin + 120, y + 4);
  doc.line(margin, y + 6, margin + contentWidth, y + 6);
  y += 8;

  const unit = data.tempUnit;
  const addProcessRow = (label: string, hot: string, cold: string) => {
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin + 2, y + 4);
    doc.text(hot, margin + 60, y + 4);
    doc.text(cold, margin + 120, y + 4);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y + 6, margin + contentWidth, y + 6);
    y += 7;
  };

  addProcessRow('Fluid', data.hotFluid.name, data.coldFluid.name);
  addProcessRow(`Inlet Temperature (${unit})`, data.hotFluid.inletTemp.toFixed(1), data.coldFluid.inletTemp.toFixed(1));
  addProcessRow(`Outlet Temperature (${unit})`, data.hotFluid.outletTemp.toFixed(1), data.coldFluid.outletTemp.toFixed(1));
  addProcessRow('Flow Rate (kg/hr)', data.hotFluid.flowRate.toFixed(0), data.coldFluid.flowRate.toFixed(0));
  addProcessRow('Density (kg/m³)', data.hotFluid.density.toFixed(1), data.coldFluid.density.toFixed(1));
  addProcessRow('Viscosity (cP)', data.hotFluid.viscosity.toFixed(3), data.coldFluid.viscosity.toFixed(3));
  addProcessRow('Specific Heat (kJ/kg·K)', data.hotFluid.specificHeat.toFixed(3), data.coldFluid.specificHeat.toFixed(3));
  addProcessRow('Thermal Cond. (W/m·K)', data.hotFluid.thermalConductivity.toFixed(4), data.coldFluid.thermalConductivity.toFixed(4));
  addProcessRow('Prandtl Number', data.hotFluid.prandtl.toFixed(2), data.coldFluid.prandtl.toFixed(2));
  addProcessRow('Fouling (m²·K/W)', data.hotFluid.foulingFactor.toFixed(5), data.coldFluid.foulingFactor.toFixed(5));
  y += 3;

  // ===== Performance =====
  checkPageBreak(50);
  addHeader('THERMAL PERFORMANCE');
  
  addRow('Heat Duty (kW):', data.heatDuty.toFixed(2), 'LMTD:', `${data.lmtd.toFixed(2)} ${unit}`);
  addRow('Correction Factor (F):', data.correctionFactor.toFixed(3), 'Effective LMTD:', `${data.effectiveLmtd.toFixed(2)} ${unit}`);
  addRow('Overall U Given (W/m²·K):', data.overallU.toFixed(1), 'Calculated U (W/m²·K):', data.calculatedU.toFixed(1));
  addRow('Required Area (m²):', data.requiredArea.toFixed(2), 'NTU:', data.ntu.toFixed(3));
  addRow('Effectiveness (%):', (data.effectiveness * 100).toFixed(1), '', '');
  y += 3;

  // ===== Heat Transfer Coefficients =====
  checkPageBreak(35);
  addHeader('HEAT TRANSFER COEFFICIENTS');
  
  addRow('Tube-Side hi (W/m²·K):', data.hi.toFixed(1), 'Tube Nusselt:', data.tubeNusselt.toFixed(1));
  addRow('Shell-Side ho (W/m²·K):', data.ho.toFixed(1), 'Shell Nusselt:', data.shellNusselt.toFixed(1));
  y += 3;

  // ===== Construction =====
  checkPageBreak(60);
  addHeader('CONSTRUCTION');
  
  addRow('Shell ID (mm):', data.shellDiameter.toFixed(0), 'Tube OD (mm):', data.tubeOD.toFixed(2));
  addRow('Shell Length (m):', data.shellLength.toFixed(2), 'Tube Wall (mm):', data.tubeWallThickness.toFixed(2));
  addRow('Tube Length (m):', data.tubeLength.toFixed(2), 'Number of Tubes:', data.numberOfTubes.toString());
  addRow('Tube Pitch (mm):', data.tubePitch.toFixed(1), 'Tube Pattern:', data.tubePattern);
  addRow('Tube Passes:', data.tubePasses.toString(), 'Tube Material:', data.tubeMaterial);
  addRow('Baffle Spacing (mm):', data.baffleSpacing.toFixed(0), 'Number of Baffles:', data.numberOfBaffles.toString());
  addRow('Baffle Cut (%):', data.baffleCut.toFixed(0), '', '');
  y += 3;

  // ===== Pressure Drop =====
  checkPageBreak(40);
  addHeader('PRESSURE DROP');
  
  addRow('Tube-Side ΔP (kPa):', data.tubeSidePressureDrop.toFixed(2), 'Shell-Side ΔP (kPa):', data.shellSidePressureDrop.toFixed(2));
  addRow('Tube Velocity (m/s):', data.tubeSideVelocity.toFixed(2), 'Shell Velocity (m/s):', data.shellSideVelocity.toFixed(2));
  addRow('Tube Reynolds:', data.tubeReynolds.toFixed(0), 'Shell Reynolds:', data.shellReynolds.toFixed(0));
  y += 3;

  // ===== Vibration =====
  checkPageBreak(35);
  addHeader('VIBRATION ANALYSIS (TEMA)');
  
  addRow('Natural Frequency (Hz):', data.naturalFrequency.toFixed(1), 'Vortex Frequency (Hz):', data.vortexFrequency.toFixed(1));
  addRow('Critical Velocity (m/s):', data.criticalVelocity.toFixed(2), 'Status:', data.vibrationStatus);
  y += 3;

  // ===== ASME (if available) =====
  if (data.shellThickness) {
    checkPageBreak(50);
    addHeader('MECHANICAL DESIGN (ASME VIII Div.1)');
    
    addRow('Design Pressure (MPa):', data.designPressure?.toFixed(2) || 'N/A', 'Design Temperature (°C):', data.designTemperature?.toFixed(0) || 'N/A');
    addRow('Shell Thickness (mm):', data.shellThickness.toFixed(1), 'Shell Material:', data.shellMaterial || 'N/A');
    addRow('Head Thickness (mm):', data.headThickness?.toFixed(1) || 'N/A', 'Tubesheet Thickness (mm):', data.tubesheetThickness?.toFixed(1) || 'N/A');
    addRow('Flange Class:', data.flangeClass || 'N/A', 'Hydro Test (MPa):', data.hydroTestPressure?.toFixed(2) || 'N/A');
  }

  // ===== Footer =====
  y = 280;
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('Generated by Heat Exchanger Sizing Calculator | TEMA/API Standards', pageWidth / 2, y, { align: 'center' });
  doc.text(`Page 1 of 1 | ${data.date}`, pageWidth / 2, y + 4, { align: 'center' });

  // Save PDF
  const filename = `HX_Datasheet_${data.itemNumber.replace(/\s/g, '_')}_${data.date.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}
