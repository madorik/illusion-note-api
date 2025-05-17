/**
 * 인증 관련 라우트
 */
const express = require('express');
const passport = require('passport');
const authService = require('./auth-service');
const { logOAuthDebug, analyzeOAuthError } = require('./oauth-debug');

const router = express.Router();

// 로그인 상태 확인 엔드포인트
router.get('/status', (req, res) => {
  console.log(`로그인 상태 확인: ${req.isAuthenticated() ? '인증됨' : '인증되지 않음'}`);
  console.log(`세션 ID: ${req.session?.id || 'None'}`);
  console.log(`세션 데이터:`, req.session);
  
  if (req.isAuthenticated()) {
    console.log(`인증된 사용자: ${req.user.name} (ID: ${req.user.id})`);
    res.json({
      isAuthenticated: true,
      user: req.user
    });
  } else {
    res.json({
      isAuthenticated: false
    });
  }
});

// Google 로그인 시작
router.get('/google', (req, res, next) => {
  console.log('\n----- Google 로그인 시작 -----');
  console.log(`세션 ID: ${req.session?.id || 'None'}`);
  console.log(`세션 데이터:`, req.session);
  
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })(req, res, next);
});

// Google 로그인 콜백
router.get('/google/callback', (req, res, next) => {
  console.log('\n----- Google 콜백 수신 -----');
  console.log(`요청 URL: ${req.originalUrl}`);
  console.log(`쿼리 파라미터:`, req.query);
  console.log(`세션 ID: ${req.session?.id || 'None'}`);
  
  // OAuth 디버깅 정보 로깅
  logOAuthDebug(req);
  
  // 모든 헤더 로깅
  console.log('요청 헤더:');
  Object.keys(req.headers).forEach(key => {
    console.log(`  ${key}: ${req.headers[key]}`);
  });
  
  passport.authenticate('google', {
    failureRedirect: '/login-failed',
    failureMessage: true,
    successReturnToOrRedirect: '/'
  }, (err, user, info) => {
    // OAuth 인증 콜백 결과 처리
    if (err) {
      console.error('Google 인증 오류:', err);
      analyzeOAuthError(err);
      return res.redirect('/login.html?error=' + encodeURIComponent(err.message || 'authentication_error'));
    }
    
    if (!user) {
      console.error('인증은 성공했지만 사용자 정보 없음:', info);
      return res.redirect('/login.html?error=no_user_info');
    }
    
    // 로그인 처리
    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('로그인 세션 생성 오류:', loginErr);
        return res.redirect('/login.html?error=session_error');
      }
      
      console.log(`----- Google 로그인 성공 -----\n`);
      console.log(`인증된 사용자: ${user.name} (ID: ${user.id})`);
      return res.redirect('/');
    });
  })(req, res, next);
});

// 로그인 실패 엔드포인트
router.get('/login-failed', (req, res) => {
  console.error('로그인 실패:');
  console.error('세션 메시지:', req.session?.messages);
  console.error('세션 데이터:', req.session);
  
  res.redirect('/login.html?error=authentication_failed');
});

// 로그아웃
router.get('/logout', (req, res) => {
  console.log(`로그아웃 요청: 사용자=${req.user?.name || 'None'}`);
  req.logout((err) => {
    if (err) {
      console.error('로그아웃 중 오류:', err);
      return res.status(500).json({ error: '로그아웃 중 오류가 발생했습니다.' });
    }
    console.log('로그아웃 성공');
    res.redirect('/');
  });
});

// 보호된 라우트 예시
router.get('/protected', authService.ensureAuthenticated, (req, res) => {
  console.log(`보호된 라우트 접근: 사용자=${req.user.name}`);
  res.json({
    message: '인증된 사용자만 볼 수 있는 보호된 데이터입니다.',
    user: req.user
  });
});

module.exports = router; 