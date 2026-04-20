# 담벼락 서비스 개발 TASK (작업 절차)

## 1. 프로젝트 초기화 (Setup)
- [ ] Next.js (App Router) 기반 프로젝트 스캐폴딩 생성
- [ ] 바닐라 CSS 기본 설정 및 글로벌 스타일 (index.css) 정의
- [ ] Supabase Client 연동을 위한 라이브러리 설치 (`@supabase/supabase-js` 등)
- [ ] `.env.local` 환경 변수 세팅

## 2. Supabase 데이터베이스 구축 (DB Schema)
- [ ] Supabase에서 테이블 설정 (SQL)
  - `walls` 테이블 (`id`, `title`, `description`, `created_at`)
  - `postits` 테이블 (`id`, `wall_id`, `nickname`, `content`, `password`, `color`, `created_at`)
- [ ] 익명 사용자가 읽고/쓰기 가능하도록 RLS 임시 설정

## 3. 핵심 UI 컴포넌트 개발 (UI/UX)
- [ ] **메인 페이지 (`/`)**: 서비스 소개 및 새로운 담벼락 생성 폼
- [ ] **담벼락 화면 (`/wall/[id]`)**: 
  - 제목 및 정보 영역
  - 등록된 포스트잇을 보여줄 보드 영역 (Grid/Masonry 디자인)
  - 낙서 남기기 모달 혹은 폼
- [ ] **포스트잇 모달**: 닉네임, 내용, 비밀번호, 배경색 선택 폼
- [ ] **개별 포스트잇 UI 컴포넌트**: 실제 벽에 붙은 포스트잇처럼 감성적이고 부드러운 디자인 (그림자, 기울기 등 활용)

## 4. 로직 및 데이터 연동 (Integration)
- [ ] 담벼락 생성 및 해당 URL(`[id]`)로 라우팅 처리
- [ ] Supabase DB에서 해당 담벼락의 포스트잇 데이터 Fetch
- [ ] 포스트잇 작성 정보를 DB에 Insert
- [ ] 포스트잇 삭제 시 입력된 비밀번호 검증 후 삭제 기능

## 5. 최적화 및 배포 (Deployment)
- [ ] 모바일/웹 반응형 디자인 최종 확인
- [ ] Vercel 배포 및 Production 테스트
