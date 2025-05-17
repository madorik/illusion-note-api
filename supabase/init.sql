-- Supabase 테이블 생성 SQL
-- Supabase Studio에서 SQL 편집기에 붙여넣어 실행하세요

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- users 테이블 생성 (Google 로그인용)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    picture TEXT,
    provider TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- 감정 분석 결과 테이블
CREATE TABLE IF NOT EXISTS emotion_analysis (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  text TEXT NOT NULL,
  emotion TEXT NOT NULL,
  response TEXT NOT NULL,
  analyze_text TEXT,
  summary TEXT,
  title TEXT,
  response_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- anonymous 사용자를 위한 특별 계정 생성
INSERT INTO users (id, name, email, provider, provider_id)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'Anonymous', 'anonymous@example.com', 'system', 'anonymous')
ON CONFLICT (email) DO NOTHING;

-- 색인 생성
CREATE INDEX IF NOT EXISTS emotion_analysis_user_id_idx ON emotion_analysis (user_id);
CREATE INDEX IF NOT EXISTS emotion_analysis_created_at_idx ON emotion_analysis (created_at);
CREATE INDEX IF NOT EXISTS emotion_analysis_emotion_idx ON emotion_analysis (emotion);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_provider_id_idx ON users(provider_id);

-- RLS(Row Level Security) 설정
ALTER TABLE emotion_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 자신의 데이터만 볼 수 있도록 정책 설정
CREATE POLICY "사용자는 자신의 감정 분석 데이터만 볼 수 있음" ON emotion_analysis
  FOR SELECT USING (auth.uid()::uuid = user_id);

-- 모든 사용자가 자신의 데이터만 생성할 수 있도록 정책 설정
CREATE POLICY "사용자는 자신의 감정 분석 데이터만 생성할 수 있음" ON emotion_analysis
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

-- anonymous 사용자 허용 정책 (서버 사이드 API용)
CREATE POLICY "서버 API는 익명 사용자 데이터를 조작할 수 있음" ON emotion_analysis
  USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid OR auth.role() = 'service_role')
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid OR auth.role() = 'service_role');

-- 정책 생성
CREATE POLICY users_policy ON users
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY emotion_analysis_policy ON emotion_analysis
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 기본 조회 권한 생성
GRANT SELECT ON emotion_analysis TO anon, authenticated, service_role;
GRANT INSERT ON emotion_analysis TO anon, authenticated, service_role;
GRANT USAGE ON SEQUENCE emotion_analysis_id_seq TO anon, authenticated, service_role;
GRANT SELECT ON users TO anon, authenticated, service_role;
GRANT INSERT ON users TO anon, authenticated, service_role; 