# 🔐 Illusion Note API 인증 가이드

## 개요

Illusion Note API는 두 가지 인증 방식을 지원합니다:

1. **기존 OAuth 세션 기반 인증** (`/api/auth/*`)
2. **새로운 토큰 기반 인증** (`/api/token-auth/*`) ⭐ **권장**

## 🆕 토큰 기반 인증 (권장)

### 특징

- ✅ Google ID 토큰 서버 측 검증
- ✅ JWT Access Token + Refresh Token 시스템
- ✅ 강화된 보안 (토큰 만료, 폐기 관리)
- ✅ 모바일 앱 친화적
- ✅ 무상태(Stateless) 인증

### 인증 플로우

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Google
    participant DB

    Client->>Google: Google 로그인
    Google->>Client: ID Token
    Client->>API: POST /api/token-auth/google-login {idToken}
    API->>Google: ID Token 검증
    Google->>API: 검증 성공
    API->>DB: 사용자 정보 저장/업데이트
    API->>DB: Refresh Token 저장
    API->>Client: {accessToken, refreshToken, user}
    
    Note over Client: Access Token으로 API 호출
    Client->>API: GET /api/protected (Bearer Token)
    API->>API: JWT 검증
    API->>Client: 보호된 데이터
    
    Note over Client: 토큰 만료 시 갱신
    Client->>API: POST /api/token-auth/refresh {refreshToken}
    API->>DB: Refresh Token 검증
    API->>Client: {accessToken, refreshToken}
```

## 🔑 API 엔드포인트

### 1. Google ID 토큰 로그인

```http
POST /api/token-auth/google-login
Content-Type: application/json

{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**응답:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "abc123def456...",
  "expiresIn": 3600,
  "user": {
    "id": "uuid",
    "name": "홍길동",
    "email": "hong@example.com",
    "picture": "https://..."
  }
}
```

### 2. 토큰 갱신

```http
POST /api/token-auth/refresh
Content-Type: application/json

{
  "refreshToken": "abc123def456..."
}
```

### 3. 사용자 정보 조회

```http
GET /api/token-auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. 보호된 리소스 접근

```http
GET /api/token-auth/protected
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. 로그아웃

```http
POST /api/token-auth/logout
Content-Type: application/json

{
  "refreshToken": "abc123def456..."
}
```

### 6. 모든 세션 로그아웃

```http
POST /api/token-auth/logout-all
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🛠️ 클라이언트 구현 예시

### JavaScript/TypeScript

```javascript
class AuthService {
  constructor() {
    this.baseURL = 'https://your-api-domain.com';
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  // Google ID 토큰으로 로그인
  async loginWithGoogleToken(idToken) {
    const response = await fetch(`${this.baseURL}/api/token-auth/google-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    if (response.ok) {
      const data = await response.json();
      this.setTokens(data.accessToken, data.refreshToken);
      return data;
    }
    throw new Error('로그인 실패');
  }

  // 토큰 저장
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  // API 호출 (자동 토큰 갱신 포함)
  async apiCall(url, options = {}) {
    let response = await this.fetchWithAuth(url, options);
    
    // 토큰 만료 시 갱신 후 재시도
    if (response.status === 401) {
      await this.refreshAccessToken();
      response = await this.fetchWithAuth(url, options);
    }
    
    return response;
  }

  // 인증 헤더 포함 fetch
  async fetchWithAuth(url, options) {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
  }

  // 토큰 갱신
  async refreshAccessToken() {
    const response = await fetch(`${this.baseURL}/api/token-auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    if (response.ok) {
      const data = await response.json();
      this.setTokens(data.accessToken, data.refreshToken);
    } else {
      this.logout();
      throw new Error('토큰 갱신 실패');
    }
  }

  // 로그아웃
  async logout() {
    try {
      await fetch(`${this.baseURL}/api/token-auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });
    } finally {
      this.clearTokens();
    }
  }

  // 토큰 초기화
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}
```

### Flutter/Dart

```dart
class AuthService {
  static const String baseURL = 'https://your-api-domain.com';
  String? _accessToken;
  String? _refreshToken;

  // Google ID 토큰으로 로그인
  Future<Map<String, dynamic>> loginWithGoogleToken(String idToken) async {
    final response = await http.post(
      Uri.parse('$baseURL/api/token-auth/google-login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'idToken': idToken}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      await _setTokens(data['accessToken'], data['refreshToken']);
      return data;
    }
    throw Exception('로그인 실패');
  }

  // 인증된 API 호출
  Future<http.Response> authenticatedRequest(
    String url, {
    String method = 'GET',
    Map<String, dynamic>? body,
  }) async {
    var response = await _makeRequest(url, method: method, body: body);
    
    // 토큰 만료 시 갱신 후 재시도
    if (response.statusCode == 401) {
      await refreshAccessToken();
      response = await _makeRequest(url, method: method, body: body);
    }
    
    return response;
  }

  Future<http.Response> _makeRequest(
    String url, {
    String method = 'GET',
    Map<String, dynamic>? body,
  }) async {
    final headers = {
      'Authorization': 'Bearer $_accessToken',
      'Content-Type': 'application/json',
    };

    switch (method.toUpperCase()) {
      case 'POST':
        return http.post(
          Uri.parse(url),
          headers: headers,
          body: body != null ? jsonEncode(body) : null,
        );
      case 'GET':
      default:
        return http.get(Uri.parse(url), headers: headers);
    }
  }

  // 토큰 갱신
  Future<void> refreshAccessToken() async {
    final response = await http.post(
      Uri.parse('$baseURL/api/token-auth/refresh'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': _refreshToken}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      await _setTokens(data['accessToken'], data['refreshToken']);
    } else {
      await logout();
      throw Exception('토큰 갱신 실패');
    }
  }

  // 토큰 저장
  Future<void> _setTokens(String accessToken, String refreshToken) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('accessToken', accessToken);
    await prefs.setString('refreshToken', refreshToken);
  }
}
```

## 🔒 보안 고려사항

### ID 토큰 검증

서버에서 다음 사항을 검증합니다:

1. **서명 검증**: Google의 공개 키로 JWT 서명 확인
2. **만료 시간 (exp)**: 토큰이 만료되지 않았는지 확인
3. **발행자 (iss)**: `accounts.google.com` 또는 `https://accounts.google.com`
4. **대상 (aud)**: 설정된 Google Client ID와 일치하는지 확인

### 토큰 관리

- **Access Token**: 1시간 만료, JWT 형태
- **Refresh Token**: 7일 만료, 랜덤 문자열, DB에서 관리
- **토큰 순환**: 리프레시 시 새로운 Refresh Token 발급 (보안 강화)
- **자동 정리**: 만료된 토큰 자동 정리 (1시간마다)

### 환경 변수 설정

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id

# JWT
JWT_SECRET=your_secure_jwt_secret_key

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🧪 테스트

### 웹 브라우저 테스트

1. 서버 실행: `npm start`
2. 브라우저에서 접속: `http://localhost:3001/token-auth-test.html`
3. Google 로그인 후 각 기능 테스트

### API 테스트 (curl)

```bash
# 1. Google ID 토큰으로 로그인 (ID 토큰은 실제 값으로 교체)
curl -X POST http://localhost:3001/api/token-auth/google-login \
  -H "Content-Type: application/json" \
  -d '{"idToken":"실제_구글_ID_토큰"}'

# 2. Access Token으로 사용자 정보 조회
curl -X GET http://localhost:3001/api/token-auth/me \
  -H "Authorization: Bearer 받은_액세스_토큰"

# 3. 토큰 갱신
curl -X POST http://localhost:3001/api/token-auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"받은_리프레시_토큰"}'
```

## 📋 데이터베이스 스키마

### refresh_tokens 테이블

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🔧 유지보수

### 토큰 정리 스케줄러

서버 시작 시 자동으로 만료된 토큰을 정리하는 스케줄러가 시작됩니다:

- **주기**: 1시간마다
- **작업**: 만료된 리프레시 토큰 비활성화
- **로그**: 콘솔에 정리 작업 로그 출력

### 모니터링

- 토큰 발급/갱신/폐기 로그 확인
- 데이터베이스 리프레시 토큰 테이블 모니터링
- 만료된 토큰 정리 작업 로그 확인

## ⚠️ 주의사항

1. **Google Client ID 설정**: `token-auth-test.html`에서 실제 Google Client ID로 교체 필요
2. **HTTPS 필수**: 프로덕션 환경에서는 반드시 HTTPS 사용
3. **환경 변수 보안**: JWT_SECRET 등 민감한 정보는 안전하게 관리
4. **토큰 저장**: 클라이언트에서 토큰을 안전하게 저장 (HttpOnly 쿠키 권장)

## 🔄 기존 인증 시스템과의 차이점

| 기능 | 기존 OAuth 세션 | 새로운 토큰 기반 |
|------|----------------|------------------|
| 인증 방식 | 세션 쿠키 | JWT + Refresh Token |
| 상태 관리 | 상태 유지 (Stateful) | 무상태 (Stateless) |
| 모바일 지원 | 제한적 | 완전 지원 |
| 보안 | 기본 | 강화 (토큰 순환) |
| 확장성 | 제한적 | 우수 |
| 구현 복잡도 | 단순 | 중간 | 