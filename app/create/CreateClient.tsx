"use client";

import { useState } from "react";
import { Camera } from "@/components/Camera";
import { CaptionEditor } from "@/components/CaptionEditor";
import { OriginPicker, type Origin } from "@/components/OriginPicker";
import { createPost } from "./actions";
import type { KeystrokeRecord } from "@/lib/keystroke";
import type { ExifResult } from "@/lib/exif";

export default function CreateClient() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [exif, setExif] = useState<ExifResult | null>(null);

  const [caption, setCaption] = useState("");
  const [keystrokes, setKeystrokes] = useState<KeystrokeRecord | null>(null);

  const [origin, setOrigin] = useState<Origin>({ type: "original" });

  async function handleSubmit() {
    if (!imageFile || !caption.trim() || !keystrokes) return;

    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.append("image", imageFile);
    fd.append("caption", caption);
    fd.append("keystrokes", JSON.stringify(keystrokes));
    fd.append("exif", JSON.stringify(exif?.data ?? {}));
    fd.append("originType", origin.type);
    if (origin.creatorUsername)
      fd.append("originCreator", origin.creatorUsername);
    if (origin.label) fd.append("originLabel", origin.label);

    // 25초 이상 응답 없으면 사용자에게 진단 메시지 (Vercel timeout이 보통 그 안에 떨어짐)
    const slowWarn = setTimeout(() => {
      setError(
        "응답이 없어요. /debug 페이지에서 테이블 ✓ 여부 확인하거나 Vercel Functions 로그 봐주세요."
      );
    }, 25000);

    try {
      console.log("[NOai] createPost: submit start", {
        imageSize: imageFile.size,
        captionLen: caption.length,
      });
      const result = await createPost(fd);
      console.log("[NOai] createPost: result", result);

      if (result?.error) {
        setError(result.error);
        setSubmitting(false);
      }
      // 성공 시 redirect 발생 — 이 코드 도달 안 함
    } catch (e: unknown) {
      // Next.js redirect는 NEXT_REDIRECT throw — 그대로 전파해야 navigate 됨
      const digest = (e as { digest?: string })?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
        throw e;
      }
      console.error("[NOai] createPost threw:", e);
      setError(
        e instanceof Error
          ? `게시 실패: ${e.message}`
          : "게시 실패 (서버 에러). /debug 확인."
      );
      setSubmitting(false);
    } finally {
      clearTimeout(slowWarn);
    }
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8 w-full relative z-10">
      <Stepper current={step} />

      {step === 1 && (
        <div className="space-y-6">
          <h2 className="font-serif text-2xl text-center">사진 촬영</h2>
          <Camera
            onImageCaptured={(file, e) => {
              setImageFile(file);
              setExif(e);
            }}
          />
          {imageFile && (
            <button
              onClick={() => setStep(2)}
              className="w-full px-4 py-3 bg-ink text-bg hover:bg-ink-soft transition-colors font-serif"
            >
              다음 →
            </button>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <h2 className="font-serif text-2xl text-center">캡션</h2>
          <CaptionEditor
            value={caption}
            onChange={setCaption}
            onRecordChange={setKeystrokes}
            placeholder="고민하면서 천천히 써주세요. 그 흔적이 곧 진본성입니다."
            minHeight="min-h-40"
          />
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 px-4 py-3 border border-line hover:border-ink transition-colors font-serif"
            >
              ← 이전
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!caption.trim()}
              className="flex-1 px-4 py-3 bg-ink text-bg hover:bg-ink-soft disabled:opacity-40 transition-colors font-serif"
            >
              다음 →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <h2 className="font-serif text-2xl text-center">원작 출처</h2>
          <OriginPicker value={origin} onChange={setOrigin} />
          {error && (
            <div className="px-4 py-3 border border-warn/40 bg-warn/5 text-warn text-sm font-serif leading-relaxed">
              <span className="block mb-0.5 text-[10px] tracking-[0.3em] uppercase opacity-70">
                Error
              </span>
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              disabled={submitting}
              className="flex-1 px-4 py-3 border border-line hover:border-ink transition-colors font-serif disabled:opacity-40"
            >
              ← 이전
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !imageFile || !caption.trim()}
              className="flex-1 px-4 py-3 bg-ink text-bg hover:bg-ink-soft disabled:opacity-40 transition-colors font-serif inline-flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <LoadingDots />
                  <span>게시 중</span>
                </>
              ) : (
                "게시"
              )}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

const STEP_LABELS = ["촬영", "캡션", "원작"];

function LoadingDots() {
  return (
    <span className="inline-flex gap-1" aria-label="loading">
      <span className="w-1.5 h-1.5 bg-bg rounded-full animate-pulse [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 bg-bg rounded-full animate-pulse [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 bg-bg rounded-full animate-pulse" />
    </span>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="mb-12">
      <div className="flex items-center justify-center gap-3">
        {[1, 2, 3].map((n) => {
          const done = n < current;
          const active = n === current;
          return (
            <div key={n} className="flex items-center gap-3">
              <div
                className={`flex flex-col items-center gap-1.5 transition-colors ${
                  active ? "text-ink" : done ? "text-ink-soft" : "text-ink-faint"
                }`}
              >
                <span
                  className={`w-8 h-8 flex items-center justify-center text-xs font-serif border transition-all ${
                    active
                      ? "border-ink bg-ink text-bg scale-110"
                      : done
                      ? "border-ink-soft bg-ink-soft/10 text-ink"
                      : "border-line"
                  }`}
                >
                  {done ? "✓" : n}
                </span>
                <span
                  className={`text-[10px] tracking-[0.2em] font-serif uppercase ${
                    active ? "text-ink" : "text-ink-faint"
                  }`}
                >
                  {STEP_LABELS[n - 1]}
                </span>
              </div>
              {n < 3 && (
                <span
                  className={`w-10 h-px transition-colors ${
                    done ? "bg-ink-soft" : "bg-line"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
