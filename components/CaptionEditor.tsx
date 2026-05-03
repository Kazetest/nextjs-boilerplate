"use client";

import { useRef, useState } from "react";
import {
  KeystrokeRecorder,
  type KeystrokeRecord,
} from "@/lib/keystroke";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onRecordChange: (record: KeystrokeRecord) => void;
  placeholder?: string;
  maxLength?: number;
  minHeight?: string;
};

export function CaptionEditor({
  value,
  onChange,
  onRecordChange,
  placeholder,
  maxLength = 500,
  minHeight = "min-h-32",
}: Props) {
  const recorderRef = useRef(new KeystrokeRecorder());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pasteWarning, setPasteWarning] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    recorderRef.current.recordDiff(value, newValue);
    onChange(newValue);
    onRecordChange(recorderRef.current.finalize(newValue));
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    e.preventDefault();
    recorderRef.current.recordPasteBlocked();
    setPasteWarning(true);
    setTimeout(() => setPasteWarning(false), 1500);
    textareaRef.current?.classList.add("no-paste-flash");
    setTimeout(
      () => textareaRef.current?.classList.remove("no-paste-flash"),
      300
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        onDrop={(e) => e.preventDefault()}
        placeholder={
          placeholder ?? "직접 입력해주세요. 붙여넣기는 차단됩니다."
        }
        maxLength={maxLength}
        className={`w-full ${minHeight} px-4 py-3 bg-bg-card border border-line focus:border-ink outline-none text-ink font-serif text-base leading-relaxed transition-colors resize-y`}
      />
      <div className="flex items-center justify-between text-xs text-ink-faint">
        <span className={pasteWarning ? "text-warn" : ""}>
          {pasteWarning ? "✕ 붙여넣기 차단됨" : "직접 입력만 허용"}
        </span>
        <span>
          {value.length} / {maxLength}
        </span>
      </div>
    </div>
  );
}
