# 🎭 Illusion Note API

감정 분석, Google OAuth 인증, OpenAI 통합을 포함한 노트 서비스를 위한 백엔드 API입니다.

## ✨ 주요 기능

### 🔐 인증 시스템
- **Google OAuth 로그인** (기존 세션 기반)
- **🆕 Google ID 토큰 검증** (JWT + Refresh Token 기반) ⭐ **권장**
- 사용자 세션 관리
- 보호된 API 엔드포인트

### 🧠 감정 분석
- 텍스트 감정 분석 (규칙 기반 + OpenAI)
- 감정별 맞춤 응답 생성
- 분석 결과 데이터베이스 저장
- 날짜별/월별 감정 통계

### 🤖 AI 통합
- OpenAI GPT-4o-mini 통합
- 감정 기반 맞춤 응답
- 자동 제목 생성

### 💾 데이터 관리
- Supabase 데이터베이스 연동
- 사용자별 감정 기록 관리
- 자동 토큰 정리 스케줄러

## 🚀 빠른 시작

### 1. 저장소 클론

```bash
git clone https://github.com/madorik/illusion-note-api.git
cd illusion-note-api
```

### 2. 필요한 패키지 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정합니다:

```env
# 서버 설정
PORT=3001
NODE_ENV=development
SERVER_DOMAIN=http://localhost:3001

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# JWT 토큰
JWT_SECRET=your_secure_jwt_secret_key

# 세션
SESSION_SECRET=your_session_secret
COOKIE_SECRET=your_cookie_secret

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# CORS
CORS_ORIGIN=true
```

### 4. 데이터베이스 설정

Supabase에서 SQL 편집기를 열고 `supabase/init.sql` 파일의 내용을 실행합니다.

### 5. 서버 실행

```bash
npm start
# 또는 개발 모드
npm run dev
```

서버가 시작되면 다음 주소로 접속할 수 있습니다:
- 메인 API: http://localhost:3001
- 상태 확인: http://localhost:3001/health
- 토큰 인증 테스트: http://localhost:3001/token-auth-test.html

## 📚 API 문서

### 🔐 인증 API

#### 새로운 토큰 기반 인증 (권장)
```
POST /api/token-auth/google-login    # Google ID 토큰 로그인
POST /api/token-auth/refresh         # 토큰 갱신
GET  /api/token-auth/me              # 사용자 정보 조회
GET  /api/token-auth/protected       # 보호된 리소스 접근
POST /api/token-auth/logout          # 로그아웃
POST /api/token-auth/logout-all      # 모든 세션 로그아웃
```

#### 기존 세션 기반 인증
```
GET  /api/auth/google                # Google 로그인 시작
GET  /api/auth/google/callback       # Google 로그인 콜백
GET  /api/auth/status                # 로그인 상태 확인
GET  /api/auth/logout                # 로그아웃
GET  /api/auth/protected             # 보호된 라우트 예시
```

### 🧠 감정 분석 API
```
POST /api/emotion/openai             # OpenAI 감정 분석
GET  /api/emotion/by-date            # 날짜별 감정 기록
GET  /api/emotion/monthly-stats      # 월별 감정 통계
GET  /api/emotion/recent             # 최근 작성글 조회
```

### 👤 사용자 API
```
GET  /api/profile                    # 사용자 프로필 조회
```

## 🔒 인증 시스템

### 토큰 기반 인증 (권장)

새로운 토큰 기반 인증 시스템은 다음과 같은 장점을 제공합니다:

- ✅ **강화된 보안**: Google ID 토큰 서버 측 검증
- ✅ **모바일 친화적**: JWT + Refresh Token 구조
- ✅ **무상태**: 세션 의존성 없음
- ✅ **토큰 관리**: 자동 만료 및 갱신

자세한 사용법은 [API_AUTHENTICATION_GUIDE.md](./API_AUTHENTICATION_GUIDE.md)를 참조하세요.

### 인증 흐름

1. 클라이언트에서 Google 로그인
2. Google ID Token 획득
3. 서버로 ID Token 전송
4. 서버에서 토큰 검증
5. JWT Access Token + Refresh Token 발급
6. 이후 API 호출 시 Bearer Token 사용

## 🧪 테스트

### 웹 브라우저 테스트

```bash
npm start
```

브라우저에서 http://localhost:3001/token-auth-test.html 접속

### API 테스트 (curl)

```bash
# Google ID 토큰으로 로그인
curl -X POST http://localhost:3001/api/token-auth/google-login \
  -H "Content-Type: application/json" \
  -d '{"idToken":"your_google_id_token"}'

# 보호된 리소스 접근
curl -X GET http://localhost:3001/api/token-auth/protected \
  -H "Authorization: Bearer your_access_token"
```

## 🚢 Vercel 배포

### 1. Vercel CLI 설치

```bash
npm install -g vercel
```

### 2. 배포

```bash
vercel --prod
```

### 3. 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수들을 설정:

```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
JWT_SECRET
SESSION_SECRET
COOKIE_SECRET
OPENAI_API_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
```

## 📋 데이터베이스 스키마

### users 테이블
- 사용자 기본 정보
- Google OAuth 프로필

### refresh_tokens 테이블
- 리프레시 토큰 관리
- 만료 및 폐기 추적

### emotion_analysis 테이블
- 감정 분석 결과
- 사용자별 감정 기록

전체 스키마는 `supabase/init.sql` 파일을 참조하세요.

## 🔧 개발 환경

- **Runtime**: Node.js 14+
- **Framework**: Express.js
- **Authentication**: Passport.js, JWT
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o-mini
- **Deployment**: Vercel

## 📁 프로젝트 구조

```
illusion-note-api/
├── api/
│   ├── index.js                 # 메인 API 서버
│   ├── auth-routes.js           # 기존 OAuth 라우트
│   ├── token-auth-routes.js     # 새로운 토큰 인증 라우트
│   ├── auth-service.js          # 기존 인증 서비스
│   ├── token-auth-service.js    # 새로운 토큰 인증 서비스
│   ├── token-cleanup-scheduler.js # 토큰 정리 스케줄러
│   ├── emotion-storage-service.js # 감정 분석 저장
│   ├── openai-service.js        # OpenAI 통합
│   └── supabase-client.js       # Supabase 클라이언트
├── public/
│   └── token-auth-test.html     # 토큰 인증 테스트 페이지
├── supabase/
│   └── init.sql                 # 데이터베이스 초기화
├── server.js                    # 로컬 서버 시작
├── package.json
├── vercel.json                  # Vercel 배포 설정
├── README.md
└── API_AUTHENTICATION_GUIDE.md # 인증 상세 가이드
```

## 🔄 변경사항

### v2.0.0 (현재)
- 🆕 Google ID 토큰 검증 시스템 추가
- 🆕 JWT + Refresh Token 인증 구조
- 🆕 자동 토큰 정리 스케줄러
- 🆕 토큰 기반 인증 테스트 페이지
- 📚 상세한 API 문서 추가

### v1.0.0
- Google OAuth 세션 기반 인증
- 감정 분석 API
- OpenAI 통합
- Supabase 데이터베이스 연동

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이센스

This project is licensed under the MIT License.

## 📞 지원

문제가 있거나 질문이 있으시면 GitHub Issues를 사용해 주세요. 