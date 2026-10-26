import type { Metadata } from "next";
import { PageHeader } from "@/components/flow/StepNav";

export const metadata: Metadata = { title: "개인정보와 데이터" };

const ROWS = [
  { what: "카메라 영상", where: "브라우저 메모리", keep: "프레임 단위로 처리 후 즉시 폐기", sent: "전송 안 함" },
  { what: "촬영·업로드 사진", where: "sessionStorage (이 탭)", keep: "탭을 닫거나 직접 지울 때까지", sent: "전송 안 함" },
  { what: "관절 좌표·측정 비율", where: "sessionStorage (이 탭)", keep: "탭을 닫거나 직접 지울 때까지", sent: "전송 안 함" },
  { what: "자가 체크 응답·결과", where: "sessionStorage (이 탭)", keep: "탭을 닫거나 직접 지울 때까지", sent: "전송 안 함" },
  { what: "검사 기록 — 결과 요약", where: "localStorage (이 브라우저)", keep: "검사 완료 시 자동 기록(끌 수 있음), 최근 50개, '내 결과'에서 삭제", sent: "전송 안 함" },
  { what: "검사 기록 — 관절 좌표·측정값·응답", where: "IndexedDB (이 브라우저)", keep: "결과 요약과 함께 기록·삭제", sent: "전송 안 함" },
  { what: "검사 기록 — 사진 (선택)", where: "IndexedDB (이 브라우저)", keep: "'사진도 함께 기록'을 켠 경우만, 긴 변 960px로 축소. 사진만 따로 삭제 가능", sent: "전송 안 함" },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader eyebrow="PRIVACY" title="개인정보와 데이터 처리" description="FRAME FIT은 로그인이 필요 없고, 신체 사진과 영상을 서버로 보내지 않아요." />
      <div className="mx-auto w-full max-w-4xl space-y-10 px-5 text-[15px] leading-relaxed text-neutral-700 sm:px-8">
        <div className="overflow-x-auto rounded-3xl ring-1 ring-black/5">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-surface text-neutral-500">
              <tr>
                <th scope="col" className="p-4 font-medium">데이터</th>
                <th scope="col" className="p-4 font-medium">보관 위치</th>
                <th scope="col" className="p-4 font-medium">보관 기간</th>
                <th scope="col" className="p-4 font-medium">외부 전송</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {ROWS.map((r) => (
                <tr key={r.what}>
                  <th scope="row" className="p-4 font-medium text-ink">{r.what}</th>
                  <td className="p-4">{r.where}</td>
                  <td className="p-4">{r.keep}</td>
                  <td className="p-4">{r.sent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <section>
          <h2 className="text-lg font-semibold text-ink">네트워크 요청</h2>
          <p className="mt-2">
            포즈 분석을 위해 MediaPipe 분석 엔진(WASM)과 포즈 인식 모델 파일을 내려받아요. 모델 파일은 Google의 공식 모델 저장소에서 제공되며,
            이때 일반적인 웹 요청처럼 IP 주소 등 접속 정보가 해당 서버에 전달될 수 있어요. 사진·영상·좌표는 포함되지 않아요. 자체 서버에 모델을
            호스팅하려면 README의 환경 변수 설정을 참고하세요.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink">다른 사람을 촬영할 때</h2>
          <p className="mt-2">
            신체 사진은 민감할 수 있는 정보예요. 다른 사람을 촬영하거나 사진을 분석할 때는 반드시 본인의 동의를 받고, 결과를 공유할 때도 동의를
            구해 주세요. 미성년자 촬영은 보호자의 동의가 필요해요.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-ink">표현 원칙</h2>
          <p className="mt-2">
            결과는 외모를 평가하지 않으며, 체형의 좋고 나쁨을 말하지 않아요. 골격 유형은 스타일링을 위한 참고 분류이고, 의학적·전문적 진단이
            아니에요.
          </p>
        </section>
      </div>
    </>
  );
}
