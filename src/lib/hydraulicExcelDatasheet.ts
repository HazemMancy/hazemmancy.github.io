import * as XLSX from 'xlsx';

export interface HydraulicExcelData {
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
    fluidDensity: number;
    fluidViscosity: number;
    molecularWeight?: number;
    compressibilityZ?: number;

    // Results
    velocity: number;
    reynoldsNumber: number;
    flowRegime: string;
    frictionFactor: number;
    pressureDrop: number;
    pressureDropUnit: string;
    pressureDropPer100m: number;
    headLoss: number;
    erosionalVelocity: number;
    rhoVSquared: number;

    // Criteria
    sizingCriteria: {
        maxVelocity: number | null;
        maxPressureDropPer100m: number | null;
        maxRhoVSquared: number | null;
        serviceType: string;
    };

    // Status check
    status?: {
        velocity: 'ok' | 'warning' | 'na';
        pressureDrop: 'ok' | 'warning' | 'na';
        rhoVSquared: 'ok' | 'warning' | 'na';
    };
}

export const generateHydraulicExcelDatasheet = (data: HydraulicExcelData) => {
    const wb = XLSX.utils.book_new();

    // Create data array
    const wsData = [
        ['HYDRAULIC SIZING DATASHEET', '', '', ''],
        ['Generated', data.date, '', ''],
        ['', '', '', ''],

        // Project Info
        ['PROJECT INFORMATION', '', '', ''],
        ['Company', data.companyName || '-', '', ''],
        ['Project', data.projectName || '-', '', ''],
        ['Item No', data.itemNumber || '-', '', ''],
        ['Service', data.serviceName || '-', '', ''],
        ['Line Type', data.lineType.toUpperCase(), '', ''],
        ['Service Criteria', data.sizingCriteria.serviceType || '-', '', ''],
        ['', '', '', ''],

        // Pipe Data
        ['PIPE & PROCESS DATA', '', '', ''],
        ['Nominal Diameter', `${data.nominalDiameter} inch`, 'Pipe Length', `${data.pipeLength} ${data.lengthUnit}`],
        ['Schedule', data.schedule, 'Inside Diameter', `${data.insideDiameterMM.toFixed(2)} mm`],
        ['Material', data.pipeMaterial, 'Roughness', `${(data.roughness * 1000).toFixed(3)} mm`],
        ['', '', '', ''],

        // Process Inputs
        ['PROCESS CONDITIONS', '', '', ''],
        ['Flow Rate', `${data.flowRate} ${data.flowRateUnit}`, 'Inlet Pressure', data.inletPressure ? `${data.inletPressure} ${data.pressureUnit}` : '-'],
        ['Temperature', data.temperature ? `${data.temperature} °C` : '-', 'Fluid Density', `${data.fluidDensity.toFixed(2)} kg/m³`],
        ['Fluid Viscosity', `${data.fluidViscosity.toFixed(3)} cP`, '', ''],
    ];

    if (data.lineType === 'gas') {
        wsData.push(
            ['Molecular Weight', `${data.molecularWeight?.toFixed(2)} kg/kmol`, 'Compressibility (Z)', `${data.compressibilityZ?.toFixed(3)}`]
        );
    }

    wsData.push(
        ['', '', '', ''],
        ['CALCULATION RESULTS', '', '', ''],
        ['Parameter', 'Value', 'Limit / Criteria', 'Status'],
        ['Velocity', `${data.velocity.toFixed(2)} m/s`, data.sizingCriteria.maxVelocity ? `≤ ${data.sizingCriteria.maxVelocity.toFixed(1)} m/s` : '-',
            data.sizingCriteria.maxVelocity && data.velocity > data.sizingCriteria.maxVelocity ? 'WARNING' : 'OK'],

        ['Reynolds Number', data.reynoldsNumber.toFixed(0), '-', '-'],
        ['Flow Regime', data.flowRegime, '-', '-'],
        ['Friction Factor', data.frictionFactor.toFixed(5), '-', '-'],

        ['Pressure Drop (Total)', `${data.pressureDrop.toFixed(3)} ${data.pressureDropUnit}`, '-', '-'],
        ['Pressure Drop (per 100m)', `${data.pressureDropPer100m.toFixed(3)} bar/100m`,
            data.sizingCriteria.maxPressureDropPer100m ? `≤ ${data.sizingCriteria.maxPressureDropPer100m.toFixed(2)}` : '-',
            data.sizingCriteria.maxPressureDropPer100m && data.pressureDropPer100m > data.sizingCriteria.maxPressureDropPer100m ? 'WARNING' : 'OK'],

        ['ρv² (Rho-V-Squared)', `${data.rhoVSquared.toFixed(0)} kg/(m·s²)`,
            data.sizingCriteria.maxRhoVSquared ? `≤ ${data.sizingCriteria.maxRhoVSquared.toFixed(0)}` : '-',
            data.sizingCriteria.maxRhoVSquared && data.rhoVSquared > data.sizingCriteria.maxRhoVSquared ? 'WARNING' : 'OK'],

        ['Erosional Velocity (API 14E)', `${data.erosionalVelocity.toFixed(2)} m/s`, '-', '-']
    );

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [
        { wch: 25 }, // A
        { wch: 20 }, // B
        { wch: 20 }, // C
        { wch: 15 }, // D
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Datasheet');

    // Write file
    // Write to array buffer and save manually
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    saveBlob(blob, `hydraulic_sizing_${data.lineType}_${data.nominalDiameter}in_${new Date().toISOString().split('T')[0]}.xlsx`);
};

import { saveBlob } from './downloadUtils';
