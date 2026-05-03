// 한국어/영어/숫자 해시태그 파싱
// 예: "오늘 노을 #일상 #한강 좋다 #seoul" → ["일상", "한강", "seoul"]

const HASHTAG_REGEX = /#([\p{L}\p{N}_]+)/gu;

export function extractHashtags(text: string): string[] {
  const set = new Set<string>();
  for (const m of text.matchAll(HASHTAG_REGEX)) {
    set.add(m[1].toLowerCase());
  }
  return Array.from(set);
}

// caption을 JSX-friendly 토큰으로 분리
export type CaptionToken =
  | { type: "text"; value: string }
  | { type: "hashtag"; tag: string };

export function tokenizeCaption(text: string): CaptionToken[] {
  const tokens: CaptionToken[] = [];
  let lastIndex = 0;
  for (const m of text.matchAll(HASHTAG_REGEX)) {
    const start = m.index ?? 0;
    if (start > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    tokens.push({ type: "hashtag", tag: m[1] });
    lastIndex = start + m[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }
  return tokens;
}

// AI 의심 해시태그 자동 검출 (게시 시 경고용)
const AI_HASHTAGS = new Set([
  "ai",
  "midjourney",
  "stablediffusion",
  "dalle",
  "chatgpt",
  "gpt",
  "claude",
  "gemini",
  "ainature",
  "aiart",
  "aigenerated",
]);

export function detectAiHashtags(text: string): string[] {
  return extractHashtags(text).filter((t) => AI_HASHTAGS.has(t));
}
