// Express 기반 Vercel Serverless API
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const OpenAIService = require('./openai-service');
const emotionStorageService = require('./emotion-storage-service');
const supabase = require('./supabase-client');
const path = require('path');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const authRoutes = require('./auth-routes');
const tokenAuthRoutes = require('./token-auth-routes');
const authService = require('./auth-service');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger-config');

// Initialize Express
const app = express();
// Initialize OpenAIService
const openaiService = new OpenAIService();

// 서버 도메인 설정
const SERVER_DOMAIN = process.env.SERVER_DOMAIN || `http://localhost:${process.env.PORT || 3001}`;

// CORS 및 쿠키 도메인 설정
const CORS_ORIGIN = process.env.CORS_ORIGIN || true; // true로 설정하면 모든 도메인 허용
console.log('CORS 설정:', CORS_ORIGIN);

// CORS 설정
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET || 'illusion-note-cookie-secret'));

// 쿠키 디버깅 미들웨어
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('- 쿠키:', req.cookies);
  console.log('- 헤더:', req.headers.authorization ? '인증 헤더 있음' : '인증 헤더 없음');
  
  // 쿠키 설정 감지
  const originalSetCookie = res.setHeader;
  res.setHeader = function(name, value) {
    if (name === 'Set-Cookie') {
      console.log('쿠키 설정:', value);
    }
    return originalSetCookie.apply(this, arguments);
  };
  
  next();
});

// 세션 설정
app.use(session({
  secret: process.env.SESSION_SECRET || 'illusion-note-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24시간
  }
}));

// 세션 디버깅 미들웨어
app.use((req, res, next) => {
  const oldEnd = res.end;
  res.end = function() {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - 세션ID: ${req.session?.id || 'None'}`);
    return oldEnd.apply(this, arguments);
  };
  next();
});

// Passport 초기화
console.log('Passport 초기화...');
app.use(passport.initialize());
app.use(passport.session());
console.log('Passport 초기화 완료');

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, '../public')));

// Swagger API 문서 설정 (Vercel 호환)
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customSiteTitle: 'Illusion Note API Documentation',
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .scheme-container { background: #fafafa; padding: 10px; }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    tryItOutEnabled: true
  }
}));

// 인증 라우트 등록
app.use('/api/auth', authRoutes);
app.use('/api/token-auth', tokenAuthRoutes);

// 기본 루트 엔드포인트
app.get('/', (req, res) => {
  res.json({ 
    message: 'Illusion Note API - Welcome!',
    domain: SERVER_DOMAIN,
    endpoints: {
      '/': 'API 정보 (GET)',
      '/health': '상태 확인 (GET)',
      '/api/auth/google': 'Google 로그인 (GET)',
      '/api/auth/status': '로그인 상태 확인 (GET)',
      '/api/auth/logout': '로그아웃 (GET)',
      '/api/token-auth/google-login': 'Google ID 토큰 로그인 (POST)',
      '/api/token-auth/refresh': '토큰 갱신 (POST)',
      '/api/token-auth/logout': '토큰 기반 로그아웃 (POST)',
      '/api/token-auth/me': '사용자 정보 조회 (GET)',
      '/api/token-auth/protected': '보호된 리소스 예시 (GET)',
      '/api/profile': '사용자 프로필 정보 (GET)',
      '/api/emotion/openai': '감정 분석 API - 자동 감정 분석 지원 (POST)',
      '/api/emotion/by-date': '날짜별 감정 분석 기록 조회 (GET)',
      '/api/emotion/monthly-stats': '월별 감정 통계 조회 (GET)',
      '/api/emotion/recent': '사용자 최근 작성글 조회 (GET)'
    },
    docs: {
      '/api-docs': 'Swagger API 문서 (Interactive)',
      '/emotion-analyzer-test.html': '감정 분석 테스트 페이지',
      '/token-auth-test.html': '토큰 인증 테스트 페이지'
    }
  });
});

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: API 상태 확인
 *     description: API 서버의 상태를 확인합니다.
 *     responses:
 *       200:
 *         description: 서버 정상 상태
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 domain:
 *                   type: string
 *                   example: "http://localhost:3001"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-01T12:00:00.000Z"
 */
// 상태 체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    domain: SERVER_DOMAIN,
    timestamp: new Date().toISOString()
  });
});

// 프로필 정보 조회 엔드포인트 
app.get('/api/profile', authService.verifyToken, async (req, res) => {
  try {
    console.log(`프로필 정보 요청: 사용자ID=${req.user.id}`);
    
    // Supabase에서 최신 사용자 정보 조회
    const userData = await authService.getUserById(req.user.id);
    
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 민감한 정보 제외하고 반환
    const profile = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      picture: userData.picture,
      provider: userData.provider,
      created_at: userData.created_at,
      last_login: userData.last_login
    };
    
    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('프로필 정보 조회 오류:', error);
    res.status(500).json({ error: '프로필 정보를 가져오는 중 오류가 발생했습니다.' });
  }
});

// OpenAI 감정 분석 엔드포인트 - OpenAIService 사용
app.post('/api/emotion/openai', authService.requireLogin, async (req, res) => {
  try {
    const { text, mood_id = '', mode = 'chat', response_type = 'comfort', context = '' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // 인증된 사용자 ID 사용 (익명 사용자는 이 지점에 도달할 수 없음)
    const userId = req.user.id;
    console.log(`인증된 사용자의 감정 분석 요청: ${req.user.name} (ID: ${userId})`);

    console.log(`감정 분석 요청: mood_id=${mood_id || '자동 감정 분석'}, response_type=${response_type}`);

    // OpenAIService를 사용한 응답 생성
    const result = await openaiService.generateResponse(
      text,
      response_type
    );
    
    // 만약 title이 없는 경우 OpenAI API를 사용하여 생성
    if (!result.title) {
      try {
        const titlePrompt = `사용자가 입력한 다음 텍스트를 바탕으로 15자 이내의 간결하고 의미있는 제목을 생성해주세요. 제목만 응답해주세요:\n\n${text}`;
        
        const titleResponse = await openaiService.client.chat.completions.create({
          model: openaiService.model,
          messages: [
            { 
              role: "system", 
              content: "당신은 텍스트를 읽고 15자 이내의 간결한 제목을 생성하는 전문가입니다. 제목만 응답해주세요." 
            },
            { role: "user", content: titlePrompt }
          ],
          temperature: 0.7,
          max_tokens: 50
        });
        
        result.title = titleResponse.choices[0].message.content.trim();
      } catch (titleError) {
        console.error('제목 생성 중 오류:', titleError);
        result.title = '제목 없음';
      }
    }
    
    // 결과를 Supabase에 저장
    try {
      // 데이터 유효성 검사 - 모든 필수 필드가 있는지 확인
      if (!result.emotion) result.emotion = '알 수 없음';
      if (!result.response) result.response = '응답 없음';
      
      const storageData = {
        userId,
        text,
        emotion: result.emotion,
        response: result.response,
        analyze_text: result.analyze_text || null,
        summary: result.summary || null,
        title: result.title || null,
        responseType: response_type,
        metadata: {
          mode,
          context: context || undefined
        }
      };
      
      console.log('감정 분석 결과 저장 시작:', JSON.stringify({
        userId,
        textLength: text.length,
        emotion: result.emotion,
        title: result.title
      }));
      
      // 비동기적으로 저장 (응답을 기다리지 않음)
      emotionStorageService.saveEmotionAnalysis(storageData)
        .then(savedData => {
          if (savedData) {
            console.log(`감정 분석 결과 저장 완료: ID=${savedData.id}, 제목=${result.title}`);
          } else {
            console.log('감정 분석 결과 저장 실패: 저장된 데이터가 없음');
          }
        })
        .catch(err => {
          console.error('결과 저장 중 오류 발생:', err);
        });
    } catch (storageError) {
      // 저장 실패해도 API 응답은 정상적으로 반환
      console.error('Supabase 저장 오류:', storageError);
    }
    
    // 응답 반환
    return res.json(result);
  } catch (error) {
    console.error('OpenAI 감정 분석 오류:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 날짜별 감정 분석 기록 조회 엔드포인트
app.get('/api/emotion/by-date', authService.requireLogin, async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;
    
    // 날짜 파라미터 검증
    if (!startDate && !endDate) {
      console.log('날짜 파라미터 누락');
      return res.status(400).json({ 
        error: 'At least one date parameter (startDate or endDate) is required' 
      });
    }
    
    // 인증된 사용자 ID 사용
    const userId = req.user.id;
    console.log(`인증된 사용자의 날짜별 조회 요청: ${req.user.name} (ID: ${userId})`);
    
    console.log(`날짜별 감정 분석 기록 조회 요청: 사용자=${userId}, 시작일=${startDate}, 종료일=${endDate}, 제한=${limit}`);
    
    // 감정 분석 기록 조회
    const data = await emotionStorageService.getEmotionAnalysisByDate(
      userId,
      startDate,
      endDate,
      { limit: parseInt(limit, 10) }
    );
    
    // 통계 데이터 계산
    const emotionCounts = {};
    data.forEach(item => {
      const emotion = item.emotion || '알 수 없음';
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });
    
    // 응답 구성
    return res.json({
      total: data.length,
      statistics: {
        emotionCounts
      },
      data
    });
  } catch (error) {
    console.error('날짜별 감정 분석 기록 조회 오류:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 월별 감정 통계 조회 엔드포인트
app.get('/api/emotion/monthly-stats', authService.requireLogin, async (req, res) => {
  try {
    const { year, yearMonth } = req.query;
    
    // yearMonth와 year 파라미터 검증
    if (yearMonth && year) {
      return res.status(400).json({ 
        error: 'Cannot use both yearMonth and year parameters together. Please use only one.' 
      });
    }
    
    // 인증된 사용자 ID 사용
    const userId = req.user.id;
    console.log(`인증된 사용자의 월별 통계 요청: ${req.user.name} (ID: ${userId})`);
    
    // yearMonth 파라미터 검증 (YYYY-MM 형식)
    if (yearMonth) {
      const yearMonthRegex = /^\d{4}-(?:0[1-9]|1[0-2])$/;
      if (!yearMonthRegex.test(yearMonth)) {
        return res.status(400).json({ 
          error: 'Invalid yearMonth parameter. Format must be YYYY-MM (e.g. 2023-12)' 
        });
      }
      
      console.log(`특정 년월 감정 통계 요청: 사용자=${userId}, 년월=${yearMonth}`);
      
      // 특정 년월에 대한 감정 통계 조회
      const monthlyStats = await emotionStorageService.getMonthlyEmotionStats(userId, yearMonth);
      
      // 응답 구성
      return res.json({
        userId,
        yearMonth,
        stats: monthlyStats
      });
    }
    // 연도 파라미터 처리 (있으면 숫자로 변환)
    else if (year) {
      const yearParam = parseInt(year, 10);
      
      // 유효한 연도인지 확인
      if (isNaN(yearParam) || yearParam < 2000 || yearParam > 2100) {
        return res.status(400).json({ 
          error: 'Invalid year parameter (must be between 2000-2100)' 
        });
      }
      
      console.log(`연도별 월간 감정 통계 요청: 사용자=${userId}, 연도=${yearParam}`);
      
      // 특정 연도의 월별 감정 통계 조회
      const monthlyStats = await emotionStorageService.getMonthlyEmotionStats(userId, null, yearParam);
      
      // 응답 구성
      return res.json({
        userId,
        year: yearParam,
        totalMonths: monthlyStats.length,
        stats: monthlyStats
      });
    }
    // 아무 파라미터도 없는 경우 전체 기간 조회
    else {
      console.log(`전체 기간 월별 감정 통계 요청: 사용자=${userId}`);
      
      // 전체 기간 월별 감정 통계 조회
      const monthlyStats = await emotionStorageService.getMonthlyEmotionStats(userId);
      
      // 응답 구성
      return res.json({
        userId,
        totalMonths: monthlyStats.length,
        stats: monthlyStats
      });
    }
  } catch (error) {
    console.error('월별 감정 통계 조회 오류:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 사용자 최근 작성글 조회 엔드포인트
app.get('/api/emotion/recent', authService.requireLogin, async (req, res) => {
  try {
    const { count = 5 } = req.query;
    
    // count 파라미터 유효성 검사
    const countNum = parseInt(count, 10);
    if (isNaN(countNum) || countNum < 1) {
      return res.status(400).json({ 
        error: 'Invalid count parameter. Must be a positive number.' 
      });
    }
    
    // 인증된 사용자 ID 사용
    const userId = req.user.id;
    console.log(`인증된 사용자의 최근 작성글 요청: ${req.user.name} (ID: ${userId})`);
    
    console.log(`사용자 최근 작성글 요청: 사용자=${userId}, 개수=${countNum}`);
    
    // 최근 작성글 조회
    const recentPosts = await emotionStorageService.getRecentEmotionAnalysis(
      userId,
      countNum
    );
    
    // 응답 구성
    return res.json({
      userId,
      count: recentPosts.length,
      posts: recentPosts
    });
  } catch (error) {
    console.error('최근 작성글 조회 오류:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = app; 