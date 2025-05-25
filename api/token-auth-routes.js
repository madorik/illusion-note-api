/**
 * 토큰 기반 인증 라우트
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
const express = require('express');
const router = express.Router();
const tokenAuthService = require('./token-auth-service');

/**
 * @swagger
 * /api/token-auth/google-login:
 *   post:
 *     tags: [Token Authentication]
 *     summary: Google ID 토큰으로 로그인
 *     description: |
 *       Google Sign-In에서 받은 ID 토큰을 검증하고 사용자 인증을 처리합니다.
 *       새 사용자인 경우 자동으로 회원가입이 진행됩니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GoogleLoginRequest'
 *           example:
 *             idToken: "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyN..."
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *             example:
 *               accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               refreshToken: "a1b2c3d4e5f6..."
 *               expiresIn: 3600
 *               user:
 *                 id: "123"
 *                 name: "홍길동"
 *                 email: "user@example.com"
 *                 picture: "https://example.com/avatar.jpg"
 *       400:
 *         description: 잘못된 요청 (idToken 누락)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "idToken이 필요합니다"
 *       401:
 *         description: 인증 실패 (유효하지 않은 토큰)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "로그인에 실패했습니다"
 *               details: "토큰 검증에 실패했습니다"
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
 * @swagger
 * /api/token-auth/refresh:
 *   post:
 *     tags: [Token Authentication]
 *     summary: 토큰 갱신
 *     description: |
 *       리프레시 토큰을 사용하여 새로운 Access Token과 Refresh Token을 발급받습니다.
 *       보안을 위해 새로운 리프레시 토큰도 함께 발급됩니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *           example:
 *             refreshToken: "a1b2c3d4e5f6g7h8i9j0..."
 *     responses:
 *       200:
 *         description: 토큰 갱신 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       400:
 *         description: 잘못된 요청 (refreshToken 누락)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 유효하지 않거나 만료된 리프레시 토큰
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/token-auth/logout:
 *   post:
 *     tags: [Token Authentication]
 *     summary: 로그아웃
 *     description: |
 *       특정 리프레시 토큰을 폐기하여 해당 세션에서 로그아웃합니다.
 *       다른 기기의 세션은 유지됩니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LogoutRequest'
 *           example:
 *             refreshToken: "a1b2c3d4e5f6g7h8i9j0..."
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "로그아웃이 완료되었습니다"
 *       400:
 *         description: 잘못된 요청 (refreshToken 누락)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/token-auth/logout-all:
 *   post:
 *     tags: [Token Authentication]
 *     summary: 모든 세션 로그아웃
 *     description: |
 *       사용자의 모든 리프레시 토큰을 폐기하여 모든 기기에서 로그아웃합니다.
 *       보안상 중요한 작업이므로 Access Token이 필요합니다.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 모든 세션 로그아웃 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "모든 세션에서 로그아웃되었습니다"
 *       401:
 *         description: 인증 실패 (유효하지 않은 Access Token)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/token-auth/me:
 *   get:
 *     tags: [Token Authentication]
 *     summary: 사용자 정보 조회
 *     description: |
 *       Access Token을 검증하고 현재 로그인한 사용자의 정보를 반환합니다.
 *       토큰이 유효하지 않으면 401 오류를 반환합니다.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: 사용자 ID
 *                     name:
 *                       type: string
 *                       description: 사용자 이름
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: 사용자 이메일
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 사용자 권한
 *             example:
 *               user:
 *                 id: "123"
 *                 name: "홍길동"
 *                 email: "user@example.com"
 *                 roles: ["user"]
 *       401:
 *         description: 인증 실패 (유효하지 않은 Access Token)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/token-auth/protected:
 *   get:
 *     tags: [Token Authentication]
 *     summary: 보호된 리소스 접근 예시
 *     description: |
 *       Access Token이 필요한 보호된 리소스의 예시입니다.
 *       인증된 사용자만 접근할 수 있습니다.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 보호된 리소스 접근 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: 성공 메시지
 *                 user:
 *                   type: object
 *                   description: 현재 사용자 정보
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: 접근 시간
 *             example:
 *               message: "인증된 사용자만 접근할 수 있는 보호된 데이터입니다"
 *               user:
 *                 id: "123"
 *                 name: "홍길동"
 *                 email: "user@example.com"
 *                 roles: ["user"]
 *               timestamp: "2024-01-01T12:00:00.000Z"
 *       401:
 *         description: 인증 실패 (유효하지 않은 Access Token)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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