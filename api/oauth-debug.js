/**
 * OAuth 디버깅 유틸리티
 */

// OAuth 디버깅 활성화를 위한 환경 변수 설정
process.env.DEBUG = 'passport:*,oauth2orize';
process.env.NODE_DEBUG = 'oauth,http,https,tls,net';

/**
 * OAuth 디버깅 정보 출력 함수
 */
const logOAuthDebug = (req) => {
  if (!req) return;
  
  console.log('\n===== OAuth 디버깅 정보 =====');
  
  // 기본 요청 정보
  console.log('요청 방법:', req.method);
  console.log('요청 URL:', req.url);
  console.log('쿼리 문자열:', req.query);
  
  // Auth 헤더 정보
  const authHeader = req.headers && req.headers.authorization;
  if (authHeader) {
    console.log('인증 헤더:', authHeader.replace(/Bearer\s+(.{8}).*/, 'Bearer $1...'));
  } else {
    console.log('인증 헤더: 없음');
  }
  
  // 세션 정보
  if (req.session) {
    console.log('세션 ID:', req.session.id);
    console.log('세션 쿠키:', req.headers.cookie);
  }
  
  // OAuth 상태 파라미터
  if (req.query && req.query.state) {
    console.log('OAuth 상태 파라미터:', req.query.state);
  }
  
  // 오류 정보
  if (req.query && req.query.error) {
    console.log('OAuth 오류:', req.query.error);
    console.log('OAuth 오류 설명:', req.query.error_description);
  }
  
  console.log('==============================\n');
};

/**
 * OAuth 오류 분석 함수
 */
const analyzeOAuthError = (error) => {
  if (!error) return '오류 객체가 없습니다.';
  
  console.log('\n===== OAuth 오류 분석 =====');
  console.log('오류 유형:', error.name);
  console.log('오류 메시지:', error.message);
  
  // TokenError 분석
  if (error.name === 'TokenError') {
    console.log('토큰 오류 코드:', error.code);
    console.log('토큰 오류 URI:', error.uri);
    console.log('토큰 오류 상태:', error.status);
    
    // 일반적인 TokenError 원인 분석
    const causes = {
      'invalid_request': 'OAuth 요청 형식이 잘못되었습니다.',
      'invalid_client': 'Client ID 또는 Client Secret이 잘못되었습니다.',
      'invalid_grant': '인증 코드가 만료되었거나 이미 사용되었습니다.',
      'unauthorized_client': '클라이언트가 이 방식의 인증을 사용할 권한이 없습니다.',
      'unsupported_grant_type': '요청된 grant_type이 지원되지 않습니다.',
      'invalid_scope': '요청된 scope가 유효하지 않거나 지원되지 않습니다.'
    };
    
    if (error.code && causes[error.code]) {
      console.log('추정 원인:', causes[error.code]);
    } else {
      console.log('추정 원인: 알 수 없음 - 콜백 URL이 Google Console에 등록된 것과 정확히 일치하는지 확인하세요.');
    }
  }
  
  // 스택 트레이스 (옵션)
  if (error.stack) {
    console.log('스택 트레이스:', error.stack);
  }
  
  console.log('===========================\n');
};

module.exports = {
  logOAuthDebug,
  analyzeOAuthError
}; 