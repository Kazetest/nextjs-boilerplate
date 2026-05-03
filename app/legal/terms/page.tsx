import Link from "next/link";

export const metadata = {
  title: "이용약관 — NOai",
};

export default function TermsPage() {
  return (
    <main className="relative z-10 max-w-2xl mx-auto px-6 py-16 w-full">
      <Link
        href="/"
        className="text-[10px] tracking-[0.4em] text-ink-faint uppercase mb-12 inline-block hover:text-ink"
      >
        ← NOai
      </Link>
      <h1 className="font-serif text-4xl mb-2">이용약관</h1>
      <p className="text-xs text-ink-faint font-serif mb-12">
        시행일: 2026년 5월 3일
      </p>

      <div className="space-y-8 font-serif text-base leading-relaxed text-ink">
        <section>
          <h2 className="text-xl mb-3 text-ink">1. 서비스 정의</h2>
          <p className="text-ink-soft">
            NOai는 인공지능(AI)으로 생성된 콘텐츠를 받지 않는 소셜 네트워크
            서비스입니다. 모든 게시물은 진짜 사람이 직접 촬영하고 직접 입력한
            것이어야 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl mb-3 text-ink">2. 금지 콘텐츠</h2>
          <ul className="list-disc list-inside space-y-1 text-ink-soft">
            <li>
              생성형 AI(Midjourney, Stable Diffusion, DALL-E 등)로 만든 이미지
            </li>
            <li>대형언어모델(LLM)로 작성한 텍스트</li>
            <li>붙여넣기, 자동 입력 도구로 작성된 캡션·댓글</li>
            <li>타인의 콘텐츠를 원작 표기 없이 복제한 게시물</li>
            <li>스팸, 혐오, 불법 콘텐츠</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl mb-3 text-ink">3. 검증 시스템</h2>
          <p className="text-ink-soft">
            NOai는 다음 방식으로 콘텐츠의 진본성을 검증합니다:
          </p>
          <ul className="list-disc list-inside space-y-1 text-ink-soft mt-2">
            <li>EXIF 메타데이터 검사</li>
            <li>키스트로크 패턴 기록</li>
            <li>AI 생성 이미지 탐지(SightEngine 등)</li>
            <li>커뮤니티 신고 (3회 누적 시 자동 회색처리)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl mb-3 text-ink">4. 계정 정책</h2>
          <p className="text-ink-soft">
            계정 1개는 사람 1명에 해당합니다. 다중 계정, 봇 운영, 어뷰징 신고
            행위는 즉시 정지됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl mb-3 text-ink">5. 데이터</h2>
          <p className="text-ink-soft">
            게시물에 첨부된 EXIF·키스트로크 데이터는 진본성 인증 목적으로
            저장되며, 게시물과 함께 다른 사용자에게 공개됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl mb-3 text-ink">6. 면책</h2>
          <p className="text-ink-soft">
            NOai는 사용자 게시물에 대해 사후 모더레이션을 수행하지만 100%
            완벽한 AI 차단을 보장하지 않습니다. 의심 게시물은 신고해주세요.
          </p>
        </section>

        <section>
          <h2 className="text-xl mb-3 text-ink">7. 문의</h2>
          <p className="text-ink-soft">
            본 약관 관련 문의는 가입 이메일을 통해 회신드립니다.
          </p>
        </section>
      </div>

      <div className="mt-16 pt-8 border-t border-line flex justify-between text-xs text-ink-faint font-serif">
        <Link href="/legal/privacy" className="hover:text-ink">
          개인정보처리방침 →
        </Link>
        <Link href="/" className="hover:text-ink">
          ← 홈
        </Link>
      </div>
    </main>
  );
}
