/**
 * 인증 관련 라우트
 */
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();
const authService = require('./auth-service');
const { logOAuthDebug, analyzeOAuthError } = require('./oauth-debug');

// 로그인 상태 확인 엔드포인트
router.get('/status', (req, res) => {
  try {
    // 쿠키 또는 Authorization 헤더에서 토큰 확인
    const authHeader = req.headers.authorization;
    const token = req.cookies?.auth_token || (authHeader && authHeader.split(' ')[1]);
    
    if (!token) {
      return res.json({
        authenticated: false,
        message: "Not authenticated"
      });
    }
    
    // 토큰 검증 시도
    try {
      const decoded = jwt.verify(token, authService.getJwtSecret());
      
      // 응답
      return res.json({
        authenticated: true,
        user: {
          id: decoded.id,
          name: decoded.name,
          email: decoded.email
        }
      });
    } catch (tokenError) {
      // 토큰 검증 실패
      console.error('토큰 검증 실패:', tokenError.message);
      
      // 쿠키 삭제
      res.clearCookie('auth_token');
      
      return res.json({
        authenticated: false,
        message: "Invalid token"
      });
    }
  } catch (error) {
    console.error('인증 상태 확인 오류:', error);
    return res.status(500).json({ 
      authenticated: false,
      error: "Server error"
    });
  }
});

// Google 로그인 시작
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

// Google 로그인 콜백
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login.html?error=auth_failed',
    session: false // 세션 사용 대신 JWT 사용
  }),
  (req, res) => {
    try {
      console.log('Google 로그인 성공:', req.user.name);
      
      // JWT 토큰 생성
      const token = authService.generateToken(req.user);
      
      // 디버깅용: 토큰 로그 출력
      console.log('===== 발급된 JWT 토큰 =====');
      console.log(token);
      console.log('==========================');
      
      // 쿠키에 토큰 저장
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24시간
      });
      
      // 성공 페이지로 리디렉션
      const redirectURL = req.query.redirect || '/';
      res.redirect(redirectURL);
    } catch (error) {
      console.error('로그인 처리 중 오류:', error);
      res.redirect('/login.html?error=server_error');
    }
  }
);

// 로그인 실패 엔드포인트
router.get('/login-failed', (req, res) => {
  console.log('로그인 실패 페이지 접근');
  res.status(401).json({ 
    success: false, 
    message: '로그인에 실패했습니다.' 
  });
});

// 로그아웃
router.get('/logout', (req, res) => {
  // 쿠키 삭제
  res.clearCookie('auth_token');
  
  // 로그아웃 후 리디렉션
  const redirectURL = req.query.redirect || '/login.html';
  res.redirect(redirectURL);
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