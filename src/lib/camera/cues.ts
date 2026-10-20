/**
 * 촬영 보조 신호 — 멀리 서서 촬영할 때 화면을 보지 않아도 진행 상황을 알 수 있게 합니다.
 * 음성은 기기 내장 TTS(speechSynthesis)만 사용하며 외부로 전송하지 않습니다.
 */

export function voiceSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string) {
  if (!voiceSupported()) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR";
  u.rate = 1.05;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (voiceSupported()) window.speechSynthesis.cancel();
}

let audioCtx: AudioContext | null = null;

/** 짧은 셔터음 (사용자 조작 이후에만 소리가 남) */
export function shutterSound() {
  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  } catch {
    /* 오디오를 쓸 수 없는 환경은 무시 */
  }
}

/** 연속 촬영 중 단계별 안내 문구 */
export const SEQUENCE_CUES = {
  startFront: "정면을 바라보고 전신이 화면에 들어오게 서 주세요.",
  turnToSide: "정면 촬영을 마쳤어요. 몸을 옆으로 90도 돌려 옆모습을 보여 주세요.",
  countdown: "3초 후에 촬영해요. 자세를 유지해 주세요.",
  done: "정면과 측면 촬영을 모두 마쳤어요.",
} as const;
