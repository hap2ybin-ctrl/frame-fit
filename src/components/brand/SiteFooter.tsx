import Link from "next/link";
import { LogoMark } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-black/5 bg-surface">
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 text-sm text-neutral-600 sm:grid-cols-[1fr_auto] sm:px-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-ink">
            <LogoMark className="size-5" />
            <span className="font-display text-xs font-semibold tracking-[0.22em]">FRAME FIT</span>
          </div>
          <p className="max-w-xl leading-relaxed">
            FRAME FIT의 결과는 참고용 경향 분석이며 의학적·전문적 진단이 아닙니다. 사진과 영상은 기기 안에서만 처리되고 서버로
            전송되지 않습니다.
          </p>
        </div>
        <nav aria-label="하단 메뉴" className="flex flex-wrap gap-x-4 gap-y-2 sm:flex-col sm:items-end">
          <Link href="/privacy" className="hover:text-ink">개인정보와 데이터</Link>
          <Link href="/about" className="hover:text-ink">분석 방법과 한계</Link>
          <Link href="/saved" className="hover:text-ink">저장된 결과 관리</Link>
          <Link href="/lookbook" className="hover:text-ink">코디북</Link>
          <Link href="/fit-lab" className="hover:text-ink">실루엣 비교</Link>
        </nav>
      </div>
    </footer>
  );
}
