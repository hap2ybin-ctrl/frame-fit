import { CheckCircle2, CircleDashed, MinusCircle, AlertTriangle, XCircle } from "lucide-react";
import type { QualityCheck, QualityReport } from "@/lib/pose/quality";
import { cn } from "@/lib/utils";

const ICON = {
  pass: { icon: CheckCircle2, cls: "text-ok", label: "통과" },
  warn: { icon: AlertTriangle, cls: "text-warn", label: "주의" },
  fail: { icon: XCircle, cls: "text-red-600", label: "다시 필요" },
  skip: { icon: MinusCircle, cls: "text-neutral-300", label: "확인 안 함" },
} as const;

export function QualityList({ report, compact, dark }: { report: QualityReport | null; compact?: boolean; dark?: boolean }) {
  if (!report) {
    return (
      <p className={cn("flex items-center gap-2 text-sm", dark ? "text-white/60" : "text-neutral-500")}>
        <CircleDashed className="size-4 animate-spin [animation-duration:2.5s]" aria-hidden /> 품질 점검 대기 중
      </p>
    );
  }
  const rows = compact ? report.checks.filter((c) => c.status !== "skip") : report.checks;
  return (
    <ul className="space-y-2" aria-label="촬영 품질 점검">
      {rows.map((c: QualityCheck) => {
        const meta = ICON[c.status];
        return (
          <li key={c.id} className="flex items-start gap-2.5 text-sm">
            <meta.icon className={cn("mt-0.5 size-4 shrink-0", meta.cls)} aria-hidden />
            <div className="min-w-0">
              <p className={cn("font-medium", dark && "text-white")}>
                {c.label}
                <span className="sr-only"> — {meta.label}</span>
              </p>
              {(c.status !== "pass" || !compact) && <p className={cn("leading-snug", dark ? "text-white/65" : "text-neutral-600")}>{c.message}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function QualityBadge({ level }: { level: QualityReport["level"] | "none" }) {
  const map = {
    good: { text: "촬영 품질 좋음", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
    fair: { text: "촬영 품질 보통", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
    poor: { text: "측정 불가", cls: "bg-red-50 text-red-800 ring-red-200" },
    none: { text: "사진 없음", cls: "bg-neutral-100 text-neutral-600 ring-neutral-200" },
  } as const;
  const m = map[level];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1", m.cls)}>{m.text}</span>;
}
