import { utils, writeFile } from 'xlsx';

export interface CompressorExcelData {
    // Metadata
    companyName?: string;
    projectName?: string;
    itemNumber?: string;
    serviceName?: string;
    date: string;

    // Inputs
    gasType: string;
    molecularWeight: number;
    specificHeatRatio: number;
    compressibilityFactor: number;

    inletPressure: number;
    inletTemperature: number;
    dischargePressure: number;
    flowRate: number;

    flowUnit: string;
    pressureUnit: string;
    tempUnit: string;
    standardCondition: string;

    compressorType: string;
    numberOfStages: number;
    isentropicEfficiency: number;
    polytropicEfficiency: number;
    mechanicalEfficiency: number;
    motorEfficiency: number;

    // Results
    compressionRatio: number;
    ratioPerStage: number;
    dischargeTemp: number;

    isentropicPower: number;
    polytropicPower: number;
    shaftPower: number;
    motorPower: number;
    specificPower: number;

    isentropicHead: number;
    polytropicHead: number;

    actualFlow: number;
    massFlow: number;

    schultzFactor: number;
    polytropicExponent: number;

    // Status
    warnings: string[];
}

export const generateCompressorExcelDatasheet = (data: CompressorExcelData) => {
    // Create workbook
    const wb = utils.book_new();

    // Prepare data rows
    const wsData = [
        ['COMPRESSOR POWER DATASHEET'],
        ['Generated', data.date],
        [],
        ['PROJECT INFORMATION'],
        ['Company', data.companyName || '-'],
        ['Project', data.projectName || '-'],
        ['Item No', data.itemNumber || '-'],
        ['Service', data.serviceName || '-'],
        [],
        ['PROCESS CONDITIONS'],
        ['Gas Name', data.gasType],
        ['Molecular Weight', data.molecularWeight],
        ['Specific Heat Ratio (k)', data.specificHeatRatio],
        ['Compressibility (Z)', data.compressibilityFactor],
        ['Inlet Pressure', data.inletPressure, data.pressureUnit],
        ['Inlet Temperature', data.inletTemperature, data.tempUnit],
        ['Discharge Pressure', data.dischargePressure, data.pressureUnit],
        ['Flow Rate', data.flowRate, data.flowUnit],
        ['Standard Conditions', data.standardCondition],
        [],
        ['MACHINE CONFIGURATION'],
        ['Compressor Type', data.compressorType],
        ['Number of Stages', data.numberOfStages],
        ['Isentropic Efficiency %', data.isentropicEfficiency],
        ['Polytropic Efficiency %', data.polytropicEfficiency],
        ['Mechanical Efficiency %', data.mechanicalEfficiency],
        ['Motor Efficiency %', data.motorEfficiency],
        [],
        ['CALCULATION RESULTS'],
        ['Compression Ratio (Total)', data.compressionRatio],
        ['Ratio Per Stage', data.ratioPerStage],
        ['Discharge Temperature (°C)', data.dischargeTemp],
        ['Isentropic Head (kJ/kg)', data.isentropicHead],
        ['Polytropic Head (kJ/kg)', data.polytropicHead],
        ['Isentropic Power (kW)', data.isentropicPower],
        ['Polytropic Power (kW)', data.polytropicPower],
        ['Shaft Power (kW)', data.shaftPower],
        ['Motor Power (kW)', data.motorPower],
        ['Specific Power (kW/100m3)', data.specificPower],
        ['Actual Inlet Flow (m3/h)', data.actualFlow],
        ['Mass Flow (kg/h)', data.massFlow],
        ['Polytropic Exponent (n)', data.polytropicExponent],
        ['Schultz Factor (f)', data.schultzFactor],
        [],
        ['WARNINGS / REMARKS'],
        ...data.warnings.map(w => [w]),
    ];

    // Create worksheet
    const ws = utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
        { wch: 25 }, // Label
        { wch: 20 }, // Value
        { wch: 15 }, // Unit
    ];

    // Add worksheet to workbook
    utils.book_append_sheet(wb, ws, 'Datasheet');

    // Save file
    writeFile(wb, 'compressor_datasheet.xlsx');
};
