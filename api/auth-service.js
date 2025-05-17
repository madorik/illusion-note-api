/**
 * 인증 관련 서비스
 */
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const supabase = require('./supabase-client');

// Anonymous 사용자 ID
const ANONYMOUS_USER_ID = '00000000-0000-0000-0000-000000000000';

class AuthService {
  constructor() {
    this.tableName = 'users';
    console.log('인증 서비스 초기화 중...');
    this.setupPassport();
  }

  /**
   * Passport 설정
   */
  setupPassport() {
    console.log('Passport 설정 시작...');
    
    // 환경 변수 로그
    console.log(`Google OAuth 설정 확인:
      - CLIENT_ID 존재: ${!!process.env.GOOGLE_CLIENT_ID}
      - CLIENT_SECRET 존재: ${!!process.env.GOOGLE_CLIENT_SECRET}
      - SERVER_DOMAIN: ${process.env.SERVER_DOMAIN}
      - 콜백 URL: ${process.env.SERVER_DOMAIN}/api/auth/google/callback
    `);
    
    // 사용자 정보를 세션에 저장
    passport.serializeUser((user, done) => {
      console.log(`사용자 세션 직렬화: ID=${user.id}, 이름=${user.name}`);
      done(null, user.id);
    });

    // 세션에서 사용자 정보 조회
    passport.deserializeUser(async (id, done) => {
      console.log(`사용자 세션 역직렬화 요청: ID=${id}`);
      try {
        const { data: user, error } = await supabase
          .from(this.tableName)
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error(`사용자 역직렬화 오류: ${error.message}`);
          throw error;
        }
        
        console.log(`사용자 역직렬화 성공: ${user.name}`);
        done(null, user);
      } catch (error) {
        console.error(`역직렬화 실패: ${error}`);
        done(error, null);
      }
    });

    // Google 전략 설정
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_DOMAIN}/api/auth/google/callback`,
      scope: ['profile', 'email'],
      state: true,  // CSRF 보호를 위한 state 파라미터 활성화
      passReqToCallback: true  // 요청 객체를 콜백에 전달
    }, this.handleGoogleAuth.bind(this)));
    
    console.log('Passport 설정 완료');
  }

  /**
   * Google 인증 콜백 처리
   */
  async handleGoogleAuth(req, accessToken, refreshToken, profile, done) {
    console.log(`\n----- Google 인증 콜백 시작 -----`);
    console.log(`AccessToken 가능 여부: ${!!accessToken}`);
    console.log(`RefreshToken 가능 여부: ${!!refreshToken}`);
    console.log(`요청 세션 ID: ${req.session?.id || 'None'}`);
    
    if (!profile) {
      console.error('프로필 정보 없음 - 인증 실패');
      return done(new Error('프로필 정보를 가져올 수 없습니다.'), null);
    }
    
    console.log(`프로필 정보: ID=${profile.id}, 이름=${profile.displayName}`);
    
    try {
      console.log(`Google 로그인 시도: ${profile.displayName} (${profile.emails[0].value})`);

      // 기존 사용자 확인
      console.log(`기존 사용자 조회 중: ${profile.emails[0].value}`);
      const { data: existingUser, error: findError } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('email', profile.emails[0].value)
        .single();

      if (findError) {
        console.log(`사용자 조회 결과: ${findError.code === 'PGRST116' ? '사용자 없음' : '오류 발생'}`);
        if (findError.code !== 'PGRST116') {
          console.error(`사용자 조회 오류: ${findError.message}`);
          throw findError;
        }
      }

      // 기존 사용자가 있으면 반환
      if (existingUser) {
        // 마지막 로그인 시간 업데이트
        await supabase
          .from(this.tableName)
          .update({ last_login: new Date().toISOString() })
          .eq('id', existingUser.id);
        
        console.log(`기존 사용자 로그인 성공: ${existingUser.name} (ID: ${existingUser.id})`);
        return done(null, existingUser);
      }

      // 새 사용자 생성
      console.log(`새 사용자 생성 중: ${profile.displayName}`);
      const newUser = {
        name: profile.displayName,
        email: profile.emails[0].value,
        picture: profile.photos?.[0]?.value || null,
        provider: 'google',
        provider_id: profile.id,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      };

      // Supabase에 사용자 추가
      console.log(`Supabase에 사용자 저장 중...`);
      const { data: createdUser, error: createError } = await supabase
        .from(this.tableName)
        .insert(newUser)
        .select()
        .single();

      if (createError) {
        console.error(`사용자 생성 오류: ${createError.message}`);
        throw createError;
      }

      console.log(`새 사용자 생성 완료: ${createdUser.name} (ID: ${createdUser.id})`);
      console.log(`----- Google 인증 콜백 완료 -----\n`);
      return done(null, createdUser);
    } catch (error) {
      console.error('Google 인증 처리 중 오류:', error);
      console.error(error.stack);
      console.log(`----- Google 인증 콜백 실패 -----\n`);
      return done(error, null);
    }
  }

  /**
   * 사용자 인증 상태 확인용 미들웨어
   */
  ensureAuthenticated(req, res, next) {
    console.log(`인증 확인: ${req.isAuthenticated() ? '인증됨' : '인증되지 않음'}, 사용자=${req.user?.name || 'None'}`);
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
  }
  
  /**
   * 익명 사용자 ID 조회
   */
  getAnonymousUserId() {
    return ANONYMOUS_USER_ID;
  }
}

module.exports = new AuthService(); 