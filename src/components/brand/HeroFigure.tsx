/**
 * 랜딩용 추상 일러스트 — 실제 인물 데이터가 아닌 장식용 도식입니다.
 * 윤곽은 관절 좌표(J)에서 직접 만든 캡슐 형태라 관절점과 항상 맞물립니다.
 */
const J = {
  head: [160, 70],
  ls: [124, 124],
  rs: [196, 124],
  le: [112, 198],
  re: [208, 198],
  lw: [106, 266],
  rw: [214, 266],
  lh: [142, 252],
  rh: [178, 252],
  lk: [140, 346],
  rk: [180, 346],
  la: [138, 430],
  ra: [182, 430],
} as const;
type K = keyof typeof J;

const BONES: Array<[K, K]> = [
  ["ls", "rs"], ["ls", "le"], ["le", "lw"], ["rs", "re"], ["re", "rw"], ["ls", "lh"], ["rs", "rh"], ["lh", "rh"],
  ["lh", "lk"], ["lk", "la"], ["rh", "rk"], ["rk", "ra"],
];

/** 신체 부위 캡슐: [시작, 끝, 두께] */
const LIMBS: Array<[K, K, number]> = [
  ["ls", "le", 24], ["le", "lw", 18], ["rs", "re", 24], ["re", "rw", 18],
  ["lh", "lk", 34], ["lk", "la", 25], ["rh", "rk", 34], ["rk", "ra", 25],
];

/** 몸통: 어깨 바깥 → 허리 → 골반 바깥 */
const TORSO = "M112 120 Q160 108 208 120 L202 168 Q190 206 194 228 L197 262 L123 262 L126 228 Q130 206 118 168 Z";

function BodyShapes({ grow }: { grow: number }) {
  const [hx, hy] = J.head;
  return (
    <>
      <ellipse cx={hx} cy={hy} rx={21 + grow / 2} ry={26 + grow / 2} />
      <rect x={151 - grow / 2} y={88} width={18 + grow} height={34} rx={6} />
      <path d={TORSO} strokeWidth={grow} strokeLinejoin="round" />
      {LIMBS.map(([a, b, w]) => (
        <line key={`${a}-${b}`} x1={J[a][0]} y1={J[a][1]} x2={J[b][0]} y2={J[b][1]} strokeWidth={w + grow} strokeLinecap="round" />
      ))}
      {/* 손, 발 */}
      <circle cx={J.lw[0] - 1} cy={J.lw[1] + 12} r={9 + grow / 2} />
      <circle cx={J.rw[0] + 1} cy={J.rw[1] + 12} r={9 + grow / 2} />
      <ellipse cx={J.la[0] - 6} cy={J.la[1] + 10} rx={15 + grow / 2} ry={7 + grow / 2} />
      <ellipse cx={J.ra[0] + 6} cy={J.ra[1] + 10} rx={15 + grow / 2} ry={7 + grow / 2} />
    </>
  );
}

export function HeroFigure({ className }: { className?: string }) {
  const sm = [(J.ls[0] + J.rs[0]) / 2, J.ls[1]];
  const hm = [(J.lh[0] + J.rh[0]) / 2, J.lh[1]];
  const ankleY = J.la[1];
  return (
    <svg viewBox="0 0 320 470" className={className} role="img" aria-label="전신 포즈 추적 HUD 예시 도식 (실제 인물 아님)">
      <defs>
        <linearGradient id="hf-bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1B1D22" />
          <stop offset="1" stopColor="#0E0F12" />
        </linearGradient>
        <linearGradient id="hf-scan" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.85" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.22" />
        </linearGradient>
        <clipPath id="hf-clip">
          <rect width="320" height="470" rx="28" />
        </clipPath>
      </defs>
      <rect width="320" height="470" rx="28" fill="url(#hf-bg)" />

      {/* 프레이밍 가이드 */}
      <g stroke="#fff" strokeOpacity="0.5" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M24 64V32h32M264 32h32v32M296 420v32h-32M56 452H24v-32" />
      </g>
      <line x1="40" x2="280" y1="38" y2="38" stroke="#fff" strokeOpacity="0.2" strokeDasharray="3 5" />
      <line x1="40" x2="280" y1="446" y2="446" stroke="#fff" strokeOpacity="0.2" strokeDasharray="3 5" />

      {/* 인체 윤곽: 굵은 외곽 레이어 위에 배경색 레이어를 겹쳐 합집합 외곽선만 남김 */}
      <g fill="#C9CCD3" stroke="#C9CCD3" opacity="0.6">
        <BodyShapes grow={3} />
      </g>
      <g fill="#1A1C21" stroke="#1A1C21">
        <BodyShapes grow={0} />
      </g>

      {/* 측정선 */}
      <g stroke="#fff" strokeDasharray="5 4" strokeWidth="1.2" strokeOpacity="0.9">
        <line x1="98" x2="222" y1={J.ls[1]} y2={J.rs[1]} />
        <line x1="116" x2="204" y1={J.lh[1]} y2={J.rh[1]} />
      </g>
      <g fill="#fff" fontSize="10" fontFamily="ui-sans-serif, system-ui, sans-serif" fontWeight="600">
        <rect x="230" y={J.ls[1] - 10} width="44" height="20" rx="10" fill="#000" fillOpacity="0.6" />
        <text x="252" y={J.ls[1] + 4} textAnchor="middle">어깨선</text>
        <rect x="230" y={J.lh[1] - 10} width="44" height="20" rx="10" fill="#000" fillOpacity="0.6" />
        <text x="252" y={J.lh[1] + 4} textAnchor="middle">골반선</text>
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
