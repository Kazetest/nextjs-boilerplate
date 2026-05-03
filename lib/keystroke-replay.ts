import type { KeystrokeRecord } from "./keystroke";

// 시점 ms에서 보여줄 텍스트 재구성
export function reconstructAt(record: KeystrokeRecord, ms: number): string {
  let text = "";
  for (const s of record.strokes) {
    if (s.t > ms) break;
    if (s.c === "\b") {
      text = text.slice(0, -1);
    } else if (s.c.startsWith("~")) {
      text = text.slice(0, -1) + s.c.slice(1);
    } else {
      text += s.c;
    }
  }
  return text;
}
