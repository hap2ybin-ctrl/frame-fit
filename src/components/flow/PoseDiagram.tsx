/** 정면/측면 자세 안내 도식 (자체 제작 SVG) */
export function PoseDiagram({ view, className }: { view: "front" | "side"; className?: string }) {
  return (
    <svg viewBox="0 0 120 200" className={className} role="img" aria-label={view === "front" ? "정면 자세 예시 도식" : "측면 자세 예시 도식"}>
      <rect x="1" y="1" width="118" height="198" rx="16" fill="#F6F6F4" />
      <g fill="none" stroke="#121316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {view === "front" ? (
          <>
            <circle cx="60" cy="30" r="10" />
            <path d="M42 50h36M42 50l-6 34-2 26M78 50l6 34 2 26M46 50l2 46h24l2-46M50 96l-2 44 0 40M70 96l2 44 0 40" />
          </>
        ) : (
          <>
            <circle cx="60" cy="30" r="10" />
            <path d="M60 42v6M54 50c-4 10-4 30 0 46h12c4-16 4-36 0-46zM60 52l2 30 0 26M56 96l-1 44 1 40M64 96l1 44-1 40M57 180h10" />
          </>
        )}
      </g>
      <g stroke="#121316" strokeOpacity="0.35" strokeDasharray="3 3">
        <line x1="10" x2="110" y1="14" y2="14" />
        <line x1="10" x2="110" y1="188" y2="188" />
      </g>
    </svg>
  );
}
