import Image from "next/image";

export function HumanAvatar({
  username,
  avatarUrl,
  size = "md",
  ring = false,
  seen = false,
}: {
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  ring?: boolean;
  seen?: boolean;
}) {
  const sizes = {
    sm: "h-10 w-10 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-base",
    xl: "h-24 w-24 text-2xl",
  };

  const avatar = (
    <span
      className={`${sizes[size]} grid shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-bg-card font-sans font-medium uppercase text-ink`}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          width={96}
          height={96}
          className="h-full w-full object-cover"
        />
      ) : (
        username.slice(0, 2)
      )}
    </span>
  );

  if (!ring) return avatar;

  return (
    <span
      className={`rounded-full p-[2px] ${
        seen
          ? "bg-line"
          : "bg-[conic-gradient(from_180deg,#e05252,#f2b84b,#35a887,#2b86c5,#e05252)]"
      }`}
    >
      <span className="block rounded-full bg-bg p-[2px]">{avatar}</span>
    </span>
  );
}
