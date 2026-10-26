import type { Slot } from "./types";

/**
 * 퍼스널 컬러 (사용자가 알고 있는 경우에만 직접 선택)
 * - 앱이 피부·사진으로 퍼스널 컬러를 진단하지는 않습니다. 사용자가 고른 시즌을 기준으로 컬러·액세서리를 제안합니다.
 * - 팔레트는 4계절 이론의 일반적인 가이드를 단순화한 값이며, 개인차가 있습니다.
 * - 의류 컬러 판정은 CIELAB 색차(ΔE76)로 시즌 팔레트와 가장 가까운 색을 찾는 단순 규칙입니다(검증되지 않은 초기값).
 */
export type PersonalColor = "spring" | "summer" | "autumn" | "winter";

export interface Swatch {
  name: string;
  hex: string;
}

export interface PersonalColorPalette {
  label: string;
  short: string;
  /** 한 줄 특징 */
  summary: string;
  /** 얼굴 가까이 두면 좋은 포인트 컬러 */
  best: Swatch[];
  /** 코디의 바탕이 되는 기본 컬러 */
  neutrals: Swatch[];
  /** 얼굴 가까이는 피하고, 쓴다면 하의·신발처럼 먼 곳에 */
  caution: Swatch[];
  accessories: Array<{ label: string; value: string }>;
}

export const PERSONAL_COLOR: Record<PersonalColor, PersonalColorPalette> = {
  spring: {
    label: "봄 웜",
    short: "봄",
    summary: "밝고 따뜻하며 맑은 컬러가 얼굴을 생기 있게 보여 줘요.",
    best: [
      { name: "코랄", hex: "#F27D6B" },
      { name: "피치", hex: "#F6B494" },
      { name: "웜 옐로", hex: "#F3C75F" },
      { name: "애플 그린", hex: "#9CC36B" },
      { name: "아쿠아", hex: "#4DBDB5" },
      { name: "클리어 블루", hex: "#5A9BD5" },
    ],
    neutrals: [
      { name: "아이보리", hex: "#F3ECDD" },
      { name: "웜 베이지", hex: "#DCC5A3" },
      { name: "라이트 카멜", hex: "#C49C6E" },
      { name: "밀크 브라운", hex: "#A0785A" },
      { name: "라이트 네이비", hex: "#3E4F72" },
      { name: "라이트 데님", hex: "#8FAFD3" },
    ],
    caution: [
      { name: "블랙", hex: "#141416" },
      { name: "차가운 회색", hex: "#8E949C" },
      { name: "버건디", hex: "#6B1F33" },
    ],
    accessories: [
      { label: "메탈", value: "옐로 골드, 로즈 골드" },
      { label: "주얼리", value: "아이보리 진주, 코랄·피치 톤 스톤" },
      { label: "가방·신발", value: "카멜, 라이트 탄 레더" },
      { label: "안경", value: "라이트 브라운·골드 프레임" },
      { label: "스카프", value: "코랄, 피치, 라이트 옐로" },
    ],
  },
  summer: {
    label: "여름 쿨",
    short: "여름",
    summary: "밝고 부드러운 쿨톤, 회색이 살짝 섞인 파스텔이 얼굴을 맑게 보여 줘요.",
    best: [
      { name: "라벤더", hex: "#B9A9D6" },
      { name: "파우더 블루", hex: "#A9C4E2" },
      { name: "로즈 핑크", hex: "#E3A1B5" },
      { name: "민트", hex: "#A9D9C8" },
      { name: "스카이 블루", hex: "#8FB7DE" },
      { name: "소프트 라즈베리", hex: "#C46C8E" },
    ],
    neutrals: [
      { name: "소프트 화이트", hex: "#F4F4F2" },
      { name: "라이트 그레이", hex: "#C8CBD0" },
      { name: "블루 그레이", hex: "#7D8A9C" },
      { name: "그레이시 네이비", hex: "#44506A" },
      { name: "차콜 그레이", hex: "#55585E" },
      { name: "로즈 베이지", hex: "#D9C3BE" },
    ],
    caution: [
      { name: "오렌지", hex: "#E8742A" },
      { name: "카멜", hex: "#B5926A" },
      { name: "머스터드", hex: "#C9A13B" },
      { name: "블랙", hex: "#141416" },
    ],
    accessories: [
      { label: "메탈", value: "실버, 화이트 골드" },
      { label: "주얼리", value: "화이트 진주, 블루·라벤더 톤 스톤" },
      { label: "가방·신발", value: "그레이, 네이비, 로즈 베이지 레더" },
      { label: "안경", value: "실버·클리어·그레이 프레임" },
      { label: "스카프", value: "라벤더, 파우더 블루, 로즈 핑크" },
    ],
  },
  autumn: {
    label: "가을 웜",
    short: "가을",
    summary: "깊고 차분한 웜톤, 흙과 나무를 닮은 컬러가 얼굴을 안정감 있게 보여 줘요.",
    best: [
      { name: "테라코타", hex: "#B8613F" },
      { name: "머스터드", hex: "#C9A13B" },
      { name: "올리브", hex: "#6E7349" },
      { name: "카키", hex: "#8A8456" },
      { name: "브릭", hex: "#A8502F" },
      { name: "딥 틸", hex: "#2F6E6A" },
    ],
    neutrals: [
      { name: "크림", hex: "#EDE2CC" },
      { name: "웜 베이지", hex: "#CDB89A" },
      { name: "카멜", hex: "#B5926A" },
      { name: "초콜릿 브라운", hex: "#5B3F2E" },
      { name: "다크 올리브", hex: "#4A4A32" },
      { name: "인디고 데님", hex: "#4D6A93" },
    ],
    caution: [
      { name: "퓨어 화이트", hex: "#FFFFFF" },
      { name: "핫핑크", hex: "#E0457B" },
      { name: "아이시 블루", hex: "#DDE9F5" },
      { name: "블루 그레이", hex: "#7D8A9C" },
    ],
    accessories: [
      { label: "메탈", value: "앤티크 골드, 브론즈" },
      { label: "주얼리", value: "호박·타이거아이, 우드" },
      { label: "가방·신발", value: "브라운, 코냑 레더, 스웨이드" },
      { label: "안경", value: "토토이즈(별갑)·브라운 프레임" },
      { label: "스카프", value: "테라코타, 머스터드, 올리브" },
    ],
  },
  winter: {
    label: "겨울 쿨",
    short: "겨울",
    summary: "선명하고 대비가 강한 쿨톤이 얼굴을 또렷하게 보여 줘요.",
    best: [
      { name: "트루 레드", hex: "#C8102E" },
      { name: "로열 블루", hex: "#2547A8" },
      { name: "에메랄드", hex: "#00876C" },
      { name: "퓨셔", hex: "#C2307E" },
      { name: "아이시 블루", hex: "#DDE9F5" },
      { name: "딥 퍼플", hex: "#5B2A86" },
    ],
    neutrals: [
      { name: "블랙", hex: "#141416" },
      { name: "퓨어 화이트", hex: "#FFFFFF" },
      { name: "차콜", hex: "#33353A" },
      { name: "네이비", hex: "#1F2A44" },
      { name: "쿨 그레이", hex: "#8E949C" },
      { name: "다크 데님", hex: "#4F6E9C" },
    ],
    caution: [
      { name: "베이지", hex: "#DCC5A3" },
      { name: "카멜", hex: "#B5926A" },
      { name: "머스터드", hex: "#C9A13B" },
      { name: "오렌지 브라운", hex: "#A0602F" },
    ],
    accessories: [
      { label: "메탈", value: "실버, 플래티넘, 화이트 골드" },
      { label: "주얼리", value: "다이아·큐빅, 블랙 오닉스" },
      { label: "가방·신발", value: "블랙, 버건디, 네이비 레더(광택 가능)" },
      { label: "안경", value: "블랙·실버 메탈 프레임" },
      { label: "스카프", value: "트루 레드, 로열 블루, 블랙&화이트" },
    ],
  },
};

export const PERSONAL_COLOR_ORDER: PersonalColor[] = ["spring", "summer", "autumn", "winter"];

export function isPersonalColor(v: unknown): v is PersonalColor {
  return typeof v === "string" && v in PERSONAL_COLOR;
}

// ── 색 판정 ───────────────────────────────────────────────────

type Lab = [number, number, number];

function hexToLab(hex: string): Lab {
  const n = parseInt(hex.replace("#", ""), 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)];
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = hexToLab(a);
  const [l2, a2, b2] = hexToLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

export type ColorFit = "good" | "neutral" | "caution";

/** 좋은 컬러(포인트+기본)와의 색차가 이 값 이하면 잘 맞음 */
export const COLOR_GOOD_DELTA = 18;

export interface ColorMatch {
  fit: ColorFit;
  /** 가장 가까운 팔레트 색 (잘 맞음·주의일 때) */
  nearest: Swatch | null;
}

export function colorMatch(hex: string, season: PersonalColor): ColorMatch {
  const p = PERSONAL_COLOR[season];
  const near = (list: Swatch[]) =>
    list.reduce<{ s: Swatch | null; d: number }>((best, s) => {
      const d = deltaE(hex, s.hex);
      return d < best.d ? { s, d } : best;
    }, { s: null, d: Infinity });
  const good = near([...p.best, ...p.neutrals]);
  const bad = near(p.caution);
  // 주의 컬러에 더 가까우면 우선 주의 (예: 가을 웜의 퓨어 화이트는 크림보다 화이트에 가까움)
  if (bad.d < good.d && bad.d <= COLOR_GOOD_DELTA * 1.5) return { fit: "caution", nearest: bad.s };
  if (good.d <= COLOR_GOOD_DELTA) return { fit: "good", nearest: good.s };
  return { fit: "neutral", nearest: null };
}

/** 얼굴과 가까운 아이템일수록 퍼스널 컬러 영향이 큼 */
export const FACE_PROXIMITY: Record<Slot, number> = {
  top: 1,
  dress: 1,
  outer: 0.9,
  accessory: 0.6,
  bottom: 0.4,
  shoes: 0.2,
};

export const COLOR_FIT_SCORE: Record<ColorFit, number> = { good: 1, neutral: 0, caution: -1 };

// ── 코디 컬러 메모 ─────────────────────────────────────────────

export interface OutfitColorNote {
  good: string[];
  /** 주의 컬러 아이템과 어떻게 다루면 좋을지 */
  caution: Array<{ name: string; tip: string }>;
  accessory: string;
}

/** 코디 아이템별 퍼스널 컬러 판정을 사람이 읽을 메모로 정리 */
export function outfitColorNote(items: Array<{ name: string; color: string; slot: Slot }>, season: PersonalColor): OutfitColorNote {
  const p = PERSONAL_COLOR[season];
  const point = p.best.slice(0, 2).map((s) => s.name).join("·");
  const good: string[] = [];
  const caution: OutfitColorNote["caution"] = [];
  for (const it of items) {
    const m = colorMatch(it.color, season);
    if (m.fit === "good") good.push(it.name);
    else if (m.fit === "caution") {
      const nearFace = FACE_PROXIMITY[it.slot] >= 0.9;
      caution.push({
        name: it.name,
        tip: nearFace
          ? `얼굴 가까이 ${m.nearest?.name ?? "주의"} 톤이 와요. 목 주변에 ${point} 계열 스카프나 액세서리를 더하면 얼굴빛이 살아나요.`
          : `얼굴에서 먼 아이템이라 부담이 적어요. 상의는 ${p.label} 컬러로 맞춰 주세요.`,
      });
    }
  }
  const metal = p.accessories.find((a) => a.label === "메탈")?.value ?? "";
  return { good, caution, accessory: `액세서리는 ${metal} 톤으로 맞추면 좋아요.` };
}
