import type { BodyType } from "../classifier/types";
import type { StylePoint } from "./types";

/**
 * 유형별 스타일 포인트. "꼭 이렇게 입어야 한다"가 아니라 시도해 볼 방향과 그 이유입니다.
 * 금지 의상은 지정하지 않으며, 원하지 않을 경우의 대안을 함께 제시합니다.
 */
export const STYLE_POINTS: Record<BodyType, StylePoint[]> = {
  straight: [
    { aspect: "neckline", label: "넥라인", recommendation: "V넥, 셔츠 칼라처럼 목선을 세로로 여는 디자인", why: "입체적인 상체에 세로 여백이 생겨 시선이 위아래로 흐르기 때문이에요.", effect: "상체를 가볍고 정돈되게", alternative: "라운드넥을 원하면 목이 살짝 파인 형태를 고르고 가는 목걸이로 세로선을 더해 보세요." },
    { aspect: "length", label: "상의 길이", recommendation: "골반선 전후의 기본 기장", why: "너무 짧거나 긴 기장보다 몸의 중심선과 맞아 균형이 안정적이에요.", effect: "상하체 비율의 안정감", alternative: "짧은 기장을 원하면 하이웨이스트 일자 하의와 함께 입어 보세요." },
    { aspect: "waist", label: "허리선", recommendation: "제 허리 위치에서 자연스럽게", why: "허리선을 과하게 조이거나 높이지 않아도 상체의 입체감만으로도 자연스러운 굴곡이 생겨요.", effect: "자연스럽고 깔끔한 실루엣", alternative: "허리를 강조하고 싶다면 얇은 벨트를 제 위치에 매 보세요." },
    { aspect: "jacket", label: "재킷", recommendation: "정사이즈 어깨의 테일러드 재킷", why: "직선적인 라펠과 맞는 어깨선이 상체 볼륨을 정리해 줘요.", effect: "단정하고 신뢰감 있는 인상", alternative: "편안함을 원하면 니트 재킷이나 정사이즈 카디건도 좋아요." },
    { aspect: "pants", label: "바지 핏", recommendation: "센터턱 스트레이트, 일자 데님", why: "곧은 일자 실루엣이 상체의 입체감과 균형을 이뤄요.", effect: "길고 곧은 하체 라인", alternative: "와이드를 원하면 소재가 탄탄하고 통이 과하지 않은 세미와이드를 고르세요." },
    { aspect: "fabric", label: "소재", recommendation: "면, 울, 가죽처럼 탄탄하고 매끈한 소재", why: "탄력 있는 소재가 몸의 입체감을 깔끔하게 받쳐 줘요.", effect: "고급스럽고 정돈된 질감", alternative: "부드러운 소재를 원하면 얇고 몸에 붙지 않는 저지를 골라 보세요." },
    { aspect: "pattern", label: "패턴", recommendation: "무지, 굵지 않은 스트라이프", why: "단순한 패턴이 실루엣을 방해하지 않아요.", effect: "깔끔한 인상", alternative: "패턴을 원하면 하의나 소품에 작게 넣어 보세요." },
    { aspect: "layering", label: "레이어드", recommendation: "최소한의 레이어 (셔츠+재킷 정도)", why: "겹쳐 입을수록 상체 부피가 커져 보일 수 있어요.", effect: "간결한 실루엣", alternative: "레이어드를 즐긴다면 얇은 소재끼리 겹쳐 보세요." },
  ],
  wave: [
    { aspect: "neckline", label: "넥라인", recommendation: "보트넥, 라운드넥, 목 주변 디테일", why: "목 주변에 시선을 모아 상체에 존재감을 더해 줘요.", effect: "상체에 부드러운 볼륨", alternative: "V넥을 원하면 얕게 파인 디자인이나 스카프를 함께 활용해 보세요." },
    { aspect: "length", label: "상의 길이", recommendation: "허리선 기장의 컴팩트한 상의", why: "상의가 짧으면 허리선이 위로 올라가 하체가 길어 보여요.", effect: "다리가 길어 보이는 비율", alternative: "긴 상의를 원하면 앞부분만 넣어 입거나 벨트로 허리 위치를 표시해 보세요." },
    { aspect: "waist", label: "허리선", recommendation: "하이웨이스트, 벨트로 허리 강조", why: "허리선을 높게 표시하면 시각적 중심이 위로 올라가요.", effect: "곡선 실루엣과 비율 보완", alternative: "허리 강조가 싫다면 상하의를 같은 색으로 맞춰 세로 라인을 만들어 보세요." },
    { aspect: "jacket", label: "재킷", recommendation: "짧은 기장, 허리가 살짝 들어간 재킷", why: "짧은 아우터가 상체를 가볍게 하고 허리선을 드러내요.", effect: "가벼운 상체, 긴 하체", alternative: "긴 재킷을 원하면 앞을 열어 세로선을 만들거나 벨트를 더해 보세요." },
    { aspect: "pants", label: "바지 핏", recommendation: "하이웨이스트 테이퍼드, 발목이 보이는 기장", why: "발목을 드러내면 하체에 가벼움이 생겨요.", effect: "가볍고 길어 보이는 하체", alternative: "와이드 팬츠를 원하면 부드러운 소재와 하이웨이스트를 고르세요." },
    { aspect: "fabric", label: "소재", recommendation: "시폰, 저지, 부드러운 니트처럼 가볍고 부드러운 소재", why: "부드러운 소재가 곡선 실루엣과 자연스럽게 어울려요.", effect: "섬세하고 부드러운 인상", alternative: "탄탄한 소재를 원하면 얇고 광택감 있는 소재를 골라 보세요." },
    { aspect: "pattern", label: "패턴", recommendation: "작은 도트, 잔꽃무늬, 가는 체크", why: "작은 패턴이 섬세한 인상과 조화를 이뤄요.", effect: "부드러운 포인트", alternative: "큰 패턴을 원하면 상의에 배치해 시선을 위로 올려 보세요." },
    { aspect: "layering", label: "레이어드", recommendation: "짧은 카디건·크롭 재킷으로 가볍게", why: "가벼운 레이어가 상체에 볼륨을 더하되 무거워 보이지 않아요.", effect: "상체 볼륨 보완", alternative: "롱 아우터를 원하면 앞을 열고 이너를 짧게 입어 보세요." },
  ],
  natural: [
    { aspect: "neckline", label: "넥라인", recommendation: "오픈 칼라, 터틀넥, 넉넉한 크루넥", why: "골격의 존재감과 어울리는 여유로운 넥라인이에요.", effect: "자연스럽고 편안한 인상", alternative: "깊은 V넥을 원하면 이너를 레이어드해 보세요." },
    { aspect: "length", label: "상의 길이", recommendation: "엉덩이를 덮는 긴 기장, 루즈한 핏", why: "긴 기장이 프레임의 직선성과 균형을 이뤄요.", effect: "여유로운 세로 라인", alternative: "짧은 상의를 원하면 와이드 하의로 볼륨을 맞춰 보세요." },
    { aspect: "waist", label: "허리선", recommendation: "허리를 강조하지 않거나 골반에 느슨하게", why: "직선적인 실루엣을 살리는 쪽이 자연스러워요.", effect: "편안한 직선 실루엣", alternative: "허리를 강조하고 싶다면 두꺼운 벨트를 느슨하게 둘러 보세요." },
    { aspect: "jacket", label: "재킷", recommendation: "오버사이즈 재킷, 롱 코트", why: "넉넉한 어깨와 긴 기장이 골격 프레임과 조화를 이뤄요.", effect: "구조적이고 세련된 실루엣", alternative: "정사이즈를 원하면 어깨가 드롭된 디자인을 골라 보세요." },
    { aspect: "pants", label: "바지 핏", recommendation: "와이드, 세미와이드, 긴 기장", why: "통이 넓은 하의가 상체 프레임과 균형을 맞춰요.", effect: "안정적인 전체 실루엣", alternative: "슬림 핏을 원하면 상의를 여유 있게 입어 균형을 맞춰 보세요." },
    { aspect: "fabric", label: "소재", recommendation: "린넨, 코듀로이, 로우게이지 니트처럼 질감 있는 소재", why: "자연스러운 질감이 골격의 존재감과 어울려요.", effect: "깊이 있는 텍스처", alternative: "매끈한 소재를 원하면 무게감 있는 울 소재를 골라 보세요." },
    { aspect: "pattern", label: "패턴", recommendation: "큰 체크, 헤링본, 굵은 스트라이프", why: "큰 패턴이 프레임과 스케일이 맞아요.", effect: "존재감 있는 포인트", alternative: "패턴이 부담스럽다면 소재의 질감으로 변화를 주세요." },
    { aspect: "layering", label: "레이어드", recommendation: "셔츠+니트+코트처럼 구조적인 겹쳐 입기", why: "여러 겹이 프레임의 존재감과 자연스럽게 어우러져요.", effect: "풍성하고 입체적인 룩", alternative: "간결함을 원하면 롱 아우터 하나로 레이어드 효과를 내 보세요." },
  ],
};

/** 판정 보류 시 원하는 실루엣 기준 일반 가이드 */
export const NEUTRAL_POINTS: StylePoint[] = [
  { aspect: "neckline", label: "넥라인", recommendation: "얼굴과 목선이 편안하게 보이는 넥라인부터", why: "유형 판정 없이도 착용감과 인상을 기준으로 고를 수 있어요.", effect: "편안한 인상", alternative: "여러 넥라인을 거울 앞에서 비교해 보세요." },
  { aspect: "waist", label: "허리선", recommendation: "원하는 실루엣에 따라 허리선 위치를 조절", why: "허리선을 높이면 다리가 길어 보이고, 낮추면 편안해 보여요.", effect: "비율 조절", alternative: "상하의 색을 맞춰 세로 라인을 만들어도 좋아요." },
  { aspect: "fabric", label: "소재", recommendation: "탄탄한 소재와 부드러운 소재를 모두 입어 보고 비교", why: "소재에 따라 같은 옷도 실루엣이 크게 달라져요.", effect: "나에게 편한 질감 찾기", alternative: "자가 체크를 더 진행하면 유형별 가이드를 볼 수 있어요." },
];
