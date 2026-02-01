import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Helper to apply autoTable
const applyAutoTable = (doc: jsPDF, options: any) => {
    autoTable(doc, options);
    return doc;
};

export interface PumpDatasheetData {
    // Metadata
    title: string;
    companyName: string;
    projectName: string;
    itemNumber: string;
    service: string;
    date: string;

    // Units
    unitSystem: string;

    // Data points
    flowRate: string;
    flowUnit: string;
    head: string;
    headUnit: string;

    // Liquid
    liquidName: string;
    temp: string;
    density: string;
    densityUnit: string;
    viscosity: string;
    viscosityUnit: string;
    vaporPressure: string;
    vaporPressureUnit: string;

    // Pump
    type: string;
    standard: string;
    efficiency: string;
    motorEfficiency: string;

    // Calculated Results
    suctionPress: string;
    suctionPressUnit: string;
    dischargePress: string;
    dischargePressUnit: string;

    tdh: string;
    tdhUnit: string;

    npsha: string;
    npshaMargin: string;
    npshaUnit: string;

    hydPower: string;
    brakePower: string;
    motorPower: string;
    powerUnit: string;

    suctionVel: string;
    dischargeVel: string;
    velUnit: string;
}

export const generatePumpPDF = (data: PumpDatasheetData): void => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // -- Header --
    doc.setFillColor(41, 128, 185); // Blue header
    doc.rect(0, 0, pageWidth, 25, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("PUMP PROCESS DATASHEET", 15, 12);
    doc.setFontSize(10);
    doc.text(`Standard: ${data.standard} | Type: ${data.type}`, 15, 20);

    doc.setFontSize(10);
    doc.text(data.companyName, pageWidth - 15, 10, { align: "right" });
    doc.text(`Project: ${data.projectName}`, pageWidth - 15, 16, { align: "right" });
    doc.text(`Date: ${data.date}`, pageWidth - 15, 22, { align: "right" });

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);

    // -- Section 1: General Info --
    let yPos = 35;

    doc.setDrawColor(200, 200, 200);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 10;

    doc.setFont("helvetica", "bold");
    doc.text("1. GENERAL INFORMATION", 15, yPos - 3);
    doc.setFont("helvetica", "normal");

    const generalData = [
        ["Item No.", data.itemNumber, "Service", data.service],
        ["Pump Type", data.type, "Standard", data.standard],
        ["Unit System", data.unitSystem, "Revision", "A"],
    ];

    autoTable(doc, {
        startY: yPos,
        head: [],
        body: generalData,
        theme: "plain",
        styles: { cellPadding: 1, fontSize: 9 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 35 }, 1: { cellWidth: 55 }, 2: { fontStyle: "bold", cellWidth: 35 } },
        margin: { left: 15 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // -- Section 2: Operating Conditions --
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.text("2. OPERATING CONDITIONS", 15, yPos - 3);

    const processData = [
        ["Liquid", data.liquidName, "Temperature", `${data.temp} °C`],
        ["Density", `${data.density} ${data.densityUnit}`, "Viscosity", `${data.viscosity} ${data.viscosityUnit}`],
        ["Vapor Pressure", `${data.vaporPressure} ${data.vaporPressureUnit}`, "Flow Rate", `${data.flowRate} ${data.flowUnit}`],
    ];

    autoTable(doc, {
        startY: yPos,
        body: processData,
        theme: "striped",
        styles: { cellPadding: 2, fontSize: 9 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 35 }, 1: { cellWidth: 55 }, 2: { fontStyle: "bold", cellWidth: 35 } },
        margin: { left: 15 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // -- Section 3: Performance & Hydraulic Data --
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.text("3. PERFORMANCE DATA", 15, yPos - 3);

    const hydraulicsData = [
        ["Total Dynamic Head", `${data.tdh} ${data.tdhUnit}`, "Hydraulic Power", `${data.hydPower} ${data.powerUnit}`],
        ["Suction Pressure", `${data.suctionPress} ${data.suctionPressUnit}`, "Brake Power", `${data.brakePower} ${data.powerUnit}`],
        ["Discharge Pressure", `${data.dischargePress} ${data.dischargePressUnit}`, "Motor Power (Est.)", `${data.motorPower} ${data.powerUnit}`],
        ["NPSH Available", `${data.npsha} ${data.npshaUnit}`, "Pump Efficiency", `${data.efficiency}%`],
        ["Suction Velocity", `${data.suctionVel} ${data.velUnit}`, "Motor Efficiency", `${data.motorEfficiency}%`],
        ["Discharge Velocity", `${data.dischargeVel} ${data.velUnit}`, "", ""],
    ];

    autoTable(doc, {
        startY: yPos,
        body: hydraulicsData,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { cellPadding: 2, fontSize: 9 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 40 }, 1: { cellWidth: 50 }, 2: { fontStyle: "bold", cellWidth: 40 } },
        margin: { left: 15 },
    });

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generated locally by Pump Sizing Utility - Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    }

    doc.save(`Pump_Datasheet_${data.itemNumber}.pdf`);
};
