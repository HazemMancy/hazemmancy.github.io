import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface ExportResultItem {
  label: string;
  value: string | number;
  unit: string;
  highlight?: boolean;
}

export interface ExportInputItem {
  label: string;
  value: string | number;
  unit?: string;
}

export interface ExportCalcStep {
  label: string;
  equation?: string;
  value: string | number;
  unit?: string;
}

export interface ExportSection {
  title: string;
  items: { label: string; value: string | number; unit?: string }[];
}

export interface ExportDatasheet {
  calculatorName: string;
  projectInfo?: { label: string; value: string }[];
  inputs: ExportInputItem[];
  results: ExportResultItem[];
  methodology?: string[];
  assumptions?: string[];
  references?: string[];
  warnings?: string[];
  calcSteps?: ExportCalcStep[];
  additionalSections?: ExportSection[];
}

function fmtVal(v: string | number): string {
  if (typeof v === "number") {
    if (Math.abs(v) >= 1e6 || (Math.abs(v) < 0.001 && v !== 0)) return v.toExponential(4);
    if (Math.abs(v) >= 1000) return v.toFixed(1);
    if (Math.abs(v) >= 1) return v.toFixed(4);
    return v.toFixed(6);
  }
  return String(v);
}

function slugify(name: string): string {
  return name.replace(/[^a-zA-Z0-9]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").toLowerCase();
}

function timestamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
}

export function exportToExcel(data: ExportDatasheet): void {
  const wb = XLSX.utils.book_new();

  const rows: (string | number)[][] = [];

  rows.push([data.calculatorName.toUpperCase()]);
  rows.push(["Generated", new Date().toLocaleString()]);
  rows.push([]);

  if (data.projectInfo && data.projectInfo.length > 0) {
    rows.push(["PROJECT INFORMATION"]);
    for (const p of data.projectInfo) {
      rows.push([p.label, p.value]);
    }
    rows.push([]);
  }

  rows.push(["INPUT DATA"]);
  rows.push(["Parameter", "Value", "Unit"]);
  for (const inp of data.inputs) {
    rows.push([inp.label, fmtVal(inp.value), inp.unit || ""]);
  }
  rows.push([]);

  rows.push(["RESULTS"]);
  rows.push(["Parameter", "Value", "Unit"]);
  for (const r of data.results) {
    rows.push([r.label, fmtVal(r.value), r.unit]);
  }
  rows.push([]);

  if (data.calcSteps && data.calcSteps.length > 0) {
    rows.push(["CALCULATION STEPS"]);
    rows.push(["Step", "Equation", "Value", "Unit"]);
    for (const s of data.calcSteps) {
      rows.push([s.label, s.equation || "", fmtVal(s.value), s.unit || ""]);
    }
    rows.push([]);
  }

  if (data.additionalSections) {
    for (const section of data.additionalSections) {
      rows.push([section.title.toUpperCase()]);
      rows.push(["Parameter", "Value", "Unit"]);
      for (const item of section.items) {
        rows.push([item.label, fmtVal(item.value), item.unit || ""]);
      }
      rows.push([]);
    }
  }

  if (data.methodology && data.methodology.length > 0) {
    rows.push(["METHODOLOGY"]);
    for (const m of data.methodology) {
      rows.push([m]);
    }
    rows.push([]);
  }

  if (data.assumptions && data.assumptions.length > 0) {
    rows.push(["ASSUMPTIONS"]);
    for (const a of data.assumptions) {
      rows.push([a]);
    }
    rows.push([]);
  }

  if (data.references && data.references.length > 0) {
    rows.push(["REFERENCES"]);
    for (const ref of data.references) {
      rows.push([ref]);
    }
    rows.push([]);
  }

  if (data.warnings && data.warnings.length > 0) {
    rows.push(["WARNINGS / FLAGS"]);
    for (const w of data.warnings) {
      rows.push([w]);
    }
    rows.push([]);
  }

  rows.push(["DISCLAIMER"]);
  rows.push(["This document is generated for preliminary screening purposes only."]);
  rows.push(["For project-critical applications, verify against licensed standards and detailed engineering."]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws["!cols"] = [{ wch: 40 }, { wch: 25 }, { wch: 15 }, { wch: 15 }];

  XLSX.utils.book_append_sheet(wb, ws, "Datasheet");
  XLSX.writeFile(wb, `${slugify(data.calculatorName)}_${timestamp()}.xlsx`);
}

export function exportToPDF(data: ExportDatasheet): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  const addPageIfNeeded = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFillColor(12, 18, 34);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setTextColor(212, 160, 74);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.calculatorName, margin, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 180);
  doc.text("Engineering Calculation Datasheet", margin, 21);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 27);
  y = 40;

  doc.setTextColor(0, 0, 0);

  if (data.projectInfo && data.projectInfo.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(12, 18, 34);
    doc.text("Project Information", margin, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Field", "Value"]],
      body: data.projectInfo.map((p) => [p.label, p.value]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [12, 18, 34], textColor: [212, 160, 74], fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 250] },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  addPageIfNeeded(20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(12, 18, 34);
  doc.text("Input Data", margin, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Parameter", "Value", "Unit"]],
    body: data.inputs.map((inp) => [inp.label, fmtVal(inp.value), inp.unit || ""]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [12, 18, 34], textColor: [212, 160, 74], fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    columnStyles: { 1: { halign: "right", font: "courier" }, 2: { halign: "left" } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  addPageIfNeeded(20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(12, 18, 34);
  doc.text("Results", margin, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Parameter", "Value", "Unit"]],
    body: data.results.map((r) => [r.label, fmtVal(r.value), r.unit]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [12, 18, 34], textColor: [212, 160, 74], fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    columnStyles: { 1: { halign: "right", font: "courier" }, 2: { halign: "left" } },
    didParseCell: (hookData: any) => {
      if (hookData.section === "body") {
        const resultItem = data.results[hookData.row.index];
        if (resultItem?.highlight) {
          hookData.cell.styles.fontStyle = "bold";
          hookData.cell.styles.fillColor = [232, 245, 233];
        }
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  if (data.calcSteps && data.calcSteps.length > 0) {
    addPageIfNeeded(20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(12, 18, 34);
    doc.text("Calculation Steps", margin, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Step", "Equation", "Value", "Unit"]],
      body: data.calcSteps.map((s) => [s.label, s.equation || "", fmtVal(s.value), s.unit || ""]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [12, 18, 34], textColor: [212, 160, 74], fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      columnStyles: { 1: { font: "courier", fontSize: 6.5 }, 2: { halign: "right", font: "courier" } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  if (data.additionalSections) {
    for (const section of data.additionalSections) {
      addPageIfNeeded(20);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(12, 18, 34);
      doc.text(section.title, margin, y);
      y += 3;

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Parameter", "Value", "Unit"]],
        body: section.items.map((item) => [item.label, fmtVal(item.value), item.unit || ""]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [12, 18, 34], textColor: [212, 160, 74], fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 250] },
        columnStyles: { 1: { halign: "right", font: "courier" } },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  const textSections: { title: string; items: string[] }[] = [];
  if (data.methodology?.length) textSections.push({ title: "Methodology", items: data.methodology });
  if (data.assumptions?.length) textSections.push({ title: "Assumptions", items: data.assumptions });
  if (data.references?.length) textSections.push({ title: "References", items: data.references });
  if (data.warnings?.length) textSections.push({ title: "Warnings / Flags", items: data.warnings });

  for (const sec of textSections) {
    addPageIfNeeded(20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(12, 18, 34);
    doc.text(sec.title, margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    for (const item of sec.items) {
      addPageIfNeeded(6);
      const lines = doc.splitTextToSize(`• ${item}`, pageW - 2 * margin);
      doc.text(lines, margin + 2, y);
      y += lines.length * 4;
    }
    y += 4;
  }

  addPageIfNeeded(16);
  doc.setDrawColor(200, 180, 100);
  doc.setFillColor(255, 249, 230);
  doc.rect(margin, y, pageW - 2 * margin, 14, "FD");
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 80, 40);
  doc.text("DISCLAIMER: This document is generated for preliminary screening purposes only.", margin + 3, y + 5);
  doc.text("For project-critical applications, verify against licensed standards and detailed engineering.", margin + 3, y + 10);

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, doc.internal.pageSize.getHeight() - 8, { align: "right" });
    doc.text("Hazem El Mancy — Process Engineering Calculator Suite", margin, doc.internal.pageSize.getHeight() - 8);
  }

  doc.save(`${slugify(data.calculatorName)}_${timestamp()}.pdf`);
}

export function exportToJSON(data: ExportDatasheet): void {
  const exportData = {
    calculator: data.calculatorName,
    timestamp: new Date().toISOString(),
    projectInfo: data.projectInfo,
    inputs: data.inputs.map((inp) => ({ parameter: inp.label, value: inp.value, unit: inp.unit || "" })),
    results: data.results.map((r) => ({ parameter: r.label, value: r.value, unit: r.unit })),
    calcSteps: data.calcSteps?.map((s) => ({ step: s.label, equation: s.equation, value: s.value, unit: s.unit })),
    methodology: data.methodology,
    assumptions: data.assumptions,
    references: data.references,
    warnings: data.warnings,
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(data.calculatorName)}_${timestamp()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
