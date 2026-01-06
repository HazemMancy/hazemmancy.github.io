
import * as XLSX from "xlsx";

export interface PumpExcelData {
    // Metadata
    pdfTitle: string;
    companyName: string;
    projectName: string;
    itemNumber: string;
    service: string;
    date: string;

    // General
    unitSystem: string;

    // Design Conditions
    flowRate: string;
    flowRateUnit: string;
    head: string;
    headUnit: string;
    temperature: string;

    // Liquid Properties
    liquid: string;
    density: string;
    densityUnit: string;
    viscosity: string;
    viscosityUnit: string;
    vaporPressure: string;
    vaporPressureUnit: string;

    // Pump Details
    pumpType: string;
    standard: string;
    efficiency: string;
    motorEfficiency: string;

    // Results
    hydraulicPower: string;
    brakePower: string;
    motorPower: string;
    powerUnit: string;
    npsha: string;
    npshaMargin: string;
    npshaUnit: string;

    // Hydraulics
    suctionPressure: string;
    suctionPressureUnit: string;
    dischargePressure: string;
    dischargePressureUnit: string;
    totalHead: string;
    totalHeadUnit: string;
    suctionVelocity: string;
    dischargeVelocity: string;
    velocityUnit: string;
}

export const generatePumpExcelDatasheet = (data: PumpExcelData): void => {
    const wb = XLSX.utils.book_new();

    // --- SHEET 1: PROCESS DATA ---
    const wsProcessData = [
        ["Pump Process Datasheet", "", "", ""],
        ["", "", "", ""],
        ["Project Info", "", "Service Conditions", ""],
        ["Company:", data.companyName, "Liquid:", data.liquid],
        ["Project:", data.projectName, "Temperature:", `${data.temperature} °C`],
        ["Item No:", data.itemNumber, "Density:", `${data.density} ${data.densityUnit}`],
        ["Service:", data.service, "Viscosity:", `${data.viscosity} ${data.viscosityUnit}`],
        ["Date:", data.date, "Vapor Pressure:", `${data.vaporPressure} ${data.vaporPressureUnit}`],
        ["", "", "", ""],
        ["Operating Conditions", "", "Performance Requirements", ""],
        ["Capacity (Norm):", `${data.flowRate} ${data.flowRateUnit}`, "Rated Head:", `${data.head} ${data.headUnit}`],
        ["Suction Pressure:", `${data.suctionPressure} ${data.suctionPressureUnit}`, "NPSHa:", `${data.npsha} ${data.npshaUnit}`],
        ["Discharge Pressure:", `${data.dischargePressure} ${data.dischargePressureUnit}`, "Hydraulic Power:", `${data.hydraulicPower} ${data.powerUnit}`],
        ["Differential Head:", `${data.totalHead} ${data.totalHeadUnit}`, "Brake Power:", `${data.brakePower} ${data.powerUnit}`],
        ["", "", "", ""],
        ["Pump Construction", "", "", ""],
        ["Type:", data.pumpType, "Standard:", data.standard],
        ["Est. Efficiency:", `${data.efficiency}%`, "Driver Efficiency:", `${data.motorEfficiency}%`],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(wsProcessData);

    // Formatting widths
    ws1["!cols"] = [{ wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, ws1, "Process Data");

    // --- SHEET 2: CALCULATIONS ---
    // A more detailed technical sheet
    const wsCalcData = [
        ["Detailed Hydraulic Calculations", "", ""],
        ["Parameter", "Value", "Unit"],
        ["", "", ""],
        ["Flow Rate", data.flowRate, data.flowRateUnit],
        ["Fluid Density", data.density, data.densityUnit],
        ["Fluid Viscosity", data.viscosity, data.viscosityUnit],
        ["", "", ""],
        ["Suction Side", "", ""],
        ["Pressure", data.suctionPressure, data.suctionPressureUnit],
        ["Velocity", data.suctionVelocity, data.velocityUnit],
        ["", "", ""],
        ["Discharge Side", "", ""],
        ["Pressure", data.dischargePressure, data.dischargePressureUnit],
        ["Velocity", data.dischargeVelocity, data.velocityUnit],
        ["", "", ""],
        ["Total Dynamic Head", data.totalHead, data.totalHeadUnit],
        ["NPSH Available", data.npsha, data.npshaUnit],
        ["NPSH Required Margin", data.npshaMargin, data.npshaUnit],
    ];

    const ws2 = XLSX.utils.aoa_to_sheet(wsCalcData);
    ws2["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 10 }];

    XLSX.utils.book_append_sheet(wb, ws2, "Calculations");

    // Generate filename
    const filename = `Pump_Datasheet_${data.itemNumber || "New"}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    XLSX.writeFile(wb, filename);
};
