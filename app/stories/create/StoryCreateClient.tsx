"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Camera as CameraIcon,
  CircleCheck,
  CircleDashed,
  Clock3,
  Keyboard,
  Send,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { Camera as HumanCamera } from "@/components/Camera";
import { CaptionEditor } from "@/components/CaptionEditor";
import type { ExifResult } from "@/lib/exif";
import type { KeystrokeRecord } from "@/lib/keystroke";

const MAX_STORY_IMAGE_BYTES = 8 * 1024 * 1024;

export function StoryCreateClient() {
  const router = useRouter();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [exif, setExif] = useState<ExifResult | null>(null);
  const [imageNote, setImageNote] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [keystrokes, setKeystrokes] = useState<KeystrokeRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captionReady = isStoryCaptionReady(caption, keystrokes);
  const canSubmit = !!imageFile && !submitting;

  async function handleSubmit() {
    if (submitting) return;
    if (!imageFile) {
      setError("사진을 먼저 선택해주세요.");
      return;
    }
    if (!captionReady) {
      setError("캡션은 직접 타이핑 흔적이 필요합니다. 한 글자만 더 입력하거나 캡션을 비워주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.append("image", imageFile);
    fd.append("caption", caption);
    fd.append("keystrokes", JSON.stringify(keystrokes ?? { strokes: [] }));
    fd.append("exif", JSON.stringify(exif?.data ?? {}));

    try {
      const res = await fetch("/api/stories/create", {
        method: "POST",
        body: fd,
      });
      const result = (await res.json()) as {
        error?: string;
        redirectTo?: string;
      };
      if (!res.ok || result.error) {
        setError(result.error ?? `스토리 업로드 실패 (HTTP ${res.status})`);
        setSubmitting(false);
        return;
      }
      router.push(result.redirectTo ?? "/story/me");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "스토리 업로드 실패");
      setSubmitting(false);
    }
  }

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-5">
      <header className="mb-5 flex items-center justify-between">
        <Link
          href="/feed"
          className="grid h-10 w-10 place-items-center rounded-full border border-line bg-bg-card text-ink-soft transition-colors hover:text-ink"
          aria-label="닫기"
        >
          <X size={18} />
        </Link>
        <div className="text-center">
          <p className="font-sans text-[10px] font-medium uppercase tracking-[0.26em] text-ink-faint">
            24h Story
          </p>
          <h1 className="font-serif text-2xl">오늘의 인간 순간</h1>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="grid h-10 w-10 place-items-center rounded-full bg-ink text-bg transition-colors hover:bg-ink-soft disabled:opacity-35"
          aria-label="스토리 올리기"
        >
          <Send size={17} />
        </button>
      </header>

      <StoryProofPanel
        imageFile={imageFile}
        exif={exif}
        caption={caption}
        keystrokes={keystrokes}
      />

      <div className="overflow-hidden rounded-lg border border-line bg-bg-card shadow-[0_18px_60px_rgba(26,26,26,0.08)]">
        <div className="border-b border-line px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <CameraIcon size={16} />
            <span className="font-serif">사진은 남고, 스토리는 24시간만.</span>
          </div>
        </div>
        <div className="p-3">
          <HumanCamera
            onImageCaptured={async (file, nextExif) => {
              setError(null);
              setImageNote("스토리용 이미지로 최적화 중...");
              setExif(nextExif);
              const optimized = await optimizeStoryImage(file);
              if (optimized.size > MAX_STORY_IMAGE_BYTES) {
                setImageFile(null);
                setError(
                  `이미지가 너무 커요 (${formatBytes(
                    optimized.size
                  )}). 8MB 이하 JPG/PNG/WebP로 올려주세요.`
                );
                setImageNote("이미지 최적화 후에도 8MB를 넘어서 업로드를 막았습니다.");
                return;
              }
              setImageFile(optimized);
              setImageNote(
                optimized.size < file.size
                  ? `이미지 최적화 완료: ${formatBytes(file.size)} → ${formatBytes(
                      optimized.size
                    )}`
                  : `이미지 준비 완료: ${formatBytes(optimized.size)}`
              );
            }}
            onReset={() => {
              setImageFile(null);
              setExif(null);
              setImageNote(null);
              setError(null);
            }}
          />
        </div>
      </div>

      {imageNote && (
        <p className="mt-2 px-1 font-serif text-xs text-ink-faint">
          {imageNote}
        </p>
      )}

      <div className="mt-5 rounded-lg border border-line bg-bg-card p-4">
        <CaptionEditor
          value={caption}
          onChange={setCaption}
          onRecordChange={setKeystrokes}
          maxLength={180}
          minHeight="min-h-24"
          placeholder="짧게 직접 써주세요."
        />
        {caption.trim() && !captionReady && (
          <p className="mt-2 font-serif text-xs text-warn">
            직접 입력 흔적이 아직 부족합니다. 한 글자만 더 입력하거나 캡션 없이 올릴 수 있어요.
          </p>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-warn/40 bg-warn/5 px-4 py-3 font-serif text-sm leading-relaxed text-warn">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 font-sans text-sm text-bg transition-colors hover:bg-ink-soft disabled:opacity-35"
      >
        <Send size={17} />
        {submitting ? "올리는 중" : imageFile ? "스토리 올리기" : "사진 선택 후 올리기"}
      </button>
    </main>
  );
}

function StoryProofPanel({
  imageFile,
  exif,
  caption,
  keystrokes,
}: {
  imageFile: File | null;
  exif: ExifResult | null;
  caption: string;
  keystrokes: KeystrokeRecord | null;
}) {
  const imageReady = !!imageFile;
  const freshCapture = !!exif?.data.dateTimeOriginal;
  const captionReady = isStoryCaptionReady(caption, keystrokes);
  const readyCount = [imageReady, captionReady, true].filter(Boolean).length;

  return (
    <section className="mb-5 border border-line bg-bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <ShieldCheck size={17} className="shrink-0 text-ink-soft" />
          <div className="min-w-0">
            <h2 className="truncate font-sans text-sm font-medium text-ink">
              Story proof
            </h2>
            <p className="font-serif text-xs text-ink-faint">
              {readyCount}/3 준비됨
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 border px-2 py-1 font-sans text-[11px] ${
            imageReady && captionReady
              ? "border-ink text-ink"
              : "border-line text-ink-faint"
          }`}
        >
          {imageReady && captionReady ? (
            <CircleCheck size={13} />
          ) : (
            <CircleDashed size={13} />
          )}
          {imageReady && captionReady ? "올릴 수 있음" : "진행 중"}
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
          label="문장"
          state={!caption.trim() ? "선택" : captionReady ? "직타" : "대기"}
          complete={captionReady}
        />
        <ProofItem
          icon={<Clock3 size={15} />}
          label="수명"
          state="24h"
          complete
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

function isStoryCaptionReady(
  caption: string,
  keystrokes: KeystrokeRecord | null
): boolean {
  const trimmed = caption.trim();
  if (!trimmed) return true;
  return (
    !!keystrokes &&
    keystrokes.strokes.length >= Math.max(1, Math.ceil(trimmed.length * 0.2))
  );
}

async function optimizeStoryImage(file: File) {
  if (!file.type.startsWith("image/") || file.type.includes("heic")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxWidth = 1440;
    const maxHeight = 1800;
    const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const targetBytes = 2.8 * 1024 * 1024;
    for (const quality of [0.86, 0.78, 0.7, 0.62]) {
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);
      if (!blob) continue;
      if (blob.size <= targetBytes || quality === 0.62) {
        if (blob.size >= file.size && file.size <= targetBytes) return file;
        return new File([blob], replaceExtension(file.name, "jpg"), {
          type: "image/jpeg",
          lastModified: file.lastModified,
        });
      }
    }
  } catch {
    return file;
  }

  return file;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob((blob) => resolve(blob), type, quality)
  );
}

function replaceExtension(name: string, ext: string) {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base || "story"}.${ext}`;
}

function formatBytes(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}
