import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";

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
  chartElementId?: string;
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

async function captureChartImage(elementId: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const el = document.getElementById(elementId);
    if (!el) return null;
    const canvas = await html2canvas(el, {
      backgroundColor: "#0c1222",
      scale: 2,
      logging: false,
      useCORS: true,
    });
    return { dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
  } catch {
    return null;
  }
}

export async function exportToPDF(data: ExportDatasheet): Promise<void> {
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

  if (data.chartElementId) {
    const chartCapture = await captureChartImage(data.chartElementId);
    if (chartCapture) {
      doc.addPage("a4", "landscape");
      const lPageW = doc.internal.pageSize.getWidth();
      const lPageH = doc.internal.pageSize.getHeight();
      const lMargin = 15;

      doc.setFillColor(12, 18, 34);
      doc.rect(0, 0, lPageW, 18, "F");
      doc.setTextColor(212, 160, 74);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Performance Curve", lMargin, 12);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 180, 180);
      doc.text(data.calculatorName, lPageW - lMargin, 12, { align: "right" });

      const availW = lPageW - 2 * lMargin;
      const availH = lPageH - 18 - lMargin - 10;
      const imgAspect = chartCapture.width / chartCapture.height;
      let chartW = availW;
      let chartH = chartW / imgAspect;
      if (chartH > availH) {
        chartH = availH;
        chartW = chartH * imgAspect;
      }
      const chartX = lMargin + (availW - chartW) / 2;
      const chartY = 18 + (availH - chartH) / 2 + 2;
      doc.addImage(chartCapture.dataUrl, "PNG", chartX, chartY, chartW, chartH);

      doc.addPage("a4", "portrait");
      y = margin;
    }
  }

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

export function exportToCalcNote(data: ExportDatasheet): void {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const esc = (s: string | number) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const fmtV = (v: string | number): string => {
    if (typeof v === "number") {
      if (Math.abs(v) >= 1e6 || (Math.abs(v) < 0.001 && v !== 0)) return v.toExponential(4);
      if (Math.abs(v) >= 1000) return v.toFixed(1);
      if (Math.abs(v) >= 1) return v.toFixed(4);
      return v.toFixed(6);
    }
    return esc(v);
  };

  const projectBlock = data.projectInfo && data.projectInfo.length > 0
    ? `<div class="project-grid">${data.projectInfo.map(p =>
        `<div><span>${esc(p.label)}:</span> <strong>${esc(p.value)}</strong></div>`).join("")}</div>`
    : "";

  const warningsBlock = data.warnings && data.warnings.length > 0
    ? `<div class="warnings"><strong>&#9888; Engineering Warnings / Flags</strong>
       <ul>${data.warnings.map(w => `<li>${esc(w)}</li>`).join("")}</ul></div>`
    : "";

  const inputRows = data.inputs.map(inp =>
    `<tr><td>${esc(inp.label)}</td><td class="mono right">${esc(fmtV(inp.value))}</td><td>${esc(inp.unit || "")}</td></tr>`
  ).join("");

  const calcStepsSection = data.calcSteps && data.calcSteps.length > 0
    ? `<h2>&#9658; Calculation Steps</h2>
       <table>
         <tr><th>#</th><th>Step</th><th>Equation</th><th class="right">Value</th><th>Unit</th></tr>
         ${data.calcSteps.map((s, i) =>
           `<tr>
             <td style="color:#999;font-size:8pt">${i + 1}</td>
             <td>${esc(s.label)}</td>
             <td class="mono eq">${esc(s.equation || "\u2014")}</td>
             <td class="mono right">${esc(fmtV(s.value))}</td>
             <td>${esc(s.unit || "")}</td>
           </tr>`).join("")}
       </table>`
    : "";

  const resultRows = data.results.map(r =>
    `<tr class="${r.highlight ? "highlight" : ""}">
       <td>${esc(r.label)}</td>
       <td class="mono right">${esc(fmtV(r.value))}</td>
       <td>${esc(r.unit)}</td>
     </tr>`
  ).join("");

  const additionalSections = (data.additionalSections || []).map(sec =>
    `<h2>&#9658; ${esc(sec.title)}</h2>
     <table>
       <tr><th>Parameter</th><th class="right">Value</th><th>Unit</th></tr>
       ${sec.items.map(item =>
         `<tr><td>${esc(item.label)}</td><td class="mono right">${esc(fmtV(item.value))}</td><td>${esc(item.unit || "")}</td></tr>`
       ).join("")}
     </table>`
  ).join("");

  const listBlock = (title: string, items: string[]) =>
    items.length
      ? `<h2>&#9658; ${esc(title)}</h2><ul>${items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${esc(data.calculatorName)} \u2014 Calc Note</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#1a1a2e;margin:0;background:#fff}
  .header{background:#0c1222;color:#d4a04a;padding:14px 24px 10px;margin-bottom:20px}
  .header h1{font-size:15pt;margin:0 0 4px;letter-spacing:.02em}
  .header .sub{color:#b0b0c0;font-size:8.5pt}
  .page{max-width:920px;margin:0 auto;padding:0 24px 32px}
  .project-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px 32px;font-size:9pt;margin-bottom:16px;padding:10px 14px;background:#f4f4f8;border:1px solid #e0e0e8;border-radius:4px}
  .project-grid div span{color:#888;margin-right:4px}
  h2{font-size:10pt;color:#0c1222;border-bottom:2px solid #d4a04a;padding-bottom:3px;margin:18px 0 8px;text-transform:uppercase;letter-spacing:.04em}
  table{width:100%;border-collapse:collapse;margin-bottom:4px;font-size:8.5pt}
  th{background:#0c1222;color:#d4a04a;padding:4px 8px;text-align:left;font-size:8pt;font-weight:600}
  td{padding:3px 8px;border-bottom:1px solid #eee;vertical-align:top}
  tr:nth-child(even) td{background:#f8f8fc}
  tr.highlight td{font-weight:bold;background:#e8f5e9!important;color:#1b5e20}
  .mono{font-family:"Courier New",monospace}
  .eq{font-size:7.5pt;color:#555}
  .right{text-align:right}
  .warnings{background:#fff8e1;border-left:4px solid #f59e0b;padding:8px 12px;margin:12px 0;font-size:9pt}
  .warnings strong{display:block;margin-bottom:4px;color:#92400e}
  .warnings ul,.warnings li{margin:2px 0;color:#78350f}
  ul{padding-left:20px;margin:4px 0 10px}
  li{font-size:9pt;margin:2px 0}
  .disclaimer{border:1px solid #d4a04a;background:#fffbf0;padding:8px 12px;font-size:8pt;margin-top:20px;color:#7a5c10;font-style:italic}
  footer{margin-top:16px;font-size:7.5pt;color:#999;border-top:1px solid #eee;padding-top:6px;display:flex;justify-content:space-between}
  .print-btn{display:flex;gap:8px;margin-bottom:14px}
  .print-btn button{padding:6px 14px;font-size:9pt;cursor:pointer;border:1px solid #0c1222;background:#0c1222;color:#d4a04a;border-radius:3px}
  .print-btn button:hover{background:#1a2840}
  @media print{.print-btn{display:none}body{font-size:9pt}.header{margin-bottom:12px;padding:10px 18px 8px}h2{margin:12px 0 6px}table{page-break-inside:auto}tr{page-break-inside:avoid}}
</style>
</head><body>
<div class="header">
  <h1>${esc(data.calculatorName)}</h1>
  <div class="sub">Engineering Calculation Note &nbsp;|&nbsp; ${esc(dateStr)} ${esc(timeStr)} &nbsp;|&nbsp; Hazem El Mancy \u2014 DG Impianti Industriali S.P.A.</div>
</div>
<div class="page">
  <div class="print-btn">
    <button onclick="window.print()">&#128438; Print / Save as PDF</button>
    <button onclick="window.close()">&#10005; Close</button>
  </div>
  ${projectBlock}
  ${warningsBlock}
  <h2>&#9658; Input Data</h2>
  <table><tr><th>Parameter</th><th class="right">Value</th><th>Unit</th></tr>${inputRows}</table>
  ${calcStepsSection}
  <h2>&#9658; Results</h2>
  <table><tr><th>Parameter</th><th class="right">Value</th><th>Unit</th></tr>${resultRows}</table>
  ${additionalSections}
  ${listBlock("Methodology", data.methodology || [])}
  ${listBlock("Assumptions", data.assumptions || [])}
  ${listBlock("References", data.references || [])}
  <div class="disclaimer">
    SCREENING TOOL ONLY \u2014 This calculation note is generated for preliminary engineering screening purposes only.
    For detailed engineering, FEED, or EPC project applications, verify all results against the cited standards
    using licensed software and qualified engineering judgment.
  </div>
  <footer>
    <span>Hazem El Mancy \u2014 Process Engineering Calculator Suite</span>
    <span>Generated: ${esc(dateStr)} ${esc(timeStr)}</span>
  </footer>
</div></body></html>`;

  const win = window.open("", "_blank");
  if (!win) { alert("Popup blocked \u2014 please allow popups for this site to open the Calc Note."); return; }
  win.document.write(html);
  win.document.close();
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
