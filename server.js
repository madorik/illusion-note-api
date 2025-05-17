// 로컬 개발 서버 실행 파일
require('dotenv').config();  // 환경 변수 로드
const app = require('./api/index');
const PORT = process.env.PORT || 3001;
const SERVER_DOMAIN = process.env.SERVER_DOMAIN || `http://localhost:${PORT}`;

// OpenAI API 키 확인
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY가 설정되지 않았습니다. 규칙 기반 감정 분석이 사용됩니다.');
} else {
  console.log('✅ OpenAI API 설정 완료');
}

app.listen(PORT, () => {
  console.log(`서버가 ${SERVER_DOMAIN} 에서 실행 중입니다.`);
  console.log(`상태 체크: ${SERVER_DOMAIN}/health`);
  console.log(`감정 분석 API: ${SERVER_DOMAIN}/api/emotion (POST)`);
  console.log(`OpenAI 완성 API: ${SERVER_DOMAIN}/api/openai/completion (POST)`);
}); 