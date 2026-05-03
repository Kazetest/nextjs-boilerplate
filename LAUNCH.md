# NOai 출시 체크리스트

## ✅ 완료 (D-Day까지)

- [x] Vercel 배포 (`https://nextjs-boilerplate-one-rosy-552q3lxzl7.vercel.app`)
- [x] Supabase Auth (Google OAuth + 매직링크)
- [x] DB 스키마 + RLS
- [x] 모더레이션 마이그레이션 (002)
- [x] 카메라 + EXIF + 키스트로크 + 원작 + 신고/차단
- [x] 피드 + 탐색 + 프로필 + 포스트 상세 + 트렌드
- [x] 키스트로크 5배속 재생
- [x] 진본성 카드 ⓘ
- [x] PWA manifest
- [x] 이용약관 + 개인정보처리방침
- [x] /404 + /error 페이지

## 🚦 출시 전 (D-1)

### 도메인 (1순위)
- [ ] **noai.app** Cloudflare Registrar 구매 (~$20/년)
- [ ] Vercel → Project Settings → Domains → `noai.app` 추가
- [ ] Cloudflare DNS에 Vercel CNAME (자동 가이드 따라)
- [ ] Supabase → Auth → URL Configuration → Site URL을 `https://noai.app`로 교체
- [ ] Supabase → Auth → Redirect URLs에 `https://noai.app/**` 추가
- [ ] Google Cloud Console → OAuth Client → Authorized origins/redirects에 `noai.app` 추가

### SightEngine (선택, 추천)
- [ ] https://sightengine.com 가입
- [ ] Starter $99/월 (월 5만 호출)
- [ ] API user + secret 발급
- [ ] Vercel env에 `SIGHTENGINE_API_USER` + `SIGHTENGINE_API_SECRET` 추가
- [ ] 재배포 → AI 이미지 탐지 자동 활성화

### 시드 베타 (D-3 ~ D-1)
- [ ] 시드 50명 리스트 (사진작가 30 + 카피라이터 10 + X 디자인 인플루언서 10)
- [ ] 본인 이메일로 1차 가입 + 첫 게시물 (✓ 직촬 동작 확인)
- [ ] 시드 50명에게 초대 메시지 (공개 URL + "AI 봇 가입 차단" 한 줄)
- [ ] 24시간 내 첫 게시물 5개 이상 확보

## 🎯 D-Day (출시일)

### 자정 KST (00:00)
- [ ] **Product Hunt** 등록 (제목: "NOai — A social network where AI is banned")
- [ ] **Hacker News** Show HN 글 (제목: "Show HN: NOai – Made by Human Only")
- [ ] **X(Twitter)** 비포애프터 영상 (인스타 vs NOai, 30초)

### 한국 12시 (정오)
- [ ] **DC 사진갤·카메라갤** 텍스트 게시 (URL + 썸네일)
- [ ] **클리앙·뽐뿌** 잡담 게시판
- [ ] 주요 디자이너 X 계정에 DM (10명)

### 모니터링
- [ ] Vercel Analytics + Speed Insights 활성화
- [ ] Supabase Logs (Auth 실패 / RLS 위반)
- [ ] Sentry 셋업 (선택)
- [ ] DAU 카운터 — 100 / 500 / 1000

## 📊 KPI (첫 4주)

| 지표 | 목표 |
|---|---|
| 가입 | 5,000 |
| DAU | 800 |
| 첫 글 작성률 | 60% |
| D7 리텐션 | 25% |
| AI 의심 신고 / 게시물 | < 5% |

## 🔄 v1 (4주 후)

- [ ] 네이티브 iOS/Android 앱 (PWA → React Native)
- [ ] Kakao OAuth (비즈채널 승인 후)
- [ ] 24시간 스토리
- [ ] DM
- [ ] 좋아요 → "묵례" 다양화 (감탄/공감/배움)
- [ ] AI 유사 이미지 자동 검색 (원작 미표기 자동 감지)

## ⚠️ 위기관리

| 상황 | 대응 |
|---|---|
| AI 봇 대량 가입 | Google OAuth + 매직링크만 허용, IP rate limit |
| 가짜 신고 폭탄 | 신고자도 strike 누적 |
| 서비스 다운 | Vercel 자동 rollback (이전 commit) |
| Supabase 쿼터 초과 | Pro $25 즉시 업그레이드 |
| 법적 분쟁 (원작 표기 누락) | 게시물 삭제 + 신고자/원작자 협의 |
