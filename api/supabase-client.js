/**
 * Supabase 클라이언트 초기화
 */
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// 환경 변수 로드 시도
try {
  dotenv.config();
} catch (e) {
  console.log(`환경 변수 로드 중 오류 발생 (무시): ${e}`);
}

// Supabase URL과 API 키 가져오기
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// 유효한 설정 체크
if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase URL 또는 API 키가 설정되지 않았습니다.');
}

// 설정 로깅 (민감 정보 마스킹)
console.log(`Supabase 설정: URL=${supabaseUrl ? '설정됨' : '설정되지 않음'}, API 키=${supabaseKey ? '설정됨' : '설정되지 않음'}`);

// Supabase 클라이언트 생성
let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase 클라이언트 생성 성공');
} catch (error) {
  console.error('Supabase 클라이언트 생성 오류:', error);
  // 클라이언트 생성 실패 시 더미 클라이언트 생성 (앱 실행은 유지)
  supabase = {
    from: () => ({
      select: () => ({ data: null, error: new Error('Supabase 클라이언트 초기화 실패') }),
      insert: () => ({ data: null, error: new Error('Supabase 클라이언트 초기화 실패') }),
      update: () => ({ data: null, error: new Error('Supabase 클라이언트 초기화 실패') }),
      delete: () => ({ data: null, error: new Error('Supabase 클라이언트 초기화 실패') }),
      eq: () => ({ data: null, error: new Error('Supabase 클라이언트 초기화 실패') }),
      range: () => ({ data: null, error: new Error('Supabase 클라이언트 초기화 실패') }),
      single: () => ({ data: null, error: new Error('Supabase 클라이언트 초기화 실패') }),
      order: () => ({ data: null, error: new Error('Supabase 클라이언트 초기화 실패') })
    })
  };
}

module.exports = supabase; 