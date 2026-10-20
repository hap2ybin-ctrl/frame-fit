import Link from "next/link";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-8">
        <Link href="/" aria-label="FRAME FIT 홈" className="rounded-md">
          <Logo />
        </Link>
        <nav aria-label="주요 메뉴" className="flex items-center gap-0.5 whitespace-nowrap text-[13px] sm:gap-1 sm:text-sm">
          <Link href="/saved" className="rounded-full px-2.5 py-1.5 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-ink sm:px-3">
            내 결과
          </Link>
          <Link href="/lookbook" className="rounded-full px-2.5 py-1.5 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-ink sm:px-3">
            코디북
          </Link>
          <Link href="/privacy" className="hidden rounded-full px-3 py-1.5 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-ink sm:inline-block">
            개인정보
          </Link>
          <Link href="/guide" className="ml-1 rounded-full bg-ink px-3 py-1.5 font-medium text-white transition-opacity hover:opacity-85 sm:px-4">
            분석 시작
          </Link>
        </nav>
      </div>
    </header>
  );
}
