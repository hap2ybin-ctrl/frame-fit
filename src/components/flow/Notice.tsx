import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "warn" | "error" | "ok";

const TONE: Record<Tone, { icon: typeof Info; cls: string }> = {
  info: { icon: Info, cls: "border-neutral-200 bg-surface text-neutral-700" },
  warn: { icon: AlertTriangle, cls: "border-amber-200 bg-amber-50 text-amber-900" },
  error: { icon: XCircle, cls: "border-red-200 bg-red-50 text-red-900" },
  ok: { icon: CheckCircle2, cls: "border-emerald-200 bg-emerald-50 text-emerald-900" },
};

export function Notice({ tone = "info", title, children, className }: { tone?: Tone; title?: string; children?: React.ReactNode; className?: string }) {
  const { icon: Icon, cls } = TONE[tone];
  return (
    <div role={tone === "error" ? "alert" : "note"} className={cn("flex gap-3 rounded-2xl border p-4 text-sm leading-relaxed", cls, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}
