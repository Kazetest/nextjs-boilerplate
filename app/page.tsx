import Link from "next/link";

export default function Landing() {
  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-20 max-w-3xl mx-auto text-center w-full">
      <div className="mb-3 text-[10px] tracking-[0.4em] text-ink-faint uppercase">
        NO AI · BY HUMAN ONLY
      </div>

      <h1 className="font-serif text-5xl md:text-7xl font-normal leading-[1.05] tracking-tight mb-10">
        AI를 쓰지
        <br />
        <em className="italic font-normal">못하는</em> SNS
      </h1>

      <p className="text-lg md:text-xl text-ink-soft leading-relaxed max-w-xl mb-14 font-serif">
        AI가 다 쓰는 시대에,
        <br />
        <span className="text-ink">진짜 사람이 직접 찍고 쓴 것</span>만 모이는 곳.
      </p>

      <Link
        href="/login"
        className="group inline-flex items-center gap-3 px-8 py-4 bg-ink text-bg hover:bg-ink-soft transition-colors text-lg"
      >
        시작하기
        <span className="transition-transform group-hover:translate-x-1">→</span>
      </Link>

      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-10 text-left max-w-3xl w-full">
        <Feature
          n="01"
          title="카메라 직촬만"
          desc="갤러리 업로드·AI 생성 이미지 차단. EXIF·메타데이터 검증."
        />
        <Feature
          n="02"
          title="키스트로크 인증"
          desc="복사·붙여넣기 차단. 모든 글은 한 글자씩 직접 입력합니다."
        />
        <Feature
          n="03"
          title="원작 추적"
          desc="누군가를 따라했다면 출처 필수. 카피가 원작을 추월하는 순간을 보세요."
        />
      </div>

      <footer className="mt-32 text-xs text-ink-faint">
        © 2026 NOai · Made by Human Only
      </footer>
    </main>
  );
}

function Feature({
  n,
  title,
  desc,
}: {
  n: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="border-t border-line pt-4">
      <div className="text-xs text-ink-faint mb-2 tracking-widest">{n}</div>
      <h3 className="font-serif text-xl mb-2">{title}</h3>
      <p className="text-sm text-ink-soft leading-relaxed">{desc}</p>
    </div>
  );
}
