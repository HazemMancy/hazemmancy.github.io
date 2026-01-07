import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface HydraulicDatasheetData {
    // Metadata
    companyName?: string;
    projectName?: string;
    itemNumber?: string;
    serviceName?: string;
    lineType: 'gas' | 'liquid' | 'mixed';
    date: string;

    // Inputs
    nominalDiameter: string;
    schedule: string;
    insideDiameterMM: number;
    pipeLength: string;
    lengthUnit: string;
    flowRate: string;
    flowRateUnit: string;
    inletPressure?: string;
    pressureUnit: string;
    temperature?: string;
    pipeMaterial: string;
    roughness: number;

    // Properties
    fluidDensity: number; // kg/m³
    fluidViscosity: number; // cP or similar
    molecularWeight?: number; // Gas only
    compressibilityZ?: number; // Gas only

    // Results
    velocity: number; // m/s
    reynoldsNumber: number;
    flowRegime: string;
    frictionFactor: number;
    pressureDrop: number; // in user unit
    pressureDropUnit: string;
    pressureDropPer100m: number; // in bar/100m (or user unit/100m)
    headLoss: number; // m
    erosionalVelocity: number; // m/s
    rhoVSquared: number; // kg/m·s²

    // Criteria checks
    sizingCriteria: {
        maxVelocity: number | null;
        maxPressureDropPer100m: number | null;
        maxRhoVSquared: number | null;
        serviceType: string;
    };

    // Status check
    status: {
        velocity: 'ok' | 'warning' | 'na';
        pressureDrop: 'ok' | 'warning' | 'na';
        rhoVSquared: 'ok' | 'warning' | 'na';
    };

}

export const generateHydraulicPDF = (data: HydraulicDatasheetData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.text('Hydraulic Sizing Datasheet', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Generated: ${data.date}`, pageWidth - 20, 30, { align: 'right' });

    // Project Info
    autoTable(doc, {
        startY: 35,
        head: [['Project Information', '']],
        body: [
            ['Company', data.companyName || '-'],
            ['Project', data.projectName || '-'],
            ['Item No', data.itemNumber || '-'],
            ['Service', data.serviceName || '-'],
            ['Line Type', data.lineType.toUpperCase()],
            ['Service Criteria', data.sizingCriteria.serviceType || '-'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    });

    // Input Data
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Pipe & Process Data', '']],
        body: [
            ['Nominal Diameter', `${data.nominalDiameter} inch`],
            ['Schedule', data.schedule],
            ['Inside Diameter', `${data.insideDiameterMM.toFixed(2)} mm`],
            ['Pipe Length', `${data.pipeLength} ${data.lengthUnit}`],
            ['Pipe Material', data.pipeMaterial],
            ['Roughness', `${(data.roughness * 1000).toFixed(3)} mm`], // convert m to mm
            ['Flow Rate', `${data.flowRate} ${data.flowRateUnit}`],
            ['Inlet Pressure', data.inletPressure ? `${data.inletPressure} ${data.pressureUnit}` : '-'],
            ['Temperature', data.temperature ? `${data.temperature} °C` : '-'],
            ['Fluid Density', `${data.fluidDensity.toFixed(2)} kg/m³`],
            ['Fluid Viscosity', `${data.fluidViscosity.toFixed(3)} cP`],
            ...(data.lineType === 'gas' ? [
                ['Molecular Weight', `${data.molecularWeight?.toFixed(2)} kg/kmol`],
                ['Compressibility (Z)', `${data.compressibilityZ?.toFixed(3)}`],
            ] : []),
        ],
        theme: 'grid',
        headStyles: { fillColor: [52, 73, 94] },
        styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    });

    // Calculation Results
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Results', 'Value', 'Limit / Criteria']],
        body: [
            ['Velocity', `${data.velocity.toFixed(2)} m/s`, data.sizingCriteria.maxVelocity ? `≤ ${data.sizingCriteria.maxVelocity.toFixed(1)} m/s` : '-'],
            ['Reynolds Number', data.reynoldsNumber.toFixed(0), '-'],
            ['Flow Regime', data.flowRegime, '-'],
            ['Friction Factor', data.frictionFactor.toFixed(5), '-'],
            ['Pressure Drop (Total)', `${data.pressureDrop.toFixed(3)} ${data.pressureDropUnit}`, '-'],
            ['Pressure Drop (per 100m)', `${data.pressureDropPer100m.toFixed(3)} bar/100m`, data.sizingCriteria.maxPressureDropPer100m ? `≤ ${data.sizingCriteria.maxPressureDropPer100m.toFixed(2)}` : '-'],
            ['ρv² (Rho-V-Squared)', `${data.rhoVSquared.toFixed(0)} kg/(m·s²)`, data.sizingCriteria.maxRhoVSquared ? `≤ ${data.sizingCriteria.maxRhoVSquared.toFixed(0)}` : '-'],
            ['Erosional Velocity (API 14E)', `${data.erosionalVelocity.toFixed(2)} m/s`, '-'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [39, 174, 96] },
        styles: { fontSize: 9 },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        doc.text('Calculated using Engineering Toolkit', pageWidth - 20, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    }

    // Generate Blob and save manually
    const blob = doc.output('blob');
    saveBlob(blob, `hydraulic_sizing_${data.lineType}_${data.nominalDiameter}in.pdf`);
};

import { saveBlob } from './downloadUtils';
