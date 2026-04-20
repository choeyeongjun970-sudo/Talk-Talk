-- 1. 담벼락 (walls) 테이블 생성
CREATE TABLE walls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 포스트잇 (postits) 테이블 생성
CREATE TABLE postits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wall_id UUID NOT NULL REFERENCES walls(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '무제', -- 새로 추가된 제목 컬럼
  nickname TEXT DEFAULT '익명',
  content TEXT NOT NULL,
  password TEXT NOT NULL, -- 나중에 수정/삭제할 때 검증하기 위한 비밀번호
  color TEXT DEFAULT 'yellow', -- yellow, pink, blue, green 등
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Row Level Security (RLS) 설정 제한적 허용
ALTER TABLE walls ENABLE ROW LEVEL SECURITY;
ALTER TABLE postits ENABLE ROW LEVEL SECURITY;

-- walls: 누구나 조회 가능 (SELECT)
CREATE POLICY "Anyone can view walls" ON walls
  FOR SELECT USING (true);

-- walls: 누구나 생성 가능 (INSERT)
CREATE POLICY "Anyone can create walls" ON walls
  FOR INSERT WITH CHECK (true);

-- walls: 누구나 삭제 가능 (DELETE)
CREATE POLICY "Anyone can delete walls" ON walls
  FOR DELETE USING (true);

-- walls: 누구나 수정 가능 (UPDATE)
CREATE POLICY "Anyone can update walls" ON walls
  FOR UPDATE USING (true);

-- postits: 누구나 특정 담벼락의 포스트잇 조회 가능 (SELECT)
CREATE POLICY "Anyone can view postits" ON postits
  FOR SELECT USING (true);

-- postits: 누구나 포스트잇 생성 가능 (INSERT)
CREATE POLICY "Anyone can create postits" ON postits
  FOR INSERT WITH CHECK (true);

-- postits: 누구나 수정/삭제 가능 (UPDATE, DELETE). 실제 비밀번호 검증은 애플리케이션 프론트/백엔드 로직에서 수행합니다.
CREATE POLICY "Anyone can update postits" ON postits
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete postits" ON postits
  FOR DELETE USING (true);

-- 4. Realtime 활성화
-- 모든 접속자가 실시간으로 메모 현황을 볼 수 있도록 postits 테이블에 대해 리얼타임을 켭니다.
-- Supabase SQL Editor에서 이 명령도 실행해 주셔야 합니다.
begin;
  -- remove the supabase_realtime publication
  drop publication if exists supabase_realtime;
  -- re-create it
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table postits;

-- ==========================================
-- 5. [신규 추가] 홈피 암호화 및 기존 데이터 초기화 (선택/필수)
-- ==========================================

-- A. 기존 내용 초기화 (홈피 목록과 메모를 모두 완전 삭제하실 때 실행)
-- TRUNCATE TABLE walls CASCADE;

-- B. 홈피(방) 자체에 들어올 때 필요한 '비밀번호' 필드 추가
-- ALTER TABLE walls ADD COLUMN password TEXT;

-- C. 방장 전용 '홈피 폭파(삭제)' 관리자 비밀번호 필드 추가
-- ALTER TABLE walls ADD COLUMN admin_password TEXT;

-- (선택) 만약 위 오류가 계속 뜬다면 깔끔하게 A 구문으로 싹 다 지운 뒤 아래 명령어를 실행해주세요.
-- ALTER TABLE walls ADD COLUMN password TEXT NULL;
-- ALTER TABLE walls ADD COLUMN admin_password TEXT NULL;
