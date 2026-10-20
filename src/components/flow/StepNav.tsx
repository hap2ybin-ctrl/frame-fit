"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const STEPS = [
  { href: "/guide", label: "안내" },
  { href: "/capture", label: "촬영" },
  { href: "/analyze", label: "분석" },
  { href: "/check", label: "체크" },
  { href: "/result", label: "결과" },
  { href: "/style", label: "스타일" },
] as const;

export function StepNav() {
  const pathname = usePathname();
  const current = STEPS.findIndex((s) => pathname.startsWith(s.href));
  return (
    <nav aria-label="진행 단계" className="mx-auto w-full max-w-6xl px-5 pt-6 sm:px-8">
      <ol className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs [scrollbar-width:none]">
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.href} className="flex shrink-0 items-center gap-1.5">
              <Link
                href={s.href}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors",
                  active ? "bg-ink text-white" : done ? "text-ink hover:bg-neutral-100" : "text-neutral-400 hover:bg-neutral-100",
                )}
              >
                <span className="font-display tabular">{String(i + 1).padStart(2, "0")}</span>
                <span>{s.label}</span>
              </Link>
              {i < STEPS.length - 1 && <span aria-hidden className={cn("h-px w-3", done ? "bg-ink" : "bg-neutral-200")} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageHeader({ eyebrow, title, description, children }: { eyebrow: string; title: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pt-8 pb-6 sm:px-8 sm:pt-12">
      <p className="font-display text-xs font-semibold tracking-[0.2em] text-neutral-500">{eyebrow}</p>
      <h1 className="mt-3 text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{title}</h1>
      {description && <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">{description}</p>}
      {children}
    </div>
  );
}
