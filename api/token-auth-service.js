/**
 * Google ID 토큰 검증 및 리프레시 토큰 관리 서비스
 */
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('./supabase-client');

// JWT Secret 키
const JWT_SECRET = process.env.JWT_SECRET || 'illusion-note-jwt-secret-key';
// 토큰 만료 시간
const ACCESS_TOKEN_EXPIRES_IN = '1h';  // 1시간
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7일 (밀리초)

const GOOGLE_CLIENT_IDS = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_ID_ANDROID];

// Google OAuth 클라이언트 초기화 (더 명확한 설정)
const client = new OAuth2Client({
  // Google 공개 키 캐시 비활성화 (테스트용)
  cacheEnabled: false
});

class TokenAuthService {
  constructor() {
    this.tableName = 'users';
    this.refreshTokenTableName = 'refresh_tokens';
    console.log('토큰 인증 서비스 초기화...');
  }

  /**
   * Google ID 토큰 검증
   * @param {string} idToken - Google ID 토큰
   * @returns {Object} 검증된 토큰 페이로드
   */
  async verifyGoogleIdToken(idToken) {
    try {
      console.log('Google ID 토큰 검증 시작...');
      console.log('검증에 사용할 Client IDs:', GOOGLE_CLIENT_IDS);
      
      // 입력 검증
      if (!idToken || typeof idToken !== 'string') {
        throw new Error('유효하지 않은 ID 토큰 형식입니다');
      }
      
      // JWT 구조 검증 (3개 부분으로 나뉘어져 있는지)
      const tokenParts = idToken.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('유효하지 않은 JWT 토큰 구조입니다');
      }
      
      // JWT 헤더 디코딩해서 정보 확인
      try {
        const headerB64 = tokenParts[0];
        const header = JSON.parse(Buffer.from(headerB64, 'base64').toString());
        console.log('JWT 헤더:', header);
        
        // 페이로드도 확인 (디버깅용)
        const payloadB64 = tokenParts[1];
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
        console.log('JWT 페이로드 미리보기 - aud:', payload.aud, 'iss:', payload.iss, 'exp:', new Date(payload.exp * 1000));
        
        // 서명 부분 길이 확인
        const signatureB64 = tokenParts[2];
        console.log('JWT 서명 길이:', signatureB64.length);
        console.log('JWT 서명 첫 20자:', signatureB64.substring(0, 20));
        console.log('JWT 서명 마지막 20자:', signatureB64.substring(signatureB64.length - 20));
        
        // 토큰 전체 길이 확인
        console.log('토큰 전체 길이:', idToken.length);
        console.log('토큰 형식 검증 - 점(.) 개수:', (idToken.match(/\./g) || []).length);
        
      } catch (headerError) {
        console.log('JWT 구조 디코딩 실패:', headerError.message);
        throw new Error('JWT 토큰 구조가 손상되었습니다');
      }
      
      // Client ID 필터링 (undefined 제거)
      const validClientIds = GOOGLE_CLIENT_IDS.filter(id => id && id.trim() !== '');
      console.log('유효한 Client IDs:', validClientIds);
      
      if (validClientIds.length === 0) {
        throw new Error('Google Client ID가 설정되지 않았습니다');
      }
      
      console.log('Google ID 토큰 검증 시도 중...');
      console.log('사용할 audience:', validClientIds);
      
      // 디버깅을 위해 서명 검증 없이 페이로드만 먼저 확인
      let unsafePayload;
      try {
        const payloadB64 = tokenParts[1];
        unsafePayload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
        console.log('서명 검증 전 페이로드 확인:', {
          iss: unsafePayload.iss,
          aud: unsafePayload.aud,
          exp: new Date(unsafePayload.exp * 1000),
          iat: new Date(unsafePayload.iat * 1000),
          email: unsafePayload.email,
          sub: unsafePayload.sub
        });
      } catch (e) {
        console.log('페이로드 사전 검증 실패:', e.message);
      }
      
            let payload;
      let isUnsafeMode = false;
      
      try {
        const ticket = await client.verifyIdToken({
          idToken: idToken,
          audience: validClientIds, // 여러 Client ID 허용
        });
        
        console.log('Google ID 토큰 검증 완료!');
        payload = ticket.getPayload();
        
      } catch (verificationError) {
        console.error('⚠️  서명 검증 실패, unsafePayload 사용 (개발/테스트 전용)');
        console.error('서명 검증 에러:', verificationError.message);
        
        // 개발 환경에서만 unsafePayload 사용 허용
        const allowUnsafeMode = process.env.NODE_ENV !== 'production' || process.env.ALLOW_UNSAFE_TOKEN === 'true';
        
        if (allowUnsafeMode && unsafePayload) {
          console.log('🚨 UNSAFE MODE: 서명 검증 없이 토큰 페이로드 사용');
          console.log('⚠️  이는 보안상 위험하며 프로덕션에서는 사용하면 안됩니다!');
          
          payload = unsafePayload;
          isUnsafeMode = true;
          
          // 기본적인 페이로드 검증은 수행
          if (!payload.email || !payload.name || !payload.sub) {
            throw new Error('토큰 페이로드에 필수 정보가 없습니다');
          }
          
          // 만료 시간 검증
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp < now) {
            const expiredMinutes = Math.round((now - payload.exp) / 60);
            throw new Error(`토큰이 ${expiredMinutes}분 전에 만료되었습니다`);
          }
          
          // issuer 검증
          if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
            throw new Error('유효하지 않은 발행자입니다');
          }
          
          // audience 검증
          if (!validClientIds.includes(payload.aud)) {
            throw new Error('유효하지 않은 대상(audience)입니다');
          }
          
        } else {
          throw verificationError;
        }
      }
      console.log(`Google ID 토큰 검증 ${isUnsafeMode ? '(UNSAFE MODE)' : ''} 성공:`, payload.email);
      console.log('토큰의 audience (aud):', payload.aud);
      console.log('토큰의 발행자 (iss):', payload.iss);
      console.log('토큰의 만료시간 (exp):', new Date(payload.exp * 1000));
      
      if (isUnsafeMode) {
        console.log('🚨 경고: 서명 검증 없이 처리된 토큰입니다!');
      }
      
      // 만료 시간 최종 확인 (unsafe 모드가 아닌 경우만)
      if (!isUnsafeMode) {
        const now = Math.floor(Date.now() / 1000);
        const tokenExpiry = new Date(payload.exp * 1000);
        const currentTime = new Date();
        
        console.log('토큰 만료 확인:');
        console.log('- 현재 시간:', currentTime.toISOString());
        console.log('- 토큰 만료:', tokenExpiry.toISOString());
        console.log('- 만료까지 남은 시간:', Math.round((payload.exp - now) / 60), '분');
        
        if (payload.exp < now) {
          const expiredMinutes = Math.round((now - payload.exp) / 60);
          throw new Error(`토큰이 ${expiredMinutes}분 전에 만료되었습니다. 새로운 토큰을 발급받아 주세요.`);
        }
      }
      
      return payload;
    } catch (error) {
      console.error('Google ID 토큰 검증 실패 상세:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // 더 구체적인 에러 메시지 제공
      if (error.message.includes('Token used too early')) {
        throw new Error('토큰이 아직 유효하지 않습니다 (nbf 클레임)');
      } else if (error.message.includes('Token used too late')) {
        throw new Error('토큰이 만료되었습니다 (exp 클레임)');
      } else if (error.message.includes('Invalid token signature')) {
        throw new Error('토큰 서명이 유효하지 않습니다');
      } else if (error.message.includes('Wrong number of segments')) {
        throw new Error('JWT 토큰 형식이 올바르지 않습니다');
      } else if (error.message.includes('Invalid audience')) {
        throw new Error('토큰의 대상(audience)이 일치하지 않습니다');
      }
      
      throw new Error('토큰 검증에 실패했습니다: ' + error.message);
    }
  }

  /**
   * 사용자 정보 확보 및 회원가입/로그인 처리
   * @param {Object} tokenPayload - 검증된 토큰 페이로드
   * @returns {Object} 사용자 정보
   */
  async handleUserAuthentication(tokenPayload) {
    try {
      const email = tokenPayload.email;
      const name = tokenPayload.name;
      const picture = tokenPayload.picture;
      const sub = tokenPayload.sub; // Google 사용자 ID
      
      console.log(`사용자 인증 처리: ${email}`);
      
      // 기존 사용자 확인
      const { data: existingUser, error: findError } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .single();

      if (findError && findError.code !== 'PGRST116') {
        console.error('사용자 조회 오류:', findError.message);
        throw findError;
      }

      // 기존 사용자가 있으면 로그인 처리
      if (existingUser) {
        // 마지막 로그인 시간 업데이트
        await supabase
          .from(this.tableName)
          .update({ last_login: new Date().toISOString() })
          .eq('id', existingUser.id);
        
        console.log(`기존 사용자 로그인: ${existingUser.name}`);
        return existingUser;
      }

      // 새 사용자 회원가입
      console.log(`새 사용자 회원가입: ${name}`);
      const newUser = {
        name: name,
        email: email,
        picture: picture,
        provider: 'google',
        provider_id: sub,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      };

      const { data: createdUser, error: createError } = await supabase
        .from(this.tableName)
        .insert(newUser)
        .select()
        .single();

      if (createError) {
        console.error('사용자 생성 오류:', createError.message);
        throw createError;
      }

      console.log(`새 사용자 생성 완료: ${createdUser.name}`);
      return createdUser;
    } catch (error) {
      console.error('사용자 인증 처리 실패:', error);
      throw error;
    }
  }

  /**
   * 애플리케이션용 JWT 토큰 생성
   * @param {Object} user - 사용자 정보
   * @returns {string} JWT 토큰
   */
  generateAccessToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: ['user'] // 기본 권한
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
  }

  /**
   * 리프레시 토큰 생성
   * @param {string} userId - 사용자 ID
   * @returns {string} 리프레시 토큰
   */
  async generateRefreshToken(userId) {
    try {
      // 랜덤한 리프레시 토큰 생성
      const token = crypto.randomBytes(64).toString('hex');
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);

      // 기존 활성 리프레시 토큰 비활성화
      await supabase
        .from(this.refreshTokenTableName)
        .update({ is_active: false, revoked_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_active', true);

      // 새 리프레시 토큰 저장
      const { data: refreshTokenData, error } = await supabase
        .from(this.refreshTokenTableName)
        .insert({
          user_id: userId,
          token: token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('리프레시 토큰 저장 실패:', error);
        throw error;
      }

      console.log(`리프레시 토큰 생성 완료: 사용자 ${userId}`);
      return token;
    } catch (error) {
      console.error('리프레시 토큰 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 리프레시 토큰 검증
   * @param {string} refreshToken - 리프레시 토큰
   * @returns {Object} 사용자 정보
   */
  async verifyRefreshToken(refreshToken) {
    try {
      const { data: tokenData, error } = await supabase
        .from(this.refreshTokenTableName)
        .select(`
          *,
          users (*)
        `)
        .eq('token', refreshToken)
        .eq('is_active', true)
        .single();

      if (error || !tokenData) {
        throw new Error('유효하지 않은 리프레시 토큰입니다');
      }

      // 만료 확인
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      
      if (now > expiresAt) {
        // 만료된 토큰 비활성화
        await supabase
          .from(this.refreshTokenTableName)
          .update({ is_active: false, revoked_at: now.toISOString() })
          .eq('id', tokenData.id);
        
        throw new Error('리프레시 토큰이 만료되었습니다');
      }

      return tokenData.users;
    } catch (error) {
      console.error('리프레시 토큰 검증 실패:', error);
      throw error;
    }
  }

  /**
   * JWT 토큰 검증 미들웨어
   */
  verifyAccessToken(req, res, next) {
    try {
      // Authorization 헤더에서 토큰 가져오기
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

      if (!token) {
        return res.status(401).json({ 
          error: 'Access token이 필요합니다',
          code: 'NO_TOKEN'
        });
      }

      // 토큰 검증
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // 요청 객체에 사용자 정보 추가
      req.user = decoded;
      
      console.log(`토큰 검증 성공: ${decoded.name} (${decoded.id})`);
      next();
    } catch (error) {
      console.error('토큰 검증 실패:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Access token이 만료되었습니다',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: '유효하지 않은 Access token입니다',
          code: 'INVALID_TOKEN'
        });
      }
      
      return res.status(401).json({ 
        error: '토큰 검증에 실패했습니다',
        code: 'TOKEN_ERROR'
      });
    }
  }

  /**
   * 리프레시 토큰 폐기
   * @param {string} refreshToken - 폐기할 리프레시 토큰
   */
  async revokeRefreshToken(refreshToken) {
    try {
      const { error } = await supabase
        .from(this.refreshTokenTableName)
        .update({ 
          is_active: false, 
          revoked_at: new Date().toISOString() 
        })
        .eq('token', refreshToken);

      if (error) {
        throw error;
      }

      console.log('리프레시 토큰 폐기 완료');
    } catch (error) {
      console.error('리프레시 토큰 폐기 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자의 모든 리프레시 토큰 폐기
   * @param {string} userId - 사용자 ID
   */
  async revokeAllRefreshTokens(userId) {
    try {
      const { error } = await supabase
        .from(this.refreshTokenTableName)
        .update({ 
          is_active: false, 
          revoked_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      console.log(`사용자 ${userId}의 모든 리프레시 토큰 폐기 완료`);
    } catch (error) {
      console.error('전체 리프레시 토큰 폐기 실패:', error);
      throw error;
    }
  }

  /**
   * 만료된 리프레시 토큰 정리 (정기적으로 실행)
   */
  async cleanupExpiredTokens() {
    try {
      const { error } = await supabase
        .from(this.refreshTokenTableName)
        .update({ 
          is_active: false, 
          revoked_at: new Date().toISOString() 
        })
        .lt('expires_at', new Date().toISOString())
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      console.log('만료된 리프레시 토큰 정리 완료');
    } catch (error) {
      console.error('만료된 토큰 정리 실패:', error);
    }
  }
}

// 인스턴스 생성 및 내보내기
const tokenAuthService = new TokenAuthService();

module.exports = tokenAuthService; 