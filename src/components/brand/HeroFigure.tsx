/**
 * 랜딩용 일러스트 — AI로 만든 얼굴 없는 인체 일러스트(public/brand/hero-figure.webp) 위에
 * 포즈 추적 HUD(관절점·측정선)를 겹친 장식용 도식입니다. 실제 인물이나 분석 결과가 아닙니다.
 * 관절 좌표(J)는 일러스트의 관절 위치(뷰박스 320×470 기준)에 맞춰 둔 값입니다.
 */
const J = {
  head: [160, 47],
  ls: [124, 100],
  rs: [196, 100],
  le: [103, 165],
  re: [217, 165],
  lw: [92, 213],
  rw: [228, 213],
  lh: [136, 206],
  rh: [184, 206],
  lk: [140, 320],
  rk: [182, 320],
  la: [124, 410],
  ra: [194, 410],
} as const;
type K = keyof typeof J;

const BONES: Array<[K, K]> = [
  ["ls", "rs"], ["ls", "le"], ["le", "lw"], ["rs", "re"], ["re", "rw"], ["ls", "lh"], ["rs", "rh"], ["lh", "rh"],
  ["lh", "lk"], ["lk", "la"], ["rh", "rk"], ["rk", "ra"],
];

const FIGURE_SRC = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/brand/hero-figure.webp`;

export function HeroFigure({ className }: { className?: string }) {
  const sm = [(J.ls[0] + J.rs[0]) / 2, J.ls[1]];
  const hm = [(J.lh[0] + J.rh[0]) / 2, J.lh[1]];
  const ankleY = J.la[1];
  return (
    <svg viewBox="0 0 320 470" className={className} role="img" aria-label="전신 포즈 추적 HUD 예시 도식 (실제 인물 아님)">
      <defs>
        <linearGradient id="hf-scan" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.85" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.22" />
        </linearGradient>
        <clipPath id="hf-clip">
          <rect width="320" height="470" rx="28" />
        </clipPath>
      </defs>
      <rect width="320" height="470" rx="28" fill="#121216" />

      {/* 프레이밍 가이드 */}
      <g stroke="#fff" strokeOpacity="0.5" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M24 64V32h32M264 32h32v32M296 420v32h-32M56 452H24v-32" />
      </g>
      <line x1="40" x2="280" y1="38" y2="38" stroke="#fff" strokeOpacity="0.2" strokeDasharray="3 5" />
      <line x1="40" x2="280" y1="446" y2="446" stroke="#fff" strokeOpacity="0.2" strokeDasharray="3 5" />

      {/* 인체 일러스트 (살짝 어둡게 해서 HUD가 잘 보이게) */}
      <image href={FIGURE_SRC} x="0" y="0" width="320" height="470" preserveAspectRatio="xMidYMid slice" clipPath="url(#hf-clip)" opacity="0.82" />

      {/* 측정선 */}
      <g stroke="#fff" strokeDasharray="5 4" strokeWidth="1.2" strokeOpacity="0.9">
        <line x1="106" x2="214" y1={J.ls[1]} y2={J.rs[1]} />
        <line x1="114" x2="206" y1={J.lh[1]} y2={J.rh[1]} />
      </g>
      <g fill="#fff" fontSize="10" fontFamily="ui-sans-serif, system-ui, sans-serif" fontWeight="600">
        <rect x="244" y={J.ls[1] - 10} width="44" height="20" rx="10" fill="#000" fillOpacity="0.6" />
        <text x="266" y={J.ls[1] + 4} textAnchor="middle">어깨선</text>
        <rect x="244" y={J.lh[1] - 10} width="44" height="20" rx="10" fill="#000" fillOpacity="0.6" />
        <text x="266" y={J.lh[1] + 4} textAnchor="middle">골반선</text>
      </g>

      {/* 몸통/다리 눈금자 */}
      <g stroke="#fff" strokeWidth="1.6" strokeOpacity="0.9">
        <line x1="62" x2="62" y1={sm[1] + 3} y2={hm[1] - 3} />
        <line x1="62" x2="62" y1={hm[1] + 3} y2={ankleY - 3} />
        {[sm[1] + 3, hm[1] - 3, hm[1] + 3, ankleY - 3].map((y) => (
          <line key={y} x1="57" x2="67" y1={y} y2={y} />
        ))}
      </g>
      <g fill="#fff" fillOpacity="0.75" fontSize="9" fontFamily="ui-sans-serif, system-ui, sans-serif">
        <text x="72" y={(sm[1] + hm[1]) / 2 + 3}>몸통</text>
        <text x="72" y={(hm[1] + ankleY) / 2 + 3}>다리</text>
      </g>

      {/* 관절 연결선 */}
      <g stroke="#fff" strokeOpacity="0.9" strokeWidth="2" strokeLinecap="round">
        {BONES.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={J[a][0]} y1={J[a][1]} x2={J[b][0]} y2={J[b][1]} />
        ))}
      </g>
      <g fill="#fff">
        {(Object.keys(J) as K[]).map((k) => (
          <g key={k}>
            <circle cx={J[k][0]} cy={J[k][1]} r="3" />
            <circle cx={J[k][0]} cy={J[k][1]} r="8" fill="none" stroke="#fff" strokeOpacity="0.3" />
          </g>
        ))}
      </g>

      {/* 스캔 효과 (동작 줄이기 설정 시 숨김) */}
      <g clipPath="url(#hf-clip)" className="ff-scan-svg">
        <rect x="0" y="-120" width="320" height="120" fill="url(#hf-scan)">
          <animate attributeName="y" from="-120" to="470" dur="3.6s" repeatCount="indefinite" />
        </rect>
      </g>

      <g fontFamily="ui-sans-serif, system-ui, sans-serif" fontSize="10" fill="#fff">
        <circle cx="34" cy="18" r="3" fill="#6FD39A" />
        <text x="42" y="21" fillOpacity="0.8">33 LANDMARKS · ON-DEVICE</text>
      </g>
    </svg>
  );
}
