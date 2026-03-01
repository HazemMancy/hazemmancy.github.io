import type { PipeRow, FlangeRow, FittingRow, GasketRow, ValveRow, LineBlankRow, OletRow } from "@/lib/engineering/piping/schemas";

const DIM_STYLE = { stroke: "#d4a04a", strokeWidth: 0.5, fill: "none" };
const LABEL_STYLE = { fill: "#d4a04a", fontSize: 9, fontFamily: "monospace", textAnchor: "middle" as const };
const OUTLINE_STYLE = { stroke: "#94a3b8", strokeWidth: 1.5, fill: "none" };
const SECTION_FILL = { stroke: "#94a3b8", strokeWidth: 1.5, fill: "#1e293b" };

function LabelWithBg({ x, y, text, fontSize = 8, textAnchor = "middle" as const, padding = 3 }: { x: number; y: number; text: string; fontSize?: number; textAnchor?: string; padding?: number }) {
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

function DimLine({ x1, y1, x2, y2, label, offset = 18, labelOffset = 0 }: { x1: number; y1: number; x2: number; y2: number; label: string; offset?: number; labelOffset?: number }) {
  const isVert = Math.abs(x1 - x2) < 1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dimLen = isVert ? Math.abs(y2 - y1) : Math.abs(x2 - x1);
  const fontSize = dimLen < 20 ? 5.5 : dimLen < 30 ? 6.5 : dimLen < 50 ? 7 : 8;
  const arrowSize = dimLen < 20 ? 1.5 : dimLen < 30 ? 2 : 3;
  const extLen = dimLen < 30 ? 4 : 5;
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
          <LabelWithBg x={mx + sign * (absOff + 14) + labelOffset} y={my + 3} text={label} fontSize={fontSize} textAnchor={sign > 0 ? "start" : "end"} />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 + (sign < 0 ? -absOff : -extLen)} x2={x1} y2={y1 + (sign > 0 ? absOff : extLen)} {...DIM_STYLE} />
          <line x1={x2} y1={y2 + (sign < 0 ? -absOff : -extLen)} x2={x2} y2={y2 + (sign > 0 ? absOff : extLen)} {...DIM_STYLE} />
          <line x1={x1} y1={y1 + dimLinePos} x2={x2} y2={y2 + dimLinePos} {...DIM_STYLE} />
          <polygon points={`${x1 + arrowSize},${y1 + dimLinePos} ${x1},${y1 + dimLinePos - arrowSize / 2} ${x1},${y1 + dimLinePos + arrowSize / 2}`} fill="#d4a04a" />
          <polygon points={`${x2 - arrowSize},${y2 + dimLinePos} ${x2},${y2 + dimLinePos - arrowSize / 2} ${x2},${y2 + dimLinePos + arrowSize / 2}`} fill="#d4a04a" />
          <LabelWithBg x={mx} y={my + sign * (absOff + 12) + labelOffset} text={label} fontSize={fontSize} />
        </>
      )}
    </g>
  );
}

export function PipeSectionSVG({ row }: { row: PipeRow }) {
  const w = 320; const h = 420; const cx = w / 2; const cy = h / 2 - 36;
  const maxR = 62;
  const odR = maxR;
  const idR = row.id_mm ? (row.id_mm / row.od_mm) * maxR : ((row.od_mm - 2 * row.wt_mm) / row.od_mm) * maxR;
  const wallThick = odR - idR;
  const isSmall = wallThick < 8;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[320px]">
      <circle cx={cx} cy={cy} r={odR} {...SECTION_FILL} />
      <circle cx={cx} cy={cy} r={idR} stroke="#94a3b8" strokeWidth={1} fill="#0c1222" />

      <DimLine x1={cx - odR} y1={cy} x2={cx + odR} y2={cy} label={`OD ${row.od_mm.toFixed(1)}`} offset={odR + 48} />

      {isSmall ? (
        <>
          <line x1={cx - idR} y1={cy - 6} x2={cx - idR} y2={cy - odR - 56} {...DIM_STYLE} />
          <line x1={cx + idR} y1={cy - 6} x2={cx + idR} y2={cy - odR - 56} {...DIM_STYLE} />
          <line x1={cx - idR} y1={cy - odR - 52} x2={cx + idR} y2={cy - odR - 52} {...DIM_STYLE} />
          <polygon points={`${cx - idR + 2},${cy - odR - 52} ${cx - idR},${cy - odR - 52 - 1.5} ${cx - idR},${cy - odR - 52 + 1.5}`} fill="#d4a04a" />
          <polygon points={`${cx + idR - 2},${cy - odR - 52} ${cx + idR},${cy - odR - 52 - 1.5} ${cx + idR},${cy - odR - 52 + 1.5}`} fill="#d4a04a" />
          <LabelWithBg x={cx} y={cy - odR - 64} text={`ID ${(row.id_mm ?? row.od_mm - 2 * row.wt_mm).toFixed(1)}`} fontSize={7} />
        </>
      ) : (
        <DimLine x1={cx - idR} y1={cy} x2={cx + idR} y2={cy} label={`ID ${(row.id_mm ?? row.od_mm - 2 * row.wt_mm).toFixed(1)}`} offset={odR + 96} />
      )}

      {wallThick >= 5 && (
        <>
          <line x1={cx + idR + 1} y1={cy - 14} x2={cx + odR - 1} y2={cy - 14} stroke="#d4a04a" strokeWidth={0.5} />
          <LabelWithBg x={cx + (idR + odR) / 2} y={cy - 22} text={`t=${row.wt_mm.toFixed(1)}`} fontSize={isSmall ? 6 : 7} />
        </>
      )}
      {wallThick < 5 && (
        <LabelWithBg x={cx} y={h - 48} text={`t=${row.wt_mm.toFixed(1)} mm`} fontSize={7} />
      )}
      <LabelWithBg x={cx} y={h - 14} text={`NPS ${row.nps}" ${row.schedule}`} fontSize={8} />
    </svg>
  );
}

export function FlangeSectionSVG({ row }: { row: FlangeRow }) {
  const w = 360; const h = 420;
  const cx = w / 2; const cy = h / 2 - 20;
  const flangeH = (row.thickness_mm ?? 30) * 1.2;
  const flangeW = Math.min((row.od_mm / 2) * 0.5, 100);
  const hubW = row.bore_mm ? (row.bore_mm / row.od_mm) * flangeW * 0.8 : flangeW * 0.4;
  const hubH = (row.hub_length_mm ?? flangeH * 0.6) * 0.8;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[360px]">
      <rect x={cx - flangeW} y={cy - flangeH / 2} width={flangeW * 2} height={flangeH} rx={2} {...SECTION_FILL} />
      {row.type === "WN" && (
        <path d={`M${cx - hubW},${cy - flangeH / 2} L${cx - hubW * 0.7},${cy - flangeH / 2 - hubH} L${cx + hubW * 0.7},${cy - flangeH / 2 - hubH} L${cx + hubW},${cy - flangeH / 2} Z`} {...SECTION_FILL} />
      )}
      <rect x={cx - hubW * 0.5} y={cy - flangeH / 2 - hubH - 2} width={hubW} height={flangeH + hubH + 4} fill="#0c1222" stroke="#64748b" strokeWidth={0.5} />
      {row.bolt_circle_mm && (
        <>
          {[0.15, 0.35, 0.65, 0.85].map((f, i) => (
            <circle key={i} cx={cx - flangeW + flangeW * 2 * f} cy={cy} r={3} fill="#64748b" stroke="#94a3b8" strokeWidth={0.5} />
          ))}
        </>
      )}
      <DimLine x1={cx - flangeW} y1={cy + flangeH / 2 + 36} x2={cx + flangeW} y2={cy + flangeH / 2 + 36} label={`OD ${row.od_mm}`} offset={44} />
      {row.thickness_mm && <DimLine x1={cx + flangeW + 36} y1={cy - flangeH / 2} x2={cx + flangeW + 36} y2={cy + flangeH / 2} label={`t=${row.thickness_mm}`} offset={60} />}
      <LabelWithBg x={cx} y={h - 14} text={`${row.type} Flange NPS ${row.nps}" #${row.class_rating}`} fontSize={8} />
    </svg>
  );
}

export function ElbowSVG({ row }: { row: FittingRow }) {
  const w = 240; const h = 240;
  const is45 = row.type === "45LR";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[260px]">
      <path d={is45
        ? `M 50,180 Q 50,50 180,50`
        : `M 50,200 Q 50,50 200,50`
      } {...OUTLINE_STYLE} strokeWidth={2} />
      <path d={is45
        ? `M 65,180 Q 65,65 180,65`
        : `M 65,200 Q 65,65 200,65`
      } {...OUTLINE_STYLE} strokeWidth={1} strokeDasharray="4,3" />
      {row.center_to_end_mm && (
        <LabelWithBg x={w / 2} y={h - 10} text={`C-E: ${row.center_to_end_mm} mm`} fontSize={8} />
      )}
      <LabelWithBg x={w / 2} y={18} text={`${row.type.replace("LR", " LR").replace("SR", " SR")} NPS ${row.nps}"`} fontSize={8} />
    </svg>
  );
}

export function TeeSVG({ row }: { row: FittingRow }) {
  const w = 240; const h = 200;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[260px]">
      <line x1={30} y1={100} x2={210} y2={100} {...OUTLINE_STYLE} strokeWidth={2} />
      <line x1={30} y1={115} x2={210} y2={115} {...OUTLINE_STYLE} strokeWidth={2} />
      <line x1={112} y1={100} x2={112} y2={30} {...OUTLINE_STYLE} strokeWidth={2} />
      <line x1={128} y1={100} x2={128} y2={30} {...OUTLINE_STYLE} strokeWidth={2} />
      <line x1={30} y1={100} x2={30} y2={115} {...OUTLINE_STYLE} />
      <line x1={210} y1={100} x2={210} y2={115} {...OUTLINE_STYLE} />
      <line x1={112} y1={30} x2={128} y2={30} {...OUTLINE_STYLE} />
      {row.center_to_end_mm && <LabelWithBg x={120} y={155} text={`C-E: ${row.center_to_end_mm} mm`} fontSize={8} />}
      <LabelWithBg x={120} y={18} text={`Tee NPS ${row.nps}"`} fontSize={8} />
    </svg>
  );
}

export function ReducerSVG({ row }: { row: FittingRow }) {
  const w = 260; const h = 180;
  const isCon = row.type === "RED_CON";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[280px]">
      {isCon ? (
        <>
          <line x1={30} y1={50} x2={130} y2={50} {...OUTLINE_STYLE} strokeWidth={2} />
          <line x1={30} y1={130} x2={130} y2={130} {...OUTLINE_STYLE} strokeWidth={2} />
          <line x1={130} y1={50} x2={210} y2={65} {...OUTLINE_STYLE} strokeWidth={2} />
          <line x1={130} y1={130} x2={210} y2={115} {...OUTLINE_STYLE} strokeWidth={2} />
          <line x1={210} y1={65} x2={230} y2={65} {...OUTLINE_STYLE} strokeWidth={2} />
          <line x1={210} y1={115} x2={230} y2={115} {...OUTLINE_STYLE} strokeWidth={2} />
        </>
      ) : (
        <>
          <line x1={30} y1={50} x2={130} y2={50} {...OUTLINE_STYLE} strokeWidth={2} />
          <line x1={30} y1={130} x2={130} y2={130} {...OUTLINE_STYLE} strokeWidth={2} />
          <line x1={130} y1={50} x2={210} y2={50} {...OUTLINE_STYLE} strokeWidth={2} />
          <line x1={130} y1={130} x2={210} y2={100} {...OUTLINE_STYLE} strokeWidth={2} />
          <line x1={210} y1={50} x2={230} y2={50} {...OUTLINE_STYLE} strokeWidth={2} />
          <line x1={210} y1={100} x2={230} y2={100} {...OUTLINE_STYLE} strokeWidth={2} />
        </>
      )}
      {row.overall_length_mm && <LabelWithBg x={130} y={160} text={`L: ${row.overall_length_mm} mm`} fontSize={8} />}
      <LabelWithBg x={130} y={18} text={`${isCon ? "Concentric" : "Eccentric"} Reducer NPS ${row.nps}"x${row.nps2 ?? "?"}"`} fontSize={8} />
    </svg>
  );
}

export function GasketSVG({ row }: { row: GasketRow }) {
  const w = 300; const h = 380; const cx = w / 2; const cy = h / 2 - 8;
  const maxR = 78;
  const odR = maxR;
  const idR = (row.id_mm / row.od_mm) * maxR;
  const ringGap = odR - idR;
  const isSmall = ringGap < 15;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[300px]">
      <circle cx={cx} cy={cy} r={odR} fill="#1e293b" stroke="#94a3b8" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={idR} fill="#0c1222" stroke="#94a3b8" strokeWidth={1} />
      {row.type === "SWG" && (
        <>
          {[0.3, 0.5, 0.7, 0.85].map((f, i) => (
            <circle key={i} cx={cx} cy={cy} r={idR + (odR - idR) * f} fill="none" stroke="#475569" strokeWidth={0.3} />
          ))}
        </>
      )}
      <DimLine x1={cx - odR} y1={cy} x2={cx + odR} y2={cy} label={`OD ${row.od_mm}`} offset={odR + 46} />
      {isSmall ? (
        <>
          <line x1={cx - idR} y1={cy - 6} x2={cx - idR} y2={cy - odR - 50} {...DIM_STYLE} />
          <line x1={cx + idR} y1={cy - 6} x2={cx + idR} y2={cy - odR - 50} {...DIM_STYLE} />
          <line x1={cx - idR} y1={cy - odR - 46} x2={cx + idR} y2={cy - odR - 46} {...DIM_STYLE} />
          <polygon points={`${cx - idR + 2},${cy - odR - 46} ${cx - idR},${cy - odR - 46 - 1.5} ${cx - idR},${cy - odR - 46 + 1.5}`} fill="#d4a04a" />
          <polygon points={`${cx + idR - 2},${cy - odR - 46} ${cx + idR},${cy - odR - 46 - 1.5} ${cx + idR},${cy - odR - 46 + 1.5}`} fill="#d4a04a" />
          <LabelWithBg x={cx} y={cy - odR - 58} text={`ID ${row.id_mm}`} fontSize={7} />
        </>
      ) : (
        <DimLine x1={cx - idR} y1={cy} x2={cx + idR} y2={cy} label={`ID ${row.id_mm}`} offset={-(odR + 48)} labelOffset={0} />
      )}
      <LabelWithBg x={cx} y={h - 14} text={`${row.type} Gasket NPS ${row.nps}" #${row.class_rating}`} fontSize={8} />
    </svg>
  );
}

export function ValveEnvelopeSVG({ row }: { row: ValveRow }) {
  const w = 260; const h = 220;
  const cx = w / 2; const cy = 130;
  const bodyW = 60; const bodyH = 50;
  const stemH = row.height_mm ? 40 : 30;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[280px]">
      <rect x={cx - bodyW / 2} y={cy - bodyH / 2} width={bodyW} height={bodyH} rx={4} {...SECTION_FILL} />
      <line x1={cx - bodyW / 2 - 30} y1={cy} x2={cx - bodyW / 2} y2={cy} {...OUTLINE_STYLE} strokeWidth={2} />
      <line x1={cx + bodyW / 2} y1={cy} x2={cx + bodyW / 2 + 30} y2={cy} {...OUTLINE_STYLE} strokeWidth={2} />
      <line x1={cx} y1={cy - bodyH / 2} x2={cx} y2={cy - bodyH / 2 - stemH} {...OUTLINE_STYLE} strokeWidth={1.5} />
      {row.type === "GATE" && <circle cx={cx} cy={cy - bodyH / 2 - stemH - 10} r={10} {...OUTLINE_STYLE} />}
      {row.type === "GLOBE" && <circle cx={cx} cy={cy - bodyH / 2 - stemH - 10} r={10} {...OUTLINE_STYLE} />}
      {row.type === "BALL" && <circle cx={cx} cy={cy} r={12} fill="none" stroke="#64748b" strokeWidth={0.8} />}
      {row.face_to_face_mm && (
        <DimLine x1={cx - bodyW / 2 - 30} y1={cy + bodyH / 2 + 12} x2={cx + bodyW / 2 + 30} y2={cy + bodyH / 2 + 12} label={`F-F ${row.face_to_face_mm}`} offset={20} />
      )}
      <LabelWithBg x={cx} y={18} text={`${row.type} Valve NPS ${row.nps}" #${row.class_rating}`} fontSize={8} />
    </svg>
  );
}

export function LineBlankSVG({ row }: { row: LineBlankRow }) {
  const w = 300; const h = 190;
  const cx = w / 2; const cy = h / 2;
  const diskR = 40;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[320px]">
      {row.type === "SPECTACLE" ? (
        <>
          <circle cx={cx - 50} cy={cy} r={diskR} {...SECTION_FILL} />
          <circle cx={cx - 50} cy={cy} r={diskR * 0.65} fill="#0c1222" stroke="#94a3b8" strokeWidth={1} />
          <circle cx={cx + 50} cy={cy} r={diskR} {...SECTION_FILL} />
          <line x1={cx - 50 + diskR} y1={cy - 5} x2={cx + 50 - diskR} y2={cy - 5} {...OUTLINE_STYLE} />
          <line x1={cx - 50 + diskR} y1={cy + 5} x2={cx + 50 - diskR} y2={cy + 5} {...OUTLINE_STYLE} />
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
          <circle cx={cx} cy={cy} r={diskR * 0.65} fill="#0c1222" stroke="#94a3b8" strokeWidth={1} />
          <line x1={cx} y1={cy - diskR} x2={cx + diskR + 30} y2={cy - diskR} {...OUTLINE_STYLE} />
        </>
      )}
      <LabelWithBg x={cx} y={h - 10} text={`${row.type} NPS ${row.nps}" #${row.class_rating}`} fontSize={8} />
    </svg>
  );
}

export function OletSVG({ row }: { row: OletRow }) {
  const w = 240; const h = 210;
  const cx = w / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[260px]">
      <ellipse cx={cx} cy={165} rx={80} ry={20} {...OUTLINE_STYLE} strokeWidth={2} />
      <line x1={cx - 15} y1={165} x2={cx - 15} y2={60} {...OUTLINE_STYLE} strokeWidth={2} />
      <line x1={cx + 15} y1={165} x2={cx + 15} y2={60} {...OUTLINE_STYLE} strokeWidth={2} />
      <line x1={cx - 15} y1={60} x2={cx + 15} y2={60} {...OUTLINE_STYLE} />
      <path d={`M${cx - 25},${160} Q${cx - 25},${145} ${cx - 15},${135}`} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
      <path d={`M${cx + 25},${160} Q${cx + 25},${145} ${cx + 15},${135}`} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
      {row.height_mm && (
        <DimLine x1={cx + 22} y1={60} x2={cx + 22} y2={160} label={`H=${row.height_mm}`} offset={28} />
      )}
      <LabelWithBg x={cx} y={18} text={`${row.type} ${row.run_nps}"x${row.branch_nps}"`} fontSize={8} />
    </svg>
  );
}

export function FittingSVG({ row }: { row: FittingRow }) {
  if (row.type === "TEE") return <TeeSVG row={row} />;
  if (row.type === "RED_CON" || row.type === "RED_ECC") return <ReducerSVG row={row} />;
  return <ElbowSVG row={row} />;
}
