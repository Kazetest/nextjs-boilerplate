"use client";

export type Origin = {
  type: "original" | "inspired_by_user" | "overseas_meme";
  creatorUsername?: string;
  label?: string;
};

type Props = {
  value: Origin;
  onChange: (v: Origin) => void;
};

export function OriginPicker({ value, onChange }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft font-serif text-center">
        다른 사람의 콘텐츠를 따라하셨나요?
      </p>

      <div className="space-y-2">
        <Choice
          label="아니오 — 오리지널입니다"
          desc="100% 본인 아이디어"
          selected={value.type === "original"}
          onClick={() => onChange({ type: "original" })}
        />
        <Choice
          label="네 — 다른 사람을 따라했습니다"
          desc="원작자 아이디 멘션 필수"
          selected={value.type === "inspired_by_user"}
          onClick={() =>
            onChange({
              type: "inspired_by_user",
              creatorUsername: value.creatorUsername,
            })
          }
        />
        <Choice
          label="해외 밈/트렌드입니다"
          desc="구체적 원작자 없음"
          selected={value.type === "overseas_meme"}
          onClick={() =>
            onChange({ type: "overseas_meme", label: value.label })
          }
        />
      </div>

      {value.type === "inspired_by_user" && (
        <div className="pt-4 border-t border-line">
          <label className="block text-sm text-ink-soft mb-2 font-serif">
            원작자 아이디
          </label>
          <div className="flex items-center bg-bg-card border border-line focus-within:border-ink">
            <span className="pl-3 text-ink-faint font-serif">@</span>
            <input
              type="text"
              value={value.creatorUsername ?? ""}
              onChange={(e) =>
                onChange({ ...value, creatorUsername: e.target.value })
              }
              placeholder="원작자_아이디"
              className="flex-1 px-2 py-3 bg-transparent outline-none font-serif"
            />
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            NOai 가입자라면 자동 멘션. 외부 인플루언서면 그 사람 아이디 그대로.
          </p>
        </div>
      )}

      {value.type === "overseas_meme" && (
        <div className="pt-4 border-t border-line">
          <label className="block text-sm text-ink-soft mb-2 font-serif">
            밈 라벨 (선택)
          </label>
          <input
            type="text"
            value={value.label ?? ""}
            onChange={(e) => onChange({ ...value, label: e.target.value })}
            placeholder="예: 도지밈, sigma"
            className="w-full px-3 py-3 bg-bg-card border border-line focus:border-ink outline-none font-serif"
          />
        </div>
      )}
    </div>
  );
}

function Choice({
  label,
  desc,
  selected,
  onClick,
}: {
  label: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-4 border transition-colors ${
        selected
          ? "border-ink bg-bg-card"
          : "border-line hover:border-ink-soft"
      }`}
    >
      <div className="font-serif text-base text-ink">{label}</div>
      <div className="text-xs text-ink-faint mt-1">{desc}</div>
    </button>
  );
}
