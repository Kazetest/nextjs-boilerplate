// SightEngine AI 이미지 탐지
// 환경변수 없으면 자동 스킵 (시드 베타 이전엔 끄고 운영 가능)

export type AICheckResult = {
  enabled: boolean;
  score?: number; // 0~1, AI 생성 확률
  isAI?: boolean;
  error?: string;
};

const AI_THRESHOLD = 0.6;

export async function detectAIImage(file: File): Promise<AICheckResult> {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (!apiUser || !apiSecret) {
    return { enabled: false };
  }

  try {
    const fd = new FormData();
    fd.append("media", file);
    fd.append("models", "genai");
    fd.append("api_user", apiUser);
    fd.append("api_secret", apiSecret);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body: fd,
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      return { enabled: true, error: `SightEngine ${res.status}` };
    }

    const data = await res.json();
    // 응답 구조: { type: { ai_generated: 0.0 ~ 1.0 }, status: 'success' }
    const score = (data?.type?.ai_generated as number) ?? 0;

    return {
      enabled: true,
      score,
      isAI: score >= AI_THRESHOLD,
    };
  } catch (e) {
    return {
      enabled: true,
      error: e instanceof Error ? e.message : "SightEngine 호출 실패",
    };
  }
}
