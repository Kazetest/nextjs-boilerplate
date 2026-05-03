"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "@/components/Camera";
import { CaptionEditor } from "@/components/CaptionEditor";
import { OriginPicker, type Origin } from "@/components/OriginPicker";
import { createPost } from "./actions";
import type { KeystrokeRecord } from "@/lib/keystroke";
import type { ExifResult } from "@/lib/exif";

export default function CreateClient() {
  const router = useRouter();
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

    const result = await createPost(fd);

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    } else {
      router.push("/feed");
      router.refresh();
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
            <p className="text-sm text-warn font-serif text-center">⚠ {error}</p>
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
              className="flex-1 px-4 py-3 bg-ink text-bg hover:bg-ink-soft disabled:opacity-40 transition-colors font-serif"
            >
              {submitting ? "게시 중..." : "게시"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-12 text-xs">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={`flex items-center gap-2 ${
            n === current ? "text-ink" : "text-ink-faint"
          }`}
        >
          <span
            className={`w-7 h-7 flex items-center justify-center rounded-full border font-serif ${
              n === current
                ? "border-ink bg-ink text-bg"
                : "border-line"
            }`}
          >
            {n}
          </span>
          {n < 3 && <span className="w-8 h-px bg-line" />}
        </div>
      ))}
    </div>
  );
}
