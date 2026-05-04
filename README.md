# NOai — AI를 쓰지 못하는 SNS

**AI 시대의 인스타그램. 모든 사진과 글은 진짜 사람이 찍고 쓴 것만.**

Production: https://noai.kr

> 3일 빌드. Made by Human Only ✍️

## 핵심 기능

| 기능 | 동작 |
|---|---|
| 사진 게시 | 카메라 직촬 + 갤러리 업로드, EXIF 검증 |
| ✓ 직촬 배지 | EXIF DateTimeOriginal이 게시 시점과 ±10분 이내일 때 자동 표시 |
| AI 이미지 차단 | EXIF 소프트웨어 검사 + SightEngine 픽셀 분석 (옵션) |
| AI 해시태그 차단 | `#ai`, `#midjourney` 등 게시 거부 |
| 키스트로크 인증 | 모든 캡션·댓글의 타이핑 흔적 기록, 재생 가능 |
| 붙여넣기 차단 | 직접 입력만 허용 |
| 원작 추적 | 게시 시 ① 오리지널 / ② 원작자 멘션 / ③ 해외 밈 분류 + 트렌드 페이지 |
| 24시간 스토리 | 촬영 + 짧은 직접 입력 캡션 + 읽음 링 |
| 묵례 🙇 | 인스타 ❤️ 자리 |
| 해시태그 검색 | `/tag/[name]` |
| 신고 시스템 | 4가지 사유 + 3-strike 자동 회색처리 |
| 차단 시스템 | 사용자 차단 + 누적 strike |
| 가입 | Google OAuth + 매직링크 |
| DM + 알림 | 사용자 간 메시지 + 댓글/묵례 통합 알림 |
| 프로필 편집 | 아바타 업로드 + 아이디/소개 수정 |
| 저장됨 | 개인 보관함에 게시물 저장 |
| 진단 | `/debug`에서 Auth/Profile/DB/Storage/SightEngine 라이브 probe |

## 기술 스택

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**
- **Supabase** (Auth + Postgres + Storage + RLS)
- **Tailwind v4** (흑백 + Noto Serif KR)
- **Lucide React** (앱 아이콘)
- **Vercel**
- **SightEngine** (옵션, AI 이미지 탐지)
- **PWA** manifest

## 라우트

```
/                       랜딩
/login                  Google OAuth + 매직링크
/auth/callback          OAuth/매직링크 콜백 (신규 가입자는 /onboarding으로)
/onboarding             username 변경 (가입 직후)

/feed                   팔로잉/탐색 피드 (차단·신고 필터)
/explore                7일 인기 그리드
/create                 3단 wizard (촬영 → 캡션 → 원작)
/stories/create         24시간 스토리 작성
/story/[username]       계정별 스토리 뷰어
/post/[id]              상세 + 진본성 카드 + 키스트로크 재생 + 묵례 + 댓글
/profile/[username]     그리드 + 팔로우/팔로워
/profile/me             본인 username으로 자동 redirect
/settings/profile       프로필 편집 + 아바타 업로드
/saved                  개인 저장 게시물
/tag/[name]             해시태그 검색
/trend/[postId]         원작 vs 카피 랭킹
/notifications          통합 알림
/chat                   DM 목록
/chat/[username]        DM 스레드
/debug                  운영 진단

/legal/terms            이용약관
/legal/privacy          개인정보처리방침
```

## 환경변수 (Vercel)

Vercel-Supabase Integration이 자동 주입:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` → 빌드 시 `NEXT_PUBLIC_SUPABASE_ANON_KEY`로 alias (next.config.ts)
- `SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET`, `POSTGRES_URL` 등

선택:
- `SUPABASE_SERVICE_ROLE_KEY` — 서버 전용 운영 작업. SightEngine 결과 저장은 이 키가 있으면 RLS를 우회해 안정적으로 반영
- `SIGHTENGINE_API_USER` + `SIGHTENGINE_API_SECRET` — AI 이미지 픽셀 분석

## DB 셋업

Supabase SQL Editor에서:
1. `supabase/_full_setup.sql` — 전체 schema + moderation + messages + notifications + stories + avatars + saved posts idempotent 통합 SQL
2. 적용 후 `/debug`에서 13개 테이블과 P2 라이브 시뮬레이션 확인

## 로컬 개발

```bash
npm install
cp .env.local.example .env.local  # 키 박기
npm run dev
```

## 배포

`git push origin main` → Vercel 자동 배포.

## 라이선스

Proprietary. © 2026 NOai.
