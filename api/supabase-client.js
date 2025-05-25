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

// Supabase 클라이언트 생성 (Vercel 최적화)
let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false, // 서버리스 환경에서는 세션 유지 불필요
      autoRefreshToken: false, // 자동 토큰 갱신 비활성화
    },
    global: {
      fetch: (...args) => {
        // Vercel 환경에서 fetch 타임아웃 설정
        const [url, config = {}] = args;
        const timeoutConfig = {
          ...config,
          signal: AbortSignal.timeout(10000), // 10초 타임아웃
        };
        return fetch(url, timeoutConfig);
      },
    },
  });
  console.log('Supabase 클라이언트 생성 성공 (Vercel 최적화)');
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