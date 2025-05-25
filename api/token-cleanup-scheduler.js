/**
 * 만료된 토큰 정리 스케줄러
 */
const tokenAuthService = require('./token-auth-service');

class TokenCleanupScheduler {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.intervalMs = 60 * 60 * 1000; // 1시간마다 실행
  }

  /**
   * 스케줄러 시작
   */
  start() {
    if (this.isRunning) {
      console.log('토큰 정리 스케줄러가 이미 실행 중입니다.');
      return;
    }

    console.log('토큰 정리 스케줄러를 시작합니다. (주기: 1시간)');
    
    // 즉시 한 번 실행
    this.cleanup();
    
    // 주기적 실행 설정
    this.intervalId = setInterval(() => {
      this.cleanup();
    }, this.intervalMs);
    
    this.isRunning = true;
  }

  /**
   * 스케줄러 중지
   */
  stop() {
    if (!this.isRunning) {
      console.log('토큰 정리 스케줄러가 실행 중이 아닙니다.');
      return;
    }

    console.log('토큰 정리 스케줄러를 중지합니다.');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
  }

  /**
   * 만료된 토큰 정리 실행
   */
  async cleanup() {
    try {
      console.log(`[${new Date().toISOString()}] 만료된 토큰 정리 작업 시작...`);
      
      await tokenAuthService.cleanupExpiredTokens();
      
      console.log(`[${new Date().toISOString()}] 만료된 토큰 정리 작업 완료`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 토큰 정리 작업 실패:`, error);
    }
  }

  /**
   * 스케줄러 상태 조회
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
      nextRun: this.isRunning ? new Date(Date.now() + this.intervalMs).toISOString() : null
    };
  }

  /**
   * 주기 변경 (밀리초 단위)
   */
  setInterval(intervalMs) {
    this.intervalMs = intervalMs;
    
    if (this.isRunning) {
      // 실행 중이면 재시작
      this.stop();
      this.start();
    }
    
    console.log(`토큰 정리 주기가 ${intervalMs}ms로 변경되었습니다.`);
  }
}

// 인스턴스 생성 및 내보내기
const tokenCleanupScheduler = new TokenCleanupScheduler();

module.exports = tokenCleanupScheduler; 