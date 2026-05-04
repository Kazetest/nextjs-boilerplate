"use client";

import { useState } from "react";
import {
  Camera as CameraIcon,
  CircleCheck,
  CircleDashed,
  FileCheck,
  Keyboard,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
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
      <AuthenticityChecklist
        imageFile={imageFile}
        exif={exif}
        caption={caption}
        keystrokes={keystrokes}
        origin={origin}
      />

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

function AuthenticityChecklist({
  imageFile,
  exif,
  caption,
  keystrokes,
  origin,
}: {
  imageFile: File | null;
  exif: ExifResult | null;
  caption: string;
  keystrokes: KeystrokeRecord | null;
  origin: Origin;
}) {
  const trimmedCaption = caption.trim();
  const imageReady = !!imageFile;
  const freshCapture = !!exif?.data.dateTimeOriginal;
  const captionReady =
    !!keystrokes &&
    trimmedCaption.length > 0 &&
    keystrokes.strokes.length >= Math.max(3, trimmedCaption.length * 0.4) &&
    keystrokes.durationMs >= trimmedCaption.length * 20;
  const originReady =
    origin.type === "original" ||
    origin.type === "overseas_meme" ||
    !!origin.creatorUsername?.trim();
  const readyCount = [imageReady, captionReady, originReady].filter(Boolean)
    .length;

  return (
    <section className="mb-8 border border-line bg-bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <ShieldCheck size={17} className="shrink-0 text-ink-soft" />
          <div className="min-w-0">
            <h2 className="truncate font-sans text-sm font-medium text-ink">
              Human proof
            </h2>
            <p className="font-serif text-xs text-ink-faint">
              {readyCount}/3 준비됨
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 border px-2 py-1 font-sans text-[11px] ${
            readyCount === 3
              ? "border-ink text-ink"
              : "border-line text-ink-faint"
          }`}
        >
          {readyCount === 3 ? (
            <CircleCheck size={13} />
          ) : (
            <CircleDashed size={13} />
          )}
          {readyCount === 3 ? "게시 가능" : "진행 중"}
        </span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-line">
        <ProofItem
          icon={<CameraIcon size={15} />}
          label="사진"
          state={imageReady ? (freshCapture ? "직촬" : "확인") : "대기"}
          complete={imageReady}
          caution={imageReady && !freshCapture}
        />
        <ProofItem
          icon={<Keyboard size={15} />}
          label="캡션"
          state={captionReady ? "직타" : "대기"}
          complete={captionReady}
        />
        <ProofItem
          icon={<FileCheck size={15} />}
          label="출처"
          state={originLabel(origin)}
          complete={originReady}
        />
      </div>
    </section>
  );
}

function ProofItem({
  icon,
  label,
  state,
  complete,
  caution = false,
}: {
  icon: React.ReactNode;
  label: string;
  state: string;
  complete: boolean;
  caution?: boolean;
}) {
  return (
    <div className="min-w-0 px-3 py-3">
      <div className="mb-2 flex items-center gap-1 font-sans text-[11px] text-ink-faint">
        {icon}
        {label}
      </div>
      <div
        className={`flex items-center gap-1 font-sans text-sm font-medium ${
          complete ? "text-ink" : "text-ink-faint"
        }`}
      >
        {caution ? (
          <TriangleAlert size={14} />
        ) : complete ? (
          <CircleCheck size={14} />
        ) : (
          <CircleDashed size={14} />
        )}
        <span className="truncate">{state}</span>
      </div>
    </div>
  );
}

function originLabel(origin: Origin): string {
  if (origin.type === "original") return "원본";
  if (origin.type === "overseas_meme") return "밈";
  return origin.creatorUsername?.trim() ? "멘션" : "대기";
}
