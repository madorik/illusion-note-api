/**
 * 토큰 기반 인증 라우트
 */
const express = require('express');
const router = express.Router();
const tokenAuthService = require('./token-auth-service');

/**
 * Google ID 토큰으로 로그인
 * POST /api/token-auth/google-login
 * Body: { idToken: string }
 */
router.post('/google-login', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({
      error: 'idToken이 필요합니다'
    });
  }

  try {
    
    console.log('Google ID 토큰 로그인 요청 시작...');
    // 1. Google ID 토큰 검증
    const tokenPayload = await tokenAuthService.verifyGoogleIdToken(idToken);

    // 2. 사용자 정보 확보 & 회원가입/로그인 처리
    const user = await tokenAuthService.handleUserAuthentication(tokenPayload);
    
    // 3. 애플리케이션용 토큰 발급
    const accessToken = tokenAuthService.generateAccessToken(user);
    const refreshToken = await tokenAuthService.generateRefreshToken(user.id);
    
    console.log(`로그인 성공: ${user.name} (${user.email})`);
    
    // 4. 토큰 응답
    res.json({
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: 3600, // 1시간 (초 단위)
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture
      }
    });
    
  } catch (error) {
    console.error('Google 토큰 로그인 실패:', error.message);
    res.status(401).json({
      error: '로그인에 실패했습니다',
      details: error.message
    });
  }
});

/**
 * 리프레시 토큰으로 새 Access Token 발급
 * POST /api/token-auth/refresh
 * Body: { refreshToken: string }
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        error: 'refreshToken이 필요합니다'
      });
    }
    
    console.log('토큰 갱신 요청...');
    
    // 1. 리프레시 토큰 검증
    const user = await tokenAuthService.verifyRefreshToken(refreshToken);
    
    // 2. 새 Access Token 생성
    const newAccessToken = tokenAuthService.generateAccessToken(user);
    
    // 3. 새 리프레시 토큰 생성 (선택적 - 보안 강화)
    const newRefreshToken = await tokenAuthService.generateRefreshToken(user.id);
    
    console.log(`토큰 갱신 완료: ${user.name}`);
    
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600, // 1시간 (초 단위)
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture
      }
    });
    
  } catch (error) {
    console.error('토큰 갱신 실패:', error.message);
    res.status(401).json({
      error: '토큰 갱신에 실패했습니다',
      details: error.message
    });
  }
});

/**
 * 로그아웃 (리프레시 토큰 폐기)
 * POST /api/token-auth/logout
 * Body: { refreshToken: string }
 */
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        error: 'refreshToken이 필요합니다'
      });
    }
    
    console.log('로그아웃 요청...');
    
    // 리프레시 토큰 폐기
    await tokenAuthService.revokeRefreshToken(refreshToken);
    
    console.log('로그아웃 완료');
    
    res.json({
      message: '로그아웃이 완료되었습니다'
    });
    
  } catch (error) {
    console.error('로그아웃 실패:', error.message);
    res.status(500).json({
      error: '로그아웃 처리에 실패했습니다',
      details: error.message
    });
  }
});

/**
 * 모든 세션 로그아웃 (모든 리프레시 토큰 폐기)
 * POST /api/token-auth/logout-all
 * Authorization: Bearer <accessToken>
 */
router.post('/logout-all', tokenAuthService.verifyAccessToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`전체 로그아웃 요청: 사용자 ${userId}`);
    
    // 사용자의 모든 리프레시 토큰 폐기
    await tokenAuthService.revokeAllRefreshTokens(userId);
    
    console.log('전체 로그아웃 완료');
    
    res.json({
      message: '모든 세션에서 로그아웃되었습니다'
    });
    
  } catch (error) {
    console.error('전체 로그아웃 실패:', error.message);
    res.status(500).json({
      error: '전체 로그아웃 처리에 실패했습니다',
      details: error.message
    });
  }
});

/**
 * Access Token 검증 및 사용자 정보 조회
 * GET /api/token-auth/me
 * Authorization: Bearer <accessToken>
 */
router.get('/me', tokenAuthService.verifyAccessToken, (req, res) => {
  try {
    console.log(`사용자 정보 조회: ${req.user.name}`);
    
    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        roles: req.user.roles
      }
    });
    
  } catch (error) {
    console.error('사용자 정보 조회 실패:', error.message);
    res.status(500).json({
      error: '사용자 정보 조회에 실패했습니다'
    });
  }
});

/**
 * 보호된 라우트 예시
 * GET /api/token-auth/protected
 * Authorization: Bearer <accessToken>
 */
router.get('/protected', tokenAuthService.verifyAccessToken, (req, res) => {
  console.log(`보호된 리소스 접근: ${req.user.name} (${req.user.id})`);
  
  res.json({
    message: '인증된 사용자만 접근할 수 있는 보호된 데이터입니다',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

/**
 * 관리자 전용 - 만료된 토큰 정리
 * POST /api/token-auth/cleanup-tokens
 * Authorization: Bearer <accessToken>
 */
router.post('/cleanup-tokens', tokenAuthService.verifyAccessToken, async (req, res) => {
  try {
    // 간단한 권한 체크 (실제로는 더 정교한 권한 시스템 필요)
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({
        error: '관리자 권한이 필요합니다'
      });
    }
    
    console.log(`토큰 정리 요청: 관리자 ${req.user.name}`);
    
    await tokenAuthService.cleanupExpiredTokens();
    
    res.json({
      message: '만료된 토큰 정리가 완료되었습니다'
    });
    
  } catch (error) {
    console.error('토큰 정리 실패:', error.message);
    res.status(500).json({
      error: '토큰 정리에 실패했습니다',
      details: error.message
    });
  }
});

module.exports = router; 