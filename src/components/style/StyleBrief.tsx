import { Minus, Palette, Plus } from "lucide-react";
import type { BodyType } from "@/lib/classifier/types";
import { TYPE_META } from "@/lib/brand/typeMeta";
import { BODY_BRIEF, NEUTRAL_BRIEF, type BriefPoint } from "@/lib/styling/bodyBrief.data";
import { PERSONAL_COLOR, type PersonalColor, type Swatch } from "@/lib/styling/personalColor";
import { cn } from "@/lib/utils";

function PointList({ title, icon: Icon, points }: { title: string; icon: typeof Plus; points: BriefPoint[] }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-500">
        <Icon className="size-3.5" aria-hidden /> {title}
      </p>
      <ul className="mt-2 space-y-2.5">
        {points.map((p) => (
          <li key={p.title} className="text-sm leading-relaxed">
            <span className="font-semibold">{p.title}</span>
            <span className="block text-neutral-600">{p.how}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Swatches({ title, list, muted }: { title: string; list: Swatch[]; muted?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-neutral-500">{title}</p>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
        {list.map((s) => (
          <li key={s.name} className={cn("flex items-center gap-1.5 text-xs", muted && "text-neutral-500")}>
            <span aria-hidden className={cn("size-4 rounded-full ring-1 ring-black/10", muted && "opacity-70")} style={{ background: s.hex }} />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 코디 제안 상단 브리핑: 체형 포인트(강조/보완) + 퍼스널 컬러 팔레트·액세서리.
 */
export function StyleBrief({
  type,
  secondary,
  typeLabel,
  personalColor,
}: {
  type: BodyType | null;
  secondary: BodyType | null;
  typeLabel: string;
  personalColor: PersonalColor | null;
}) {
  const brief = type ? BODY_BRIEF[type] : NEUTRAL_BRIEF;
  const meta = type ? TYPE_META[type] : null;
  const pc = personalColor ? PERSONAL_COLOR[personalColor] : null;
  return (
    <section aria-labelledby="style-brief" className="mt-10">
      <h2 id="style-brief" className="text-xl font-bold tracking-tight">
        스타일 브리핑
      </h2>
      <p className="mt-1 text-sm text-neutral-600">코디를 고르기 전에 체형에서 살릴 점과 보완할 점, 나에게 맞는 컬러를 먼저 확인해 보세요.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="rounded-[1.75rem] p-6 ring-1 ring-black/5 sm:p-7 lg:col-span-3">
          <div className="flex flex-wrap items-baseline gap-x-2">
            {meta && <span className={cn("font-display text-xs font-semibold tracking-[0.2em]", meta.text)}>{meta.en}</span>}
            <span className="text-sm font-semibold">{typeLabel}</span>
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-neutral-800">{brief.summary}</p>
          {secondary && type && secondary !== type && (
            <p className="mt-1 text-sm text-neutral-600">
              두 번째 경향인 {TYPE_META[secondary].label}의 &lsquo;{BODY_BRIEF[secondary].emphasize[0].title}&rsquo;도 함께 살려 보세요.
            </p>
          )}
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <PointList title="강조하면 좋은 점" icon={Plus} points={brief.emphasize} />
            <PointList title="보완하면 좋은 점" icon={Minus} points={brief.balance} />
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-surface p-6 sm:p-7 lg:col-span-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Palette className="size-4" aria-hidden /> 퍼스널 컬러 {pc && <span className="text-neutral-500">· {pc.label}</span>}
          </p>
          {pc ? (
            <div className="mt-3 space-y-4">
              <p className="text-sm leading-relaxed text-neutral-700">{pc.summary}</p>
              <Swatches title="얼굴 가까이 두면 좋은 컬러" list={pc.best} />
              <Swatches title="코디의 기본 컬러" list={pc.neutrals} />
              <Swatches title="얼굴 가까이는 피하면 좋은 컬러" list={pc.caution} muted />
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 border-t border-black/5 pt-4 text-sm">
                {pc.accessories.map((a) => (
                  <div key={a.label} className="contents">
                    <dt className="text-neutral-500">{a.label}</dt>
                    <dd>{a.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs leading-relaxed text-neutral-500">
                직접 고른 퍼스널 컬러 기준의 일반 가이드예요. 앱이 사진으로 퍼스널 컬러를 진단하지는 않아요.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              퍼스널 컬러를 알고 있다면 위 스타일 조건에서 골라 주세요. 어울리는 코디 컬러와 액세서리를 함께 추천해 드려요. 모른다면 지금처럼 체형과
              취향을 기준으로 제안해요.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
