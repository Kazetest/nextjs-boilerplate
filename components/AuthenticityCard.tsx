import type { PostRow } from "./PostCard";

type ExifData = {
  dateTimeOriginal?: string;
  cameraModel?: string;
  software?: string;
  width?: number;
  height?: number;
};

export function AuthenticityCard({ post }: { post: PostRow }) {
  const exif = (post.exif_data ?? {}) as ExifData;

  return (
    <div className="bg-bg-card border border-line p-4 space-y-1 text-sm font-serif">
      <h3 className="text-[10px] tracking-[0.3em] text-ink-faint uppercase mb-3">
        진본성 카드
      </h3>
      <Row
        label="촬영 시각"
        value={exif.dateTimeOriginal ?? "(EXIF 없음)"}
      />
      <Row label="카메라" value={exif.cameraModel ?? "(미상)"} />
      <Row
        label="소프트웨어"
        value={exif.software ? exif.software : "(없음)"}
      />
      <Row
        label="해상도"
        value={
          exif.width && exif.height
            ? `${exif.width} × ${exif.height}`
            : "(미상)"
        }
      />
      <Row
        label="게시 시각"
        value={new Date(post.created_at).toLocaleString("ko-KR")}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-line last:border-0">
      <span className="text-ink-faint">{label}</span>
      <span className="text-ink text-right">{value}</span>
    </div>
  );
}
