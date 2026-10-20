import { MANNEQUIN as M, bodyHalfAt, type Silhouette } from "@/lib/fitlab/silhouette";

/** 표준 도식(마네킹) 몸 윤곽 — 사용자 신체가 아닌 고정 형태 */
function mannequinPath(): string {
  const ys = [M.shoulderY, 90, 110, 130, M.waistY, 170, M.hipY, M.crotchY];
  const right = ys.map((y) => `${M.cx + bodyHalfAt(y)} ${y}`);
  const left = [...ys].reverse().map((y) => `${M.cx - bodyHalfAt(y)} ${y}`);
  return `M${M.cx - 7} ${M.shoulderY - 10} L${M.cx + 7} ${M.shoulderY - 10} L${right.join(" L")} L${left.join(" L")} Z`;
}
const BODY = mannequinPath();

export function SilhouetteFigure({
  sil,
  label,
  colors = { top: "#C9D4E3", bottom: "#3A3F4A", outer: "#B59A7A" },
}: {
  sil: Silhouette;
  label: string;
  colors?: { top: string; bottom: string; outer: string };
}) {
  const cx = M.cx;
  return (
    <svg viewBox="0 0 200 440" role="img" aria-label={label} className="h-auto w-full">
      {/* 마네킹 */}
      <g fill="#E7E5E0">
        <circle cx={cx} cy={M.headCy} r={M.headR} />
        <path d={BODY} />
        <line x1={cx - M.shoulderHalf + 4} y1={M.shoulderY + 4} x2={cx - M.shoulderHalf - 8} y2={222} stroke="#E7E5E0" strokeWidth={13} strokeLinecap="round" />
        <line x1={cx + M.shoulderHalf - 4} y1={M.shoulderY + 4} x2={cx + M.shoulderHalf + 8} y2={222} stroke="#E7E5E0" strokeWidth={13} strokeLinecap="round" />
        <line x1={cx - M.legOffset} y1={M.crotchY - 6} x2={cx - M.legOffset} y2={M.ankleY + 6} stroke="#E7E5E0" strokeWidth={20} strokeLinecap="round" />
        <line x1={cx + M.legOffset} y1={M.crotchY - 6} x2={cx + M.legOffset} y2={M.ankleY + 6} stroke="#E7E5E0" strokeWidth={20} strokeLinecap="round" />
      </g>
      {/* 신발 */}
      <g fill="#2A2522">
        <ellipse cx={cx - M.legOffset - 3} cy={M.floorY - 6} rx={14} ry={6} />
        <ellipse cx={cx + M.legOffset + 3} cy={M.floorY - 6} rx={14} ry={6} />
      </g>
      {/* 하의 → 상의 → 아우터 순서 (넣어 입으면 상의가 하의 안쪽처럼 보이도록 하의를 위에) */}
      <g stroke="#121316" strokeOpacity={0.25} strokeWidth={1.2} strokeLinejoin="round">
        {!sil.tucked && <path d={sil.bottom} fill={colors.bottom} />}
        <path d={sil.sleeves[0]} fill={colors.top} />
        <path d={sil.sleeves[1]} fill={colors.top} />
        <path d={sil.top} fill={colors.top} />
        {sil.tucked && <path d={sil.bottom} fill={colors.bottom} />}
        {sil.outer && (
          <>
            {sil.outerSleeves?.map((d, i) => <path key={i} d={d} fill={colors.outer} />)}
            <path d={sil.outer[0]} fill={colors.outer} fillOpacity={0.92} />
            <path d={sil.outer[1]} fill={colors.outer} fillOpacity={0.92} />
          </>
        )}
      </g>
      {/* 시각 경계선 (상의가 끝나고 하의가 시작되는 지점) */}
      <g>
        <line x1={14} x2={186} y1={sil.breakY} y2={sil.breakY} stroke="#D16A89" strokeWidth={1.2} strokeDasharray="4 3" />
        <line x1={10} x2={10} y1={M.headTop} y2={sil.breakY - 2} stroke="#121316" strokeOpacity={0.5} strokeWidth={1.2} />
        <line x1={10} x2={10} y1={sil.breakY + 2} y2={M.floorY} stroke="#121316" strokeOpacity={0.5} strokeWidth={1.2} />
      </g>
    </svg>
  );
}
