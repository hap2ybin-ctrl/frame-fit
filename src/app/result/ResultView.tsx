"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Download, FileText, History, RotateCcw, Save, Share2, Trash2 } from "lucide-react";
import { QualityBadge } from "@/components/camera/QualityPanel";
import { Notice } from "@/components/flow/Notice";
import { AutoRecordToggle } from "@/components/result/AutoRecordToggle";
import { BodyInsightMap } from "@/components/result/BodyInsightMap";
import { EvidenceAccordion, ScoreBars, TypeHero } from "@/components/result/ResultParts";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { composeAnalysisPhoto, type AnalysisPhoto } from "@/lib/export/analysisImage";
import { pngToPdf, renderResultPng } from "@/lib/export/resultImage";
import { downloadBlob } from "@/lib/image/image";
import { usePreferences } from "@/lib/preferences/store";
import { deleteSaved, recordIdFor, recordSession, useSavedResults } from "@/lib/store/saved";
import { clearSession, useHydrated, useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null) {
  const d = iso ? new Date(iso) : null;
  return d ? d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "";
}

export function ResultView() {
  const session = useSession();
  const prefs = usePreferences();
  const hydrated = useHydrated();
  const savedList = useSavedResults();
  const [busy, setBusy] = useState<"png" | "pdf" | "share" | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  // 분석 사진 포함은 매번 사용자가 직접 선택 (기본 꺼짐)
  const [includePhotos, setIncludePhotos] = useState(false);

  if (!hydrated) return <div className="mx-auto mt-10 h-96 w-full max-w-6xl animate-pulse rounded-3xl bg-surface" />;

  const result = session.result;
  if (!result) {
    return (
      <div className="mx-auto mt-10 w-full max-w-3xl space-y-4 px-5 sm:px-8">
        <Notice tone="info" title="아직 결과가 없어요">
          보완 체크를 마치면 결과가 계산되고 '내 결과'에 기록돼요. 지난 검사는 '내 결과'에서 다시 볼 수 있어요.
        </Notice>
        <div className="flex flex-wrap gap-2">
          <Link href="/check" className={cn(buttonVariants(), "rounded-full")}>보완 체크로 이동</Link>
          <Link href="/saved" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>저장된 결과 보기</Link>
        </div>
      </div>
    );
  }

  // 이 검사 결과의 기록 여부 (자동 기록 또는 직접 기록)
  const recordId = recordIdFor(session.resultAt ?? "session");
  const recordEntry = savedList.find((r) => r.id === recordId);
  const recorded = !!recordEntry;

  const front = session.analyses.front;
  const side = session.analyses.side;
  const dateText = formatDate(session.resultAt);
  const photoSources = (["front", "side"] as const).filter(
    (v) => session.analyses[v]?.status === "ok" && session.analyses[v]?.landmarks && session.captures[v],
  );
  const withPhotos = includePhotos && photoSources.length > 0;
  const fileBase = withPhotos ? "framefit-result-photo" : "framefit-result";

  /** 결과 카드 PNG. 사진 포함을 선택한 경우에만 분석 사진 합성본을 넣음 */
  async function buildCard(): Promise<Blob> {
    let photos: AnalysisPhoto[] = [];
    if (withPhotos) {
      const composed = await Promise.all(
        photoSources.map((v) => composeAnalysisPhoto(session.captures[v]!.dataUrl, session.analyses[v]!, v === "front" ? "정면" : "측면")),
      );
      photos = composed.filter((p): p is AnalysisPhoto => p !== null);
    }
    return renderResultPng(result!, dateText, { photos });
  }

  async function exportPng() {
    setBusy("png");
    setMsg(null);
    try {
      downloadBlob(await buildCard(), `${fileBase}.png`);
    } catch {
      setMsg({ tone: "error", text: "이미지를 만들지 못했어요. 다른 브라우저로 시도해 주세요." });
    } finally {
      setBusy(null);
    }
  }
  async function exportPdf() {
    setBusy("pdf");
    setMsg(null);
    try {
      downloadBlob(await pngToPdf(await buildCard()), `${fileBase}.pdf`);
    } catch {
      setMsg({ tone: "error", text: "PDF를 만들지 못했어요. PNG 저장을 이용해 주세요." });
    } finally {
      setBusy(null);
    }
  }
  async function share() {
    setBusy("share");
    setMsg(null);
    try {
      const png = await buildCard();
      const file = new File([png], `${fileBase}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "FRAME FIT 결과", text: "골격 유형 경향 (참고용)" });
      } else {
        downloadBlob(png, `${fileBase}.png`);
        setMsg({ tone: "ok", text: "이 브라우저는 파일 공유를 지원하지 않아 이미지로 저장했어요." });
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setMsg({ tone: "error", text: "공유하지 못했어요." });
    } finally {
      setBusy(null);
    }
  }
  function save() {
    try {
      recordSession(session, prefs.style, prefs.closet);
      setMsg({ tone: "ok", text: "이 브라우저에 검사 기록을 남겼어요. '내 결과'에서 확인·삭제할 수 있어요." });
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
    }
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-6xl px-5 sm:px-8">
      <p className="font-display text-xs font-semibold tracking-[0.2em] text-neutral-500">STEP 05 · RESULT {dateText && `· ${dateText}`}</p>
      <div className="mt-4">
        <TypeHero result={result} />
      </div>

      <section aria-labelledby="body-map" className="mt-10">
        <h2 id="body-map" className="text-xl font-bold tracking-tight">체형 비율 맵</h2>
        <p className="mt-1 text-sm text-neutral-600">
          부위를 누르면 관찰 결과와 코디 팁을 볼 수 있어요. 점선 부위는 카메라로 측정하지 않고 자가 체크 응답만 보여 줘요.
        </p>
        <div className="mt-4">
          <BodyInsightMap front={front} side={side} answers={session.answers} photoUrl={session.captures.front?.dataUrl} />
        </div>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          <section aria-labelledby="evidence">
            <h2 id="evidence" className="text-xl font-bold tracking-tight">판단 근거</h2>
            <p className="mt-1 text-sm text-neutral-600">사진에서 자동 측정한 근거와 직접 체크한 근거를 나누어 보여 드려요.</p>
            <div className="mt-4">
              <EvidenceAccordion result={result} />
            </div>
          </section>

          <section aria-labelledby="limits">
            <h2 id="limits" className="text-xl font-bold tracking-tight">한계와 참고 사항</h2>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-neutral-700">
              {result.limitations.map((l) => (
                <li key={l} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-neutral-400" />
                  {l}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl p-6 ring-1 ring-black/5" aria-labelledby="scores">
            <h2 id="scores" className="font-semibold">유형별 근거</h2>
            <div className="mt-4">
              <ScoreBars result={result} />
            </div>
          </section>

          <section className="rounded-3xl p-6 ring-1 ring-black/5" aria-labelledby="quality">
            <h2 id="quality" className="font-semibold">촬영 품질</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-neutral-600">정면</dt>
                <dd><QualityBadge level={front?.status === "ok" && front.quality ? front.quality.level : front ? "poor" : "none"} /></dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-neutral-600">측면</dt>
                <dd><QualityBadge level={side?.status === "ok" && side.quality ? side.quality.level : side ? "poor" : "none"} /></dd>
              </div>
            </dl>
          </section>

          <section className="space-y-4 rounded-3xl bg-surface p-6" aria-labelledby="save">
            <h2 id="save" className="font-semibold">저장과 공유</h2>
            {recorded ? (
              <>
                <p className="flex items-start gap-2 text-sm leading-relaxed text-neutral-700">
                  <History className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    이 검사 결과는 &lsquo;내 결과&rsquo;에 기록됐어요. 유형·근거 요약·관절 좌표·측정값
                    {recordEntry?.detail?.photos.length ? "·사진" : ""}이 이 브라우저에만 남아요.
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/saved" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
                    기록 보기
                  </Link>
                  <Button
                    variant="ghost"
                    className="rounded-full text-red-700 hover:bg-red-50"
                    onClick={() => {
                      deleteSaved(recordId);
                      setMsg({ tone: "ok", text: "이 결과의 기록을 지웠어요. 지금 결과는 탭을 닫기 전까지 볼 수 있어요." });
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden /> 기록 삭제
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-neutral-600">
                  이 결과는 아직 기록되지 않았어요. 기록하면 유형·근거 요약·관절 좌표·측정값(사진은 설정한 경우만)이 이 브라우저에만 남아요.
                </p>
                <Button className="w-full rounded-full" onClick={save}>
                  <Save className="size-4" aria-hidden /> 결과 요약 기록
                </Button>
              </>
            )}
            <AutoRecordToggle className="border-t border-black/5 pt-4" />
            {photoSources.length > 0 && (
              <Label className="items-start gap-3 border-t border-black/5 pt-4 font-normal leading-relaxed">
                <Checkbox checked={includePhotos} onCheckedChange={(v) => setIncludePhotos(!!v)} className="mt-0.5" />
                <span className="text-sm">
                  분석 사진 포함
                  <span className="block text-xs text-neutral-500">
                    {photoSources.length === 2 ? "정면·측면" : photoSources[0] === "front" ? "정면" : "측면"} 사진에 관절점·측정선·윤곽을 겹쳐 넣어요.
                  </span>
                </span>
              </Label>
            )}
            {withPhotos && (
              <Notice tone="warn">
                신체 사진이 파일에 포함돼요. 다른 사람에게 보내거나 올리기 전에 꼭 확인해 주세요. 사진은 이 기기 안에서만 합성되며 어디로도 전송되지 않아요.
              </Notice>
            )}
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" className="rounded-full" onClick={exportPng} disabled={!!busy}>
                <Download className="size-4" aria-hidden /> PNG
              </Button>
              <Button variant="outline" className="rounded-full" onClick={exportPdf} disabled={!!busy}>
                <FileText className="size-4" aria-hidden /> PDF
              </Button>
              <Button variant="outline" className="rounded-full" onClick={share} disabled={!!busy}>
                <Share2 className="size-4" aria-hidden /> 공유
              </Button>
            </div>
            {!withPhotos && <p className="text-xs text-neutral-500">내보내는 이미지에는 사진이 포함되지 않아요.</p>}
            {msg && <Notice tone={msg.tone === "ok" ? "ok" : "error"}>{msg.text}</Notice>}
          </section>
        </aside>
      </div>

      <div className="mt-12 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Link href="/check" className={cn(buttonVariants({ variant: "ghost" }), "h-11 rounded-full")}>
            <RotateCcw className="size-4" aria-hidden /> 체크 수정
          </Link>
          <Button
            variant="ghost"
            className="h-11 rounded-full text-neutral-600"
            onClick={() => {
              if (window.confirm("이 탭에 있는 사진, 분석 데이터, 결과를 모두 지울까요? 저장한 결과 요약은 유지돼요.")) clearSession();
            }}
          >
            <Trash2 className="size-4" aria-hidden /> 세션 데이터 지우기
          </Button>
        </div>
        <Link href="/style" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-full px-6 text-base")}>
          맞춤 코디 보기 <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
