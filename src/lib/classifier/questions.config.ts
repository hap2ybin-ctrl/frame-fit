import type { TypeScores } from "./types";

/**
 * 보완 자가 체크 문항 (설정 파일)
 *
 * ⚠️ 검증되지 않은 초기 가중치입니다. 문항별 점수는 일반적인 골격 유형 설명을 단순화해
 *    옮긴 것이며, 통계적으로 검증된 설문 도구가 아닙니다.
 * - 외모 평가가 아니라 "만졌을 때/거울로 볼 때의 느낌"을 묻는 중립적 표현을 사용합니다.
 * - 모든 문항에 "잘 모르겠어요"가 있으며, 이 응답은 점수에 반영하지 않고 응답 수에서도 제외합니다.
 */

export interface QuestionOption {
  id: string;
  label: string;
  hint?: string;
  points: Partial<TypeScores>;
}

export interface Question {
  id: string;
  topic: string;
  title: string;
  howTo: string;
  options: QuestionOption[];
}

export const UNKNOWN_OPTION_ID = "unknown";

export const QUESTIONS: Question[] = [
  {
    id: "torso-depth",
    topic: "상체의 앞뒤 두께",
    title: "옆에서 봤을 때 상체(가슴~갈비뼈)의 앞뒤 두께는 어떤 느낌인가요?",
    howTo: "거울 앞에서 몸을 옆으로 돌리고, 손바닥을 가슴 앞과 등 뒤에 대어 보세요.",
    options: [
      { id: "thick", label: "앞뒤로 두께감이 있는 편", hint: "갈비뼈 주변이 입체적으로 느껴져요", points: { straight: 2 } },
      { id: "thin", label: "앞뒤가 얇고 평평한 편", hint: "옆에서 보면 상체가 얇아 보여요", points: { wave: 2 } },
      { id: "frame", label: "두께보다는 가로 폭·뼈대가 느껴지는 편", hint: "어깨와 등의 골격 프레임이 먼저 느껴져요", points: { natural: 2 } },
    ],
  },
  {
    id: "collarbone",
    topic: "쇄골",
    title: "거울로 볼 때 쇄골은 어떻게 보이나요?",
    howTo: "어깨에 힘을 빼고 정면에서 확인해 보세요.",
    options: [
      { id: "subtle", label: "잘 드러나지 않는 편", points: { straight: 2 } },
      { id: "fine", label: "가늘고 섬세하게 보이는 편", points: { wave: 2 } },
      { id: "prominent", label: "크고 뚜렷하게 보이는 편", points: { natural: 2 } },
    ],
  },
  {
    id: "wrist",
    topic: "손목",
    title: "손목을 반대 손으로 감싸 쥐었을 때 단면은 어떤 느낌인가요?",
    howTo: "엄지와 검지로 손목을 가볍게 감싸 보세요.",
    options: [
      { id: "round", label: "둥글고 단단하게 두께감이 있어요", points: { straight: 2 } },
      { id: "flat", label: "가늘고 납작한 편이에요", points: { wave: 2 } },
      { id: "bony", label: "손목뼈가 튀어나와 각이 느껴져요", points: { natural: 2 } },
    ],
  },
  {
    id: "joints",
    topic: "손과 관절",
    title: "손가락 관절과 손의 느낌은 어떤가요?",
    howTo: "손등을 펴서 손가락 마디를 살펴보세요.",
    options: [
      { id: "compact", label: "관절이 작고 손바닥에 살집이 있어요", points: { straight: 1.5 } },
      { id: "soft", label: "손이 얇고 부드러운 느낌이에요", points: { wave: 1.5 } },
      { id: "large", label: "마디가 크고 손등의 뼈·힘줄이 보여요", points: { natural: 2 } },
    ],
  },
  {
    id: "tissue",
    topic: "근육·연부조직 인상",
    title: "팔 윗부분을 가볍게 잡았을 때 어떤 느낌이 가장 가까운가요?",
    howTo: "힘을 뺀 상태에서 위팔 바깥쪽을 잡아 보세요.",
    options: [
      { id: "firm", label: "탄력 있고 단단한 느낌", points: { straight: 2 } },
      { id: "soft", label: "부드럽고 말랑한 느낌", points: { wave: 2 } },
      { id: "lean", label: "살보다 뼈·근육의 결이 느껴지는 느낌", points: { natural: 1.5 } },
    ],
  },
  {
    id: "center",
    topic: "상하체 중심",
    title: "체중이 늘었을 때 변화가 먼저 느껴지는 곳은 어디인가요?",
    howTo: "평소 경험을 떠올려 보세요. 해당 경험이 없다면 '잘 모르겠어요'를 선택하세요.",
    options: [
      { id: "upper", label: "상체(가슴·팔·등) 쪽", points: { straight: 2 } },
      { id: "lower", label: "하체(엉덩이·허벅지) 쪽", points: { wave: 2 } },
      { id: "even", label: "전체적으로 고르게", points: { natural: 1.5 } },
    ],
  },
  {
    id: "knee",
    topic: "무릎",
    title: "무릎뼈(슬개골)는 어떻게 보이나요?",
    howTo: "다리를 펴고 서서 무릎 앞쪽을 확인해 보세요.",
    options: [
      { id: "small", label: "작고 잘 드러나지 않아요", points: { straight: 1.5 } },
      { id: "soft", label: "작고 무릎 위쪽이 부드러워 보여요", points: { wave: 1.5 } },
      { id: "large", label: "크고 뚜렷하게 보여요", points: { natural: 2 } },
    ],
  },
  {
    id: "fabric",
    topic: "편하게 느껴지는 옷",
    title: "입었을 때 가장 편안하고 자연스럽게 느껴지는 옷은?",
    howTo: "취향보다는 '입었을 때 몸에 자연스럽게 맞는 느낌'을 기준으로 골라 주세요.",
    options: [
      { id: "crisp", label: "정돈된 셔츠·심플한 니트", points: { straight: 1 } },
      { id: "light", label: "짧은 기장·부드럽고 가벼운 소재", points: { wave: 1 } },
      { id: "relaxed", label: "여유로운 핏·린넨이나 거친 질감", points: { natural: 1 } },
    ],
  },
];
