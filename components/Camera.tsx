"use client";

import { useRef, useState } from "react";
import { extractExif, type ExifResult } from "@/lib/exif";

type Props = {
  onImageCaptured: (file: File, exif: ExifResult) => void;
  onReset?: () => void;
};

export function Camera({ onImageCaptured, onReset }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    try {
      const exif = await extractExif(file);

      if (!exif.ok) {
        setError(exif.reason ?? "이미지 검증 실패");
        setLoading(false);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      const url = URL.createObjectURL(file);
      setPreview(url);
      onImageCaptured(file, exif);
    } catch {
      setError("이미지 처리 실패");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setError(null);
    onReset?.();
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      {!preview ? (
        <label className="block aspect-[4/5] border-2 border-dashed border-line hover:border-ink transition-colors cursor-pointer relative bg-bg-card">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleCapture}
            className="sr-only"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-ink-soft text-center px-6">
            <div className="font-serif text-5xl mb-3">◎</div>
            <div className="font-serif text-lg">사진 선택 또는 촬영</div>
            <div className="text-xs text-ink-faint mt-2 leading-relaxed">
              EXIF 촬영시각이 확인된 사진엔 ✓ 직촬 배지가 붙습니다.
              <br />
              AI 생성 이미지는 차단됩니다.
            </div>
          </div>
        </label>
      ) : (
        <div className="relative aspect-[4/5] bg-bg-card overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="w-full h-full object-cover" />
          <button
            onClick={reset}
            className="absolute top-2 right-2 px-3 py-1 bg-ink/80 text-bg text-sm hover:bg-ink font-serif"
            type="button"
          >
            다시 촬영
          </button>
        </div>
      )}

      {loading && (
        <p className="text-sm text-ink-soft font-serif">검증 중...</p>
      )}
      {error && <p className="text-sm text-warn font-serif">⚠ {error}</p>}
    </div>
  );
}
