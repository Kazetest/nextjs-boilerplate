import Link from "next/link";

export const metadata = {
  title: "개인정보처리방침 — NOai",
};

export default function PrivacyPage() {
  return (
    <main className="relative z-10 max-w-2xl mx-auto px-6 py-16 w-full">
      <Link
        href="/"
        className="text-[10px] tracking-[0.4em] text-ink-faint uppercase mb-12 inline-block hover:text-ink"
      >
        ← NOai
      </Link>
      <h1 className="font-serif text-4xl mb-2">개인정보처리방침</h1>
      <p className="text-xs text-ink-faint font-serif mb-12">
        시행일: 2026년 5월 3일
      </p>

      <div className="space-y-8 font-serif text-base leading-relaxed text-ink">
        <section>
          <h2 className="text-xl mb-3 text-ink">1. 수집하는 정보</h2>
          <ul className="list-disc list-inside space-y-1 text-ink-soft">
            <li>이메일 주소 (가입·로그인)</li>
            <li>닉네임, 표시 이름, 한 줄 소개 (선택)</li>
            <li>게시물의 사진, 캡션, EXIF 메타데이터</li>
            <li>키스트로크 타이밍 데이터 (진본성 검증)</li>
            <li>Google OAuth 로그인 시: Google 계정 이메일·이름</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl mb-3 text-ink">2. 사용 목적</h2>
          <ul className="list-disc list-inside space-y-1 text-ink-soft">
            <li>계정 생성·로그인</li>
            <li>게시물 진본성 검증·표시</li>
            <li>커뮤니티 신고 처리</li>
            <li>AI 생성 콘텐츠 탐지 (제3자 SightEngine 활용)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl mb-3 text-ink">3. 보관 위치</h2>
          <p className="text-ink-soft">
            모든 데이터는 Supabase(PostgreSQL + Object Storage)에 저장되며,
            Vercel(미국)에서 서비스 처리됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl mb-3 text-ink">4. 제3자 제공</h2>
          <ul className="list-disc list-inside space-y-1 text-ink-soft">
            <li>Google: OAuth 로그인 시 표준 정보 교환</li>
            <li>SightEngine: AI 생성 이미지 탐지를 위해 업로드 사진 일부 전송</li>
          </ul>
          <p className="text-ink-soft mt-2">
            그 외 제3자에 정보를 판매·공유하지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl mb-3 text-ink">5. 사용자 권리</h2>
          <p className="text-ink-soft">
            사용자는 언제든 본인 게시물 삭제, 계정 탈퇴, 데이터 열람 요청을 할
            수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl mb-3 text-ink">6. 보관 기간</h2>
          <p className="text-ink-soft">
            계정 탈퇴 시 즉시 모든 게시물·키스트로크·EXIF 데이터를 삭제합니다.
            법령상 보관 의무가 있는 데이터는 해당 기간 동안만 보관 후 파기합니다.
          </p>
        </section>
      </div>

      <div className="mt-16 pt-8 border-t border-line flex justify-between text-xs text-ink-faint font-serif">
        <Link href="/legal/terms" className="hover:text-ink">
          이용약관 →
        </Link>
        <Link href="/" className="hover:text-ink">
          ← 홈
        </Link>
      </div>
    </main>
  );
}
