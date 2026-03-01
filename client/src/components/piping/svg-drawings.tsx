import type { PipeRow, FlangeRow, FittingRow, GasketRow, ValveRow, LineBlankRow, OletRow } from "@/lib/engineering/piping/schemas";

const DIM_STYLE = { stroke: "#d4a04a", strokeWidth: 0.7, fill: "none" };
const LABEL_STYLE = { fill: "#d4a04a", fontSize: 11, fontFamily: "monospace", textAnchor: "middle" as const };
const OUTLINE_STYLE = { stroke: "#94a3b8", strokeWidth: 2, fill: "none" };
const SECTION_FILL = { stroke: "#94a3b8", strokeWidth: 2, fill: "#1e293b" };

function LabelWithBg({ x, y, text, fontSize = 11, textAnchor = "middle" as const, padding = 4 }: { x: number; y: number; text: string; fontSize?: number; textAnchor?: string; padding?: number }) {
  const charW = fontSize * 0.6;
  const estimatedW = text.length * charW + padding * 2;
  const anchorOffset = textAnchor === "start" ? estimatedW / 2 : textAnchor === "end" ? -estimatedW / 2 : 0;
  return (
    <g>
      <rect
        x={x + anchorOffset - estimatedW / 2}
        y={y - fontSize}
        width={estimatedW}
        height={fontSize + padding * 2}
        fill="#0c1222"
        fillOpacity={0.92}
        rx={2}
      />
      <text x={x} y={y + 1} {...LABEL_STYLE} fontSize={fontSize} textAnchor={textAnchor as "middle" | "start" | "end"}>{text}</text>
    </g>
  );
}

function DimLine({ x1, y1, x2, y2, label, offset = 22, labelOffset = 0 }: { x1: number; y1: number; x2: number; y2: number; label: string; offset?: number; labelOffset?: number }) {
  const isVert = Math.abs(x1 - x2) < 1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dimLen = isVert ? Math.abs(y2 - y1) : Math.abs(x2 - x1);
  const fontSize = dimLen < 20 ? 8 : dimLen < 35 ? 9 : dimLen < 60 ? 10 : 11;
  const arrowSize = dimLen < 20 ? 2.5 : dimLen < 35 ? 3 : 4;
  const extLen = dimLen < 30 ? 5 : 7;
  const sign = offset >= 0 ? 1 : -1;
  const absOff = Math.abs(offset);
  const dimLinePos = sign * (absOff - 3);

  return (
    <g>
      {isVert ? (
        <>
          <line x1={x1 + (sign < 0 ? -absOff : -extLen)} y1={y1} x2={x1 + (sign > 0 ? absOff : extLen)} y2={y1} {...DIM_STYLE} />
          <line x1={x2 + (sign < 0 ? -absOff : -extLen)} y1={y2} x2={x2 + (sign > 0 ? absOff : extLen)} y2={y2} {...DIM_STYLE} />
          <line x1={x1 + dimLinePos} y1={y1} x2={x2 + dimLinePos} y2={y2} {...DIM_STYLE} />
          <polygon points={`${x1 + dimLinePos},${y1 + arrowSize} ${x1 + dimLinePos - arrowSize / 2},${y1} ${x1 + dimLinePos + arrowSize / 2},${y1}`} fill="#d4a04a" />
          <polygon points={`${x2 + dimLinePos},${y2 - arrowSize} ${x2 + dimLinePos - arrowSize / 2},${y2} ${x2 + dimLinePos + arrowSize / 2},${y2}`} fill="#d4a04a" />
          <LabelWithBg x={mx + sign * (absOff + 16) + labelOffset} y={my + 3} text={label} fontSize={fontSize} textAnchor={sign > 0 ? "start" : "end"} />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 + (sign < 0 ? -absOff : -extLen)} x2={x1} y2={y1 + (sign > 0 ? absOff : extLen)} {...DIM_STYLE} />
          <line x1={x2} y1={y2 + (sign < 0 ? -absOff : -extLen)} x2={x2} y2={y2 + (sign > 0 ? absOff : extLen)} {...DIM_STYLE} />
          <line x1={x1} y1={y1 + dimLinePos} x2={x2} y2={y2 + dimLinePos} {...DIM_STYLE} />
          <polygon points={`${x1 + arrowSize},${y1 + dimLinePos} ${x1},${y1 + dimLinePos - arrowSize / 2} ${x1},${y1 + dimLinePos + arrowSize / 2}`} fill="#d4a04a" />
          <polygon points={`${x2 - arrowSize},${y2 + dimLinePos} ${x2},${y2 + dimLinePos - arrowSize / 2} ${x2},${y2 + dimLinePos + arrowSize / 2}`} fill="#d4a04a" />
          <LabelWithBg x={mx} y={my + sign * (absOff + 14) + labelOffset} text={label} fontSize={fontSize} />
        </>
      )}
    </g>
  );
}

export function PipeSectionSVG({ row }: { row: PipeRow }) {
  const w = 280; const h = 320; const cx = w / 2; const cy = h / 2 - 16;
  const maxR = 70;
  const odR = maxR;
  const idR = row.id_mm ? (row.id_mm / row.od_mm) * maxR : ((row.od_mm - 2 * row.wt_mm) / row.od_mm) * maxR;
  const wallThick = odR - idR;
  const isSmall = wallThick < 8;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <circle cx={cx} cy={cy} r={odR} {...SECTION_FILL} />
      <circle cx={cx} cy={cy} r={idR} stroke="#94a3b8" strokeWidth={1.2} fill="#0c1222" />

      <DimLine x1={cx - odR} y1={cy} x2={cx + odR} y2={cy} label={`OD ${row.od_mm.toFixed(1)}`} offset={odR + 36} />

      {isSmall ? (
        <>
          <line x1={cx - idR} y1={cy - 8} x2={cx - idR} y2={cy - odR - 40} {...DIM_STYLE} />
          <line x1={cx + idR} y1={cy - 8} x2={cx + idR} y2={cy - odR - 40} {...DIM_STYLE} />
          <line x1={cx - idR} y1={cy - odR - 36} x2={cx + idR} y2={cy - odR - 36} {...DIM_STYLE} />
          <polygon points={`${cx - idR + 3},${cy - odR - 36} ${cx - idR},${cy - odR - 36 - 2} ${cx - idR},${cy - odR - 36 + 2}`} fill="#d4a04a" />
          <polygon points={`${cx + idR - 3},${cy - odR - 36} ${cx + idR},${cy - odR - 36 - 2} ${cx + idR},${cy - odR - 36 + 2}`} fill="#d4a04a" />
          <LabelWithBg x={cx} y={cy - odR - 48} text={`ID ${(row.id_mm ?? row.od_mm - 2 * row.wt_mm).toFixed(1)}`} fontSize={9} />
        </>
      ) : (
        <DimLine x1={cx - idR} y1={cy} x2={cx + idR} y2={cy} label={`ID ${(row.id_mm ?? row.od_mm - 2 * row.wt_mm).toFixed(1)}`} offset={-(odR + 36)} />
      )}

      {wallThick >= 5 && (
        <>
          <line x1={cx + idR + 1} y1={cy - 16} x2={cx + odR - 1} y2={cy - 16} stroke="#d4a04a" strokeWidth={0.7} />
          <LabelWithBg x={cx + (idR + odR) / 2} y={cy - 26} text={`t=${row.wt_mm.toFixed(1)}`} fontSize={isSmall ? 8 : 9} />
        </>
      )}
      {wallThick < 5 && (
        <LabelWithBg x={cx} y={h - 40} text={`t=${row.wt_mm.toFixed(1)} mm`} fontSize={9} />
      )}
      <LabelWithBg x={cx} y={h - 12} text={`NPS ${row.nps}" ${row.schedule}`} fontSize={11} />
    </svg>
  );
}

export function FlangeSectionSVG({ row }: { row: FlangeRow }) {
  const w = 300; const h = 300;
  const cx = w / 2; const cy = h / 2 - 10;
  const flangeH = Math.max((row.thickness_mm ?? 30) * 1.4, 30);
  const flangeW = Math.min((row.od_mm / 2) * 0.55, 110);
  const hubW = row.bore_mm ? (row.bore_mm / row.od_mm) * flangeW * 0.8 : flangeW * 0.4;
  const hubH = Math.max((row.hub_length_mm ?? flangeH * 0.6) * 0.9, 20);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <rect x={cx - flangeW} y={cy - flangeH / 2} width={flangeW * 2} height={flangeH} rx={2} {...SECTION_FILL} />
      {row.type === "WN" && (
        <path d={`M${cx - hubW},${cy - flangeH / 2} L${cx - hubW * 0.7},${cy - flangeH / 2 - hubH} L${cx + hubW * 0.7},${cy - flangeH / 2 - hubH} L${cx + hubW},${cy - flangeH / 2} Z`} {...SECTION_FILL} />
      )}
      <rect x={cx - hubW * 0.5} y={cy - flangeH / 2 - hubH - 2} width={hubW} height={flangeH + hubH + 4} fill="#0c1222" stroke="#64748b" strokeWidth={0.7} />
      {row.bolt_circle_mm && (
        <>
          {[0.15, 0.35, 0.65, 0.85].map((f, i) => (
            <circle key={i} cx={cx - flangeW + flangeW * 2 * f} cy={cy} r={4} fill="#64748b" stroke="#94a3b8" strokeWidth={0.7} />
          ))}
        </>
      )}
      <DimLine x1={cx - flangeW} y1={cy + flangeH / 2 + 24} x2={cx + flangeW} y2={cy + flangeH / 2 + 24} label={`OD ${row.od_mm}`} offset={32} />
      {row.thickness_mm && <DimLine x1={cx + flangeW + 28} y1={cy - flangeH / 2} x2={cx + flangeW + 28} y2={cy + flangeH / 2} label={`t=${row.thickness_mm}`} offset={50} />}
      <LabelWithBg x={cx} y={h - 12} text={`${row.type} Flange NPS ${row.nps}" #${row.class_rating}`} fontSize={11} />
    </svg>
  );
}

export function ElbowSVG({ row }: { row: FittingRow }) {
  const w = 220; const h = 220;
  const is45 = row.type === "45LR";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <path d={is45
        ? `M 40,170 Q 40,40 170,40`
        : `M 40,190 Q 40,40 190,40`
      } {...OUTLINE_STYLE} strokeWidth={2.5} />
      <path d={is45
        ? `M 56,170 Q 56,56 170,56`
        : `M 56,190 Q 56,56 190,56`
      } {...OUTLINE_STYLE} strokeWidth={1.2} strokeDasharray="5,4" />
      {row.center_to_end_mm && (
        <LabelWithBg x={w / 2} y={h - 10} text={`C-E: ${row.center_to_end_mm} mm`} fontSize={11} />
      )}
      <LabelWithBg x={w / 2} y={20} text={`${row.type.replace("LR", " LR").replace("SR", " SR")} NPS ${row.nps}"`} fontSize={11} />
    </svg>
  );
}

export function TeeSVG({ row }: { row: FittingRow }) {
  const w = 220; const h = 190;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <line x1={25} y1={95} x2={195} y2={95} {...OUTLINE_STYLE} strokeWidth={2.5} />
      <line x1={25} y1={112} x2={195} y2={112} {...OUTLINE_STYLE} strokeWidth={2.5} />
      <line x1={102} y1={95} x2={102} y2={25} {...OUTLINE_STYLE} strokeWidth={2.5} />
      <line x1={118} y1={95} x2={118} y2={25} {...OUTLINE_STYLE} strokeWidth={2.5} />
      <line x1={25} y1={95} x2={25} y2={112} {...OUTLINE_STYLE} strokeWidth={1.5} />
      <line x1={195} y1={95} x2={195} y2={112} {...OUTLINE_STYLE} strokeWidth={1.5} />
      <line x1={102} y1={25} x2={118} y2={25} {...OUTLINE_STYLE} strokeWidth={1.5} />
      {row.center_to_end_mm && <LabelWithBg x={110} y={150} text={`C-E: ${row.center_to_end_mm} mm`} fontSize={11} />}
      <LabelWithBg x={110} y={18} text={`Tee NPS ${row.nps}"`} fontSize={11} />
    </svg>
  );
}

export function ReducerSVG({ row }: { row: FittingRow }) {
  const w = 240; const h = 170;
  const isCon = row.type === "RED_CON";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {isCon ? (
        <>
          <line x1={25} y1={45} x2={120} y2={45} {...OUTLINE_STYLE} strokeWidth={2.5} />
          <line x1={25} y1={125} x2={120} y2={125} {...OUTLINE_STYLE} strokeWidth={2.5} />
          <line x1={120} y1={45} x2={195} y2={60} {...OUTLINE_STYLE} strokeWidth={2.5} />
          <line x1={120} y1={125} x2={195} y2={110} {...OUTLINE_STYLE} strokeWidth={2.5} />
          <line x1={195} y1={60} x2={215} y2={60} {...OUTLINE_STYLE} strokeWidth={2.5} />
          <line x1={195} y1={110} x2={215} y2={110} {...OUTLINE_STYLE} strokeWidth={2.5} />
        </>
      ) : (
        <>
          <line x1={25} y1={45} x2={120} y2={45} {...OUTLINE_STYLE} strokeWidth={2.5} />
          <line x1={25} y1={125} x2={120} y2={125} {...OUTLINE_STYLE} strokeWidth={2.5} />
          <line x1={120} y1={45} x2={195} y2={45} {...OUTLINE_STYLE} strokeWidth={2.5} />
          <line x1={120} y1={125} x2={195} y2={95} {...OUTLINE_STYLE} strokeWidth={2.5} />
          <line x1={195} y1={45} x2={215} y2={45} {...OUTLINE_STYLE} strokeWidth={2.5} />
          <line x1={195} y1={95} x2={215} y2={95} {...OUTLINE_STYLE} strokeWidth={2.5} />
        </>
      )}
      {row.overall_length_mm && <LabelWithBg x={120} y={155} text={`L: ${row.overall_length_mm} mm`} fontSize={11} />}
      <LabelWithBg x={120} y={18} text={`${isCon ? "Concentric" : "Eccentric"} Reducer NPS ${row.nps}"x${row.nps2 ?? "?"}"`} fontSize={10} />
    </svg>
  );
}

export function GasketSVG({ row }: { row: GasketRow }) {
  const w = 260; const h = 280; const cx = w / 2; const cy = h / 2 - 4;
  const maxR = 80;
  const odR = maxR;
  const idR = (row.id_mm / row.od_mm) * maxR;
  const ringGap = odR - idR;
  const isSmall = ringGap < 15;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <circle cx={cx} cy={cy} r={odR} fill="#1e293b" stroke="#94a3b8" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={idR} fill="#0c1222" stroke="#94a3b8" strokeWidth={1.2} />
      {row.type === "SWG" && (
        <>
          {[0.3, 0.5, 0.7, 0.85].map((f, i) => (
            <circle key={i} cx={cx} cy={cy} r={idR + (odR - idR) * f} fill="none" stroke="#475569" strokeWidth={0.4} />
          ))}
        </>
      )}
      <DimLine x1={cx - odR} y1={cy} x2={cx + odR} y2={cy} label={`OD ${row.od_mm}`} offset={odR + 32} />
      {isSmall ? (
        <>
          <line x1={cx - idR} y1={cy - 8} x2={cx - idR} y2={cy - odR - 36} {...DIM_STYLE} />
          <line x1={cx + idR} y1={cy - 8} x2={cx + idR} y2={cy - odR - 36} {...DIM_STYLE} />
          <line x1={cx - idR} y1={cy - odR - 32} x2={cx + idR} y2={cy - odR - 32} {...DIM_STYLE} />
          <polygon points={`${cx - idR + 3},${cy - odR - 32} ${cx - idR},${cy - odR - 32 - 2} ${cx - idR},${cy - odR - 32 + 2}`} fill="#d4a04a" />
          <polygon points={`${cx + idR - 3},${cy - odR - 32} ${cx + idR},${cy - odR - 32 - 2} ${cx + idR},${cy - odR - 32 + 2}`} fill="#d4a04a" />
          <LabelWithBg x={cx} y={cy - odR - 44} text={`ID ${row.id_mm}`} fontSize={9} />
        </>
      ) : (
        <DimLine x1={cx - idR} y1={cy} x2={cx + idR} y2={cy} label={`ID ${row.id_mm}`} offset={-(odR + 34)} />
      )}
      <LabelWithBg x={cx} y={h - 12} text={`${row.type} Gasket NPS ${row.nps}" #${row.class_rating}`} fontSize={11} />
    </svg>
  );
}

export function ValveEnvelopeSVG({ row }: { row: ValveRow }) {
  const w = 240; const h = 220;
  const cx = w / 2; const cy = 130;
  const bodyW = 70; const bodyH = 56;
  const stemH = row.height_mm ? 45 : 34;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <rect x={cx - bodyW / 2} y={cy - bodyH / 2} width={bodyW} height={bodyH} rx={5} {...SECTION_FILL} />
      <line x1={cx - bodyW / 2 - 32} y1={cy} x2={cx - bodyW / 2} y2={cy} {...OUTLINE_STYLE} strokeWidth={2.5} />
      <line x1={cx + bodyW / 2} y1={cy} x2={cx + bodyW / 2 + 32} y2={cy} {...OUTLINE_STYLE} strokeWidth={2.5} />
      <line x1={cx} y1={cy - bodyH / 2} x2={cx} y2={cy - bodyH / 2 - stemH} {...OUTLINE_STYLE} strokeWidth={2} />
      {row.type === "GATE" && <circle cx={cx} cy={cy - bodyH / 2 - stemH - 12} r={12} {...OUTLINE_STYLE} />}
      {row.type === "GLOBE" && <circle cx={cx} cy={cy - bodyH / 2 - stemH - 12} r={12} {...OUTLINE_STYLE} />}
      {row.type === "BALL" && <circle cx={cx} cy={cy} r={14} fill="none" stroke="#64748b" strokeWidth={1} />}
      {row.face_to_face_mm && (
        <DimLine x1={cx - bodyW / 2 - 32} y1={cy + bodyH / 2 + 14} x2={cx + bodyW / 2 + 32} y2={cy + bodyH / 2 + 14} label={`F-F ${row.face_to_face_mm}`} offset={22} />
      )}
      <LabelWithBg x={cx} y={18} text={`${row.type} Valve NPS ${row.nps}" #${row.class_rating}`} fontSize={11} />
    </svg>
  );
}

export function LineBlankSVG({ row }: { row: LineBlankRow }) {
  const w = 280; const h = 190;
  const cx = w / 2; const cy = h / 2;
  const diskR = 46;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {row.type === "SPECTACLE" ? (
        <>
          <circle cx={cx - 55} cy={cy} r={diskR} {...SECTION_FILL} />
          <circle cx={cx - 55} cy={cy} r={diskR * 0.65} fill="#0c1222" stroke="#94a3b8" strokeWidth={1.2} />
          <circle cx={cx + 55} cy={cy} r={diskR} {...SECTION_FILL} />
          <line x1={cx - 55 + diskR} y1={cy - 6} x2={cx + 55 - diskR} y2={cy - 6} {...OUTLINE_STYLE} />
          <line x1={cx - 55 + diskR} y1={cy + 6} x2={cx + 55 - diskR} y2={cy + 6} {...OUTLINE_STYLE} />
        </>
      ) : row.type === "SPADE" ? (
        <>
          <circle cx={cx} cy={cy} r={diskR} {...SECTION_FILL} />
          <line x1={cx} y1={cy - diskR} x2={cx + diskR + 30} y2={cy - diskR} {...OUTLINE_STYLE} />
          <line x1={cx} y1={cy + diskR} x2={cx + diskR + 30} y2={cy + diskR} {...OUTLINE_STYLE} />
        </>
      ) : (
        <>
          <circle cx={cx} cy={cy} r={diskR} {...SECTION_FILL} />
          <circle cx={cx} cy={cy} r={diskR * 0.65} fill="#0c1222" stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={cx} y1={cy - diskR} x2={cx + diskR + 30} y2={cy - diskR} {...OUTLINE_STYLE} />
        </>
      )}
      <LabelWithBg x={cx} y={h - 10} text={`${row.type} NPS ${row.nps}" #${row.class_rating}`} fontSize={11} />
    </svg>
  );
}

export function OletSVG({ row }: { row: OletRow }) {
  const w = 220; const h = 200;
  const cx = w / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <ellipse cx={cx} cy={160} rx={75} ry={22} {...OUTLINE_STYLE} strokeWidth={2.5} />
      <line x1={cx - 16} y1={160} x2={cx - 16} y2={55} {...OUTLINE_STYLE} strokeWidth={2.5} />
      <line x1={cx + 16} y1={160} x2={cx + 16} y2={55} {...OUTLINE_STYLE} strokeWidth={2.5} />
      <line x1={cx - 16} y1={55} x2={cx + 16} y2={55} {...OUTLINE_STYLE} strokeWidth={1.5} />
      <path d={`M${cx - 28},${155} Q${cx - 28},${140} ${cx - 16},${128}`} fill="none" stroke="#94a3b8" strokeWidth={2} />
      <path d={`M${cx + 28},${155} Q${cx + 28},${140} ${cx + 16},${128}`} fill="none" stroke="#94a3b8" strokeWidth={2} />
      {row.height_mm && (
        <DimLine x1={cx + 24} y1={55} x2={cx + 24} y2={155} label={`H=${row.height_mm}`} offset={30} />
      )}
      <LabelWithBg x={cx} y={18} text={`${row.type} ${row.run_nps}"x${row.branch_nps}"`} fontSize={11} />
    </svg>
  );
}

export function FittingSVG({ row }: { row: FittingRow }) {
  if (row.type === "TEE") return <TeeSVG row={row} />;
  if (row.type === "RED_CON" || row.type === "RED_ECC") return <ReducerSVG row={row} />;
  return <ElbowSVG row={row} />;
}
