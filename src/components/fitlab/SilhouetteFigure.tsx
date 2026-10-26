import { MANNEQUIN as M, bodyHalfAt, type Silhouette } from "@/lib/fitlab/silhouette";

/**
 * 표준 크로키(고정 형태) 위에 옷을 테크니컬 플랫(선 도면) 스타일로 그린 도해.
 * 사용자 신체가 아닌 고정 비율이며, 몸은 옅은 가이드 실루엣으로만 표시합니다.
 */
const r = (n: number) => Math.round(n * 10) / 10;

/** 몸통 + 다리 + 팔을 하나의 외곽선으로 (얇아지는 팔다리) */
function croquisPath(): string {
  const cx = M.cx;
  const ys = [M.shoulderY + 6, 90, 110, 130, M.waistY, 170, M.hipY, M.crotchY];
  const right = ys.map((y) => [cx + bodyHalfAt(y), y] as const);
  const left = [...ys].reverse().map((y) => [cx - bodyHalfAt(y), y] as const);
  const legOuter = M.legOffset + 13;
  const legInner = M.legOffset - 8;
  const ankle = 6;
  const pts: Array<readonly [number, number]> = [
    [cx - 6, M.shoulderY - 12],
    [cx + 6, M.shoulderY - 12],
    [cx + 9, M.shoulderY - 2],
    [cx + M.shoulderHalf - 2, M.shoulderY],
    ...right,
    [cx + legOuter, M.crotchY + 10],
    [cx + M.legOffset + 9, M.kneeY],
    [cx + M.legOffset + ankle, M.ankleY],
    [cx + M.legOffset - ankle, M.ankleY],
    [cx + legInner + 2, M.kneeY],
    [cx + 2, M.crotchY + 4],
    [cx - 2, M.crotchY + 4],
    [cx - legInner - 2, M.kneeY],
    [cx - M.legOffset + ankle, M.ankleY],
    [cx - M.legOffset - ankle, M.ankleY],
    [cx - M.legOffset - 9, M.kneeY],
    [cx - legOuter, M.crotchY + 10],
    ...left,
    [cx - M.shoulderHalf + 2, M.shoulderY],
    [cx - 9, M.shoulderY - 2],
  ];
  return "M" + pts.map(([x, y]) => `${r(x)} ${r(y)}`).join(" L") + " Z";
}

function armPath(side: 1 | -1): string {
  const cx = M.cx;
  const s = (x: number) => cx + side * x;
  return `M${s(M.shoulderHalf - 4)} ${M.shoulderY + 2} L${s(M.shoulderHalf + 4)} ${M.shoulderY + 8} L${s(M.shoulderHalf + 12)} 218 L${s(M.shoulderHalf + 5)} 220 L${s(M.shoulderHalf - 4)} 120 Z`;
}

const CROQUIS = croquisPath();
const ARMS = [armPath(-1), armPath(1)];
const INK = "#121316";

export function SilhouetteFigure({
  sil,
  label,
  colors = { top: "#FFFFFF", bottom: "#E4E2DD", outer: "#CFC8BC" },
}: {
  sil: Silhouette;
  label: string;
  colors?: { top: string; bottom: string; outer: string };
}) {
  const cx = M.cx;
  return (
    <svg viewBox="0 0 200 440" role="img" aria-label={label} className="h-auto w-full">
      {/* 바닥·눈금 가이드 */}
      <g stroke={INK} strokeOpacity={0.12} strokeWidth={0.8}>
        {[M.headTop, M.shoulderY, M.waistY, M.hipY, M.kneeY, M.floorY].map((y) => (
          <line key={y} x1={22} x2={188} y1={y} y2={y} strokeDasharray="2 3" />
        ))}
      </g>

      {/* 크로키 (고정 비율 가이드 실루엣) */}
      <g fill="#ECEAE6" stroke={INK} strokeOpacity={0.18} strokeWidth={0.8} strokeLinejoin="round">
        <path d={ARMS[0]} />
        <path d={ARMS[1]} />
        <path d={CROQUIS} />
      </g>

      <ellipse cx={cx} cy={M.headCy} rx={M.headR - 5} ry={M.headR} fill="none" stroke={INK} strokeOpacity={0.22} strokeWidth={0.8} />

      {/* 하의 → 상의 → 아우터 (넣어 입으면 상의가 하의 안쪽처럼 보이도록 하의를 위에) */}
      <g stroke={INK} strokeWidth={1.3} strokeLinejoin="round">
        {!sil.tucked && <path d={sil.bottom} fill={colors.bottom} />}
        <path d={sil.sleeves[0]} fill={colors.top} />
        <path d={sil.sleeves[1]} fill={colors.top} />
        <path d={sil.top} fill={colors.top} />
        {sil.tucked && <path d={sil.bottom} fill={colors.bottom} />}
        {sil.outer && (
          <>
            {sil.outerSleeves?.map((d, i) => <path key={i} d={d} fill={colors.outer} />)}
            <path d={sil.outer[0]} fill={colors.outer} />
            <path d={sil.outer[1]} fill={colors.outer} />
          </>
        )}
      </g>
      {/* 앞 중심선 (도면 표기) */}
      <line x1={cx} x2={cx} y1={M.shoulderY + 4} y2={sil.breakY - 2} stroke={INK} strokeOpacity={0.35} strokeWidth={0.7} strokeDasharray="3 2" />

      {/* 시각 경계선 (상의가 끝나고 하의가 시작되는 지점) + 상·하 길이 치수선 */}
      <g>
        <line x1={14} x2={190} y1={sil.breakY} y2={sil.breakY} stroke="#D16A89" strokeWidth={1.1} strokeDasharray="4 3" />
        <g stroke={INK} strokeOpacity={0.6} strokeWidth={1}>
          <line x1={10} x2={10} y1={M.headTop} y2={sil.breakY - 2} />
          <line x1={10} x2={10} y1={sil.breakY + 2} y2={M.floorY} />
          {[M.headTop, sil.breakY - 2, sil.breakY + 2, M.floorY].map((y) => (
            <line key={y} x1={6} x2={14} y1={y} y2={y} />
          ))}
        </g>
      </g>
    </svg>
  );
}
