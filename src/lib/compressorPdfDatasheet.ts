import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface CompressorDatasheetData {
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

export const generateCompressorPDF = (data: CompressorDatasheetData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.text('Compressor Power Datasheet', pageWidth / 2, 20, { align: 'center' });

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
            ['Compressor Type', data.compressorType.toUpperCase()],
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold', width: 60 } },
    });

    // Gas & Process Data
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Process Conditions', 'Value', 'Gas Properties', 'Value']],
        body: [
            ['Inlet Pressure', `${data.inletPressure} ${data.pressureUnit}`, 'Gas Name', data.gasType],
            ['Discharge Pressure', `${data.dischargePressure} ${data.pressureUnit}`, 'Molecular Weight', `${data.molecularWeight.toFixed(2)} kg/kmol`],
            ['Inlet Temperature', `${data.inletTemperature} ${data.tempUnit}`, 'Specific Heat Ratio (k)', data.specificHeatRatio.toFixed(3)],
            ['Flow Rate', `${data.flowRate} ${data.flowUnit}`, 'Compressibility (Z)', data.compressibilityFactor.toFixed(3)],
            ['Standard Cond.', data.standardCondition, '', ''],
        ],
        theme: 'grid',
        headStyles: { fillColor: [52, 73, 94] },
        styles: { fontSize: 9 },
    });

    // Machine Data
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Machine Configuration', '']],
        body: [
            ['Compressor Type', data.compressorType],
            ['Number of Stages', data.numberOfStages.toString()],
            ['Isentropic Efficiency', `${data.isentropicEfficiency}%`],
            ['Polytropic Efficiency', `${data.polytropicEfficiency}%`],
            ['Mechanical Efficiency', `${data.mechanicalEfficiency}%`],
            ['Motor Efficiency', `${data.motorEfficiency}%`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [52, 73, 94] },
        styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold', width: 60 } },
    });

    // Calculation Results
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Results', 'Value', 'Results', 'Value']],
        body: [
            ['Compression Ratio', data.compressionRatio.toFixed(2), 'Motor Power', `${data.motorPower.toFixed(1)} kW`],
            ['Ratio Per Stage', data.ratioPerStage.toFixed(2), 'Shaft Power', `${data.shaftPower.toFixed(1)} kW`],
            ['Discharge Temp', `${data.dischargeTemp.toFixed(1)} °C`, 'Gas Power (Poly)', `${data.polytropicPower.toFixed(1)} kW`],
            ['Isentropic Head', `${data.isentropicHead.toFixed(1)} kJ/kg`, 'Specific Power', `${data.specificPower.toFixed(2)} kW/100m³/h`],
            ['Polytropic Head', `${data.polytropicHead.toFixed(1)} kJ/kg`, 'Actual Inlet Flow', `${data.actualFlow.toFixed(1)} m³/h`],
            ['Polytropic Exp (n)', data.polytropicExponent.toFixed(3), 'Mass Flow', `${data.massFlow.toFixed(1)} kg/h`],
            ['Schultz Factor (f)', data.schultzFactor.toFixed(4), '', ''],
        ],
        theme: 'striped',
        headStyles: { fillColor: [39, 174, 96] },
        styles: { fontSize: 9 },
    });

    // Warnings
    if (data.warnings && data.warnings.length > 0) {
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [['Design Warnings / Remarks']],
            body: data.warnings.map(w => [w]),
            theme: 'grid',
            headStyles: { fillColor: [231, 76, 60] },
            styles: { fontSize: 9, textColor: [192, 57, 43] },
        });
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        doc.text('Calculated using Engineering Toolkit', pageWidth - 20, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    }

    doc.save('compressor_datasheet.pdf');
};
