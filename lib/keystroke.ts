// 키스트로크 기록 라이브러리
// 한글 IME 호환: keydown 대신 onChange diff 기반

export type Stroke = {
  t: number; // ms from start
  c: string; // char added (or '\b' for delete)
  l: number; // text length after this stroke
};

export type KeystrokeRecord = {
  startedAt: string;
  endedAt: string;
  durationMs: number;
  finalLength: number;
  totalKeys: number;
  pasteBlocked: number;
  strokes: Stroke[];
};

export class KeystrokeRecorder {
  private startTime = 0;
  private strokes: Stroke[] = [];
  private pasteCount = 0;
  private started = false;

  start() {
    this.startTime = Date.now();
    this.strokes = [];
    this.pasteCount = 0;
    this.started = true;
  }

  recordDiff(oldText: string, newText: string) {
    if (!this.started) this.start();
    const t = Date.now() - this.startTime;
    if (newText.length > oldText.length) {
      const added = newText.slice(oldText.length);
      // IME composition 시 여러 글자가 한 번에 들어올 수 있음 — 통째 기록
      this.strokes.push({ t, c: added, l: newText.length });
    } else if (newText.length < oldText.length) {
      this.strokes.push({ t, c: "\b", l: newText.length });
    } else {
      // 길이 같지만 내용 다름 (선택 후 덮어쓰기 등) — 통째로 기록
      this.strokes.push({ t, c: "~" + newText.slice(-1), l: newText.length });
    }
  }

  recordPasteBlocked() {
    this.pasteCount += 1;
  }

  reset() {
    this.startTime = 0;
    this.strokes = [];
    this.pasteCount = 0;
    this.started = false;
  }

  finalize(finalText: string): KeystrokeRecord {
    const now = Date.now();
    return {
      startedAt: new Date(this.startTime || now).toISOString(),
      endedAt: new Date(now).toISOString(),
      durationMs: this.startTime ? now - this.startTime : 0,
      finalLength: finalText.length,
      totalKeys: this.strokes.length,
      pasteBlocked: this.pasteCount,
      strokes: this.strokes,
    };
  }
}

export type Verdict = { ok: boolean; reason?: string };

export function verifyKeystrokes(rec: KeystrokeRecord): Verdict {
  if (rec.finalLength === 0) return { ok: false, reason: "내용 없음" };
  // 너무 빠름 (한 글자당 20ms 미만)
  if (rec.durationMs < rec.finalLength * 20) {
    return { ok: false, reason: "타이핑이 너무 빠릅니다" };
  }
  // 키스트로크 수 부족 (한국어 IME 고려해 finalLength * 0.4 이상 필요)
  if (rec.totalKeys < Math.max(3, rec.finalLength * 0.4)) {
    return { ok: false, reason: "타이핑 흔적이 부족합니다" };
  }
  return { ok: true };
}
