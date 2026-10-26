import Link from "next/link";
import { ArrowRight, Camera, ClipboardCheck, Lock, ScanLine, Shirt, Upload } from "lucide-react";
import { HeroFigure } from "@/components/brand/HeroFigure";
import { buttonVariants } from "@/components/ui/button";
import { TYPE_META } from "@/lib/brand/typeMeta";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: Camera, title: "전신 촬영", text: "카메라 또는 사진 업로드로 정면·측면 전신을 준비해요. 실시간 HUD가 프레이밍과 자세를 안내해요." },
  { icon: ScanLine, title: "비율 시각화", text: "33개 관절 랜드마크와 인체 윤곽에서 어깨·골반·몸통·다리의 정규화된 비율을 계산해요." },
  { icon: ClipboardCheck, title: "보완 체크", text: "사진으로 알 수 없는 쇄골, 손목, 상체 두께 같은 특징은 직접 체크해 근거를 보완해요." },
  { icon: Shirt, title: "맞춤 코디", text: "가까운 유형 경향과 원하는 실루엣·상황·옷장을 종합해 코디 조합과 그 이유를 제안해요." },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pt-10 pb-16 sm:px-8 md:grid-cols-[1.15fr_1fr] md:pt-20">
        <div className="ff-rise">
          <p className="font-display text-xs font-semibold tracking-[0.24em] text-neutral-500">BODY FRAME · STYLE ANALYSIS</p>
          <h1 className="mt-5 text-balance text-[2.6rem] font-bold leading-[1.12] tracking-tight sm:text-6xl">
            나의 체형을 읽고,
            <br />
            나에게 맞는 스타일을 찾다.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-600">
            FRAME FIT은 브라우저 안에서 전신 포즈를 추적해 신체 비율과 실루엣을 보여 주고, 직접 체크한 특징과 함께 골격 유형의
            <strong className="font-semibold text-ink"> 경향</strong>과 맞춤 코디를 제안해요.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/guide" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-full px-6 text-base")}>
              분석 시작하기 <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/capture?mode=upload" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-full px-6 text-base")}>
              <Upload className="size-4" aria-hidden /> 사진으로 시작
            </Link>
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm text-neutral-500">
            <Lock className="size-3.5" aria-hidden /> 로그인 없이 사용 · 사진과 영상은 서버로 전송되지 않아요
          </p>
        </div>
        <div className="ff-rise mx-auto w-full max-w-sm [animation-delay:120ms]">
          <HeroFigure className="h-auto w-full drop-shadow-2xl" />
          <p className="mt-3 text-center text-xs text-neutral-400">도식 예시 · 실제 인물이나 분석 결과가 아니에요</p>
        </div>
      </section>

      <section aria-labelledby="how" className="border-y border-black/5 bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <h2 id="how" className="text-2xl font-bold tracking-tight sm:text-3xl">이렇게 진행돼요</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-3xl bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-black/5">
                <div className="flex items-center justify-between">
                  <s.icon className="size-5" aria-hidden />
                  <span className="font-display text-xs text-neutral-400 tabular">0{i + 1}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="types" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <h2 id="types" className="text-2xl font-bold tracking-tight sm:text-3xl">세 가지 골격 유형 경향</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-neutral-600">
          골격 유형은 스타일링을 위한 참고 분류예요. 우열이나 외모 평가가 아니며, 많은 사람이 두 유형의 특징을 함께 가지고 있어요.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {Object.values(TYPE_META).map((t) => (
            <article key={t.key} className={cn("rounded-3xl p-6", t.bgSoft)}>
              <div className="flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full", t.bg)} aria-hidden />
                <span className={cn("font-display text-xs font-semibold tracking-[0.2em]", t.text)}>{t.en}</span>
              </div>
              <h3 className="mt-4 text-2xl font-bold">{t.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-700">{t.summary}</p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {t.traits.map((tr) => (
                  <li key={tr} className="rounded-full bg-white/80 px-3 py-1 text-xs text-neutral-700">
                    {tr}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="honest" className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-6 rounded-[2rem] bg-ink p-8 text-white sm:p-12 md:grid-cols-2">
          <div>
            <h2 id="honest" className="text-2xl font-bold tracking-tight sm:text-3xl">측정하는 것과 측정하지 않는 것</h2>
            <p className="mt-4 leading-relaxed text-white/70">
              포즈 모델은 관절의 위치를 추정할 뿐, 뼈의 형태나 근육·지방 분포를 보지 못해요. 그래서 FRAME FIT은 사진에서 관찰 가능한
              비율과 직접 체크한 특징을 분리해 보여 주고, 근거가 부족하면 판정을 보류해요.
            </p>
            <Link href="/about" className="mt-6 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
              분석 방법과 한계 자세히 보기 <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
              <p className="font-semibold">사진으로 측정</p>
              <ul className="mt-3 space-y-1.5 text-white/70">
                <li>어깨·골반 관절 폭의 비율</li>
                <li>몸통 대비 다리 길이 비율</li>
                <li>윤곽상 허리·엉덩이 폭 비율 (옷 포함)</li>
                <li>촬영 품질과 자세</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
              <p className="font-semibold">측정하지 않음</p>
              <ul className="mt-3 space-y-1.5 text-white/70">
                <li>cm 단위 실제 치수, 체중, 체지방률</li>
                <li>쇄골 돌출 정도, 관절 크기</li>
                <li>옷 아래의 실제 신체 두께</li>
                <li>근육·지방의 실제 분포</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="privacy" className="mx-auto max-w-6xl px-5 pt-16 sm:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <h2 id="privacy" className="text-2xl font-bold tracking-tight">프라이버시 우선</h2>
          </div>
          <ul className="grid gap-4 text-sm leading-relaxed text-neutral-600 sm:grid-cols-2 md:col-span-2">
            <li><strong className="block text-ink">기기 안에서만 처리</strong>카메라 영상과 사진은 브라우저 안에서 분석되고 서버로 업로드되지 않아요.</li>
            <li><strong className="block text-ink">사진은 기본으로 남기지 않아요</strong>촬영 사진은 탭을 닫으면 사라져요. 기록에 사진을 남기려면 직접 켜야 해요.</li>
            <li><strong className="block text-ink">기록은 이 기기에만</strong>검사 기록(결과·관절 좌표, 선택 시 사진)은 이 브라우저에만 남고, 언제든 끄거나 지울 수 있어요.</li>
            <li><strong className="block text-ink">다른 사람을 찍을 때</strong>촬영 대상의 동의를 먼저 받아 주세요. 결과 공유도 본인의 동의가 필요해요.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
