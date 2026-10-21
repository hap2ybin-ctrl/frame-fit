import type { Metadata } from "next";
import { PageHeader } from "@/components/flow/StepNav";
import { NOT_OBSERVABLE } from "@/lib/analysis/features";
import { DECISION, RULES_VERSION, VISUAL_RULES } from "@/lib/classifier/rules.config";
import { QUESTIONS } from "@/lib/classifier/questions.config";
import { TYPE_META } from "@/lib/brand/typeMeta";
import { GARMENTS } from "@/lib/styling/garments.data";
import { AI_IMAGE_SOURCE, GARMENT_IMAGES } from "@/lib/styling/garmentImages.data";

export const metadata: Metadata = { title: "분석 방법과 한계" };

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="METHOD"
        title="분석 방법과 한계"
        description="FRAME FIT의 판정은 투명한 규칙 기반 휴리스틱이에요. 아래의 모든 임계값과 가중치는 검증되지 않은 초기값이에요."
      />
      <div className="mx-auto w-full max-w-4xl space-y-12 px-5 text-[15px] leading-relaxed text-neutral-700 sm:px-8">
        <section>
          <h2 className="text-xl font-bold text-ink">1. 사진 분석</h2>
          <p className="mt-2">
            MediaPipe Pose Landmarker가 브라우저 안에서 33개 신체 랜드마크와 인체 분할 마스크를 추정해요. 정규화 좌표를 이미지 픽셀 좌표로 바꾼 뒤
            비율만 계산하고, 실제 치수(cm)는 계산하지 않아요. 촬영 품질(인원 수, 관절 가시성, 전신 포함, 크기, 자세, 밝기, 흔들림)을 점검해 기준에
            못 미치면 측정하지 않아요.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-ink">2. 사진 기반 규칙 (규칙 버전 {RULES_VERSION})</h2>
          <div className="mt-4 overflow-x-auto rounded-3xl ring-1 ring-black/5">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-surface text-neutral-500">
                <tr>
                  <th scope="col" className="p-3 font-medium">특징</th>
                  <th scope="col" className="p-3 font-medium">낮음 (&lt;)</th>
                  <th scope="col" className="p-3 font-medium">높음 (&gt;)</th>
                  <th scope="col" className="p-3 font-medium">가중치</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {VISUAL_RULES.map((r) => (
                  <tr key={r.feature}>
                    <th scope="row" className="p-3 font-medium text-ink">
                      {r.feature}
                      {r.requiresFittedClothing && <span className="block text-xs font-normal text-amber-800">몸에 붙는 옷 표시 시에만</span>}
                    </th>
                    <td className="p-3">
                      {r.low} → {Object.entries(r.whenLow).map(([t, v]) => `${TYPE_META[t as keyof typeof TYPE_META].label}+${v}`).join(", ")}
                    </td>
                    <td className="p-3">
                      {r.high} → {Object.entries(r.whenHigh).map(([t, v]) => `${TYPE_META[t as keyof typeof TYPE_META].label}+${v}`).join(", ")}
                    </td>
                    <td className="p-3">{r.weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm">
            촬영 품질 배수: 좋음 ×{DECISION.qualityMultiplier.good}, 보통 ×{DECISION.qualityMultiplier.fair}, 측정 불가 ×{DECISION.qualityMultiplier.poor}.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-ink">3. 자가 체크와 판정</h2>
          <p className="mt-2">
            {QUESTIONS.length}개 문항의 응답에 문항별 점수를 더해요. &lsquo;잘 모르겠어요&rsquo;는 반영하지 않아요. 응답이 {DECISION.minSelfAnswers}개 미만이거나
            1위 점수가 {DECISION.minTopScore} 미만이면 <strong>판정 보류</strong>, 1·2위 차이가 1위의 {Math.round(DECISION.mixedMarginRatio * 100)}% 미만이거나
            사진과 자가 체크가 다른 유형을 가리키고 차이가 {Math.round(DECISION.conflictMixedMarginRatio * 100)}% 미만이면 <strong>혼합형</strong>으로 정리해요.
            점수는 확률이나 정확도가 아니에요.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-ink">4. 사진으로 추정하지 않는 것</h2>
          <ul className="mt-3 space-y-1.5">
            {NOT_OBSERVABLE.map((n) => (
              <li key={n.label}>
                <strong className="text-ink">{n.label}</strong> — {n.reason}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-bold text-ink">5. 코디 이미지 출처</h2>
          <p className="mt-2">
            코디 카드의 의복 이미지는 실제 판매 상품이 아닌 참고 이미지예요. 모든 이미지는 {AI_IMAGE_SOURCE} 이미지 모델로 생성한 상품컷 스타일
            이미지이며, 사람·브랜드 로고·텍스트가 없는지 확인한 뒤 사용했어요. 실제 상품의 색감·소재와 다를 수 있어요.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            {Object.keys(GARMENT_IMAGES).map((id) => (
              <li key={id}>{GARMENTS.find((x) => x.id === id)?.name ?? id}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-bold text-ink">6. 구현 범위</h2>
          <p className="mt-2">
            현재 버전은 실시간 포즈 추적, 사진 분석, 규칙 기반 경향 정리, 데이터 기반 코디 조합을 제공해요. 코디 실루엣 오버레이, 옷장 사진 등록,
            쇼핑 링크, 사진형·실시간 가상 착용(Virtual Try-On)은 아직 구현되지 않았어요.
          </p>
        </section>
      </div>
    </>
  );
}
