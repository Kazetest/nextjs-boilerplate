import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-20 max-w-md mx-auto text-center w-full">
      <div className="text-[10px] tracking-[0.4em] text-ink-faint uppercase mb-4">
        404
      </div>
      <h1 className="font-serif text-5xl mb-6">없는 페이지</h1>
      <p className="text-ink-soft font-serif mb-12 leading-relaxed">
        주소를 잘못 입력하셨거나
        <br />
        삭제된 게시물일 수 있습니다.
      </p>
      <Link
        href="/feed"
        className="px-6 py-3 bg-ink text-bg hover:bg-ink-soft transition-colors font-serif"
      >
        ← 피드로 돌아가기
      </Link>
    </main>
  );
}
