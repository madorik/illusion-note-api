/**
 * 감정 분석 결과 저장을 위한 서비스
 */
const supabase = require('./supabase-client');
const authService = require('./auth-service');

class EmotionStorageService {
  constructor() {
    this.tableName = 'emotion_analysis';
  }

  /**
   * 감정 분석 결과를 저장합니다.
   * 
   * @param {Object} data 저장할 데이터
   * @param {string} data.userId 사용자 ID (UUID 형식, 없으면 익명 사용자 UUID 사용)
   * @param {string} data.text 분석된 텍스트 (원본)
   * @param {string} data.emotion 감지된 감정
   * @param {string} data.response 응답 텍스트
   * @param {string} data.analyze_text 분석 텍스트
   * @param {string} data.summary 요약 텍스트 (선택사항)
   * @param {string} data.title 제목 (선택사항)
   * @param {string} data.responseType 응답 유형 (comfort, fact, advice)
   * @returns {Promise<Object>} 저장된 데이터
   */
  async saveEmotionAnalysis(data) {
    try {
      console.log('saveEmotionAnalysis 함수 호출됨');
      
      // 필수 필드 확인
      if (!data.text) {
        console.error('필수 필드 누락: text');
        return null;
      }
      
      if (!data.emotion) {
        console.error('필수 필드 누락: emotion');
        return null;
      }
      
      if (!data.response) {
        console.error('필수 필드 누락: response');
        return null;
      }
      
      // 기본값 설정
      const userId = data.userId || authService.getAnonymousUserId();
        
      const currentDate = new Date().toISOString();
      
      // 데이터 준비
      const recordData = {
        user_id: userId,
        created_at: currentDate,
        text: data.text,
        emotion: data.emotion,
        response: data.response,
        analyze_text: data.analyze_text || null,
        summary: data.summary || null,
        title: data.title || null,
        response_type: data.responseType || 'comfort',
        metadata: data.metadata || {}
      };
      
      console.log(`Supabase 데이터 삽입 시작: 테이블=${this.tableName}, userId=${userId}`);
      
      // Supabase에 데이터 삽입 (재시도 로직 포함)
      let insertedData, error;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const result = await supabase
            .from(this.tableName)
            .insert(recordData)
            .select();
          
          insertedData = result.data;
          error = result.error;
          
          if (!error) {
            break; // 성공하면 루프 종료
          }
          
          console.warn(`Supabase 삽입 시도 ${retryCount + 1} 실패:`, error);
          retryCount++;
          
          if (retryCount < maxRetries) {
            // 재시도 전 잠시 대기 (지수 백오프)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          }
        } catch (fetchError) {
          console.error(`Supabase 삽입 시도 ${retryCount + 1} 네트워크 오류:`, fetchError);
          retryCount++;
          
          if (retryCount < maxRetries) {
            // 재시도 전 잠시 대기
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          } else {
            error = fetchError;
          }
        }
      }
      
      if (error) {
        console.error('감정 분석 결과 저장 중 오류:', error);
        throw error;
      }
      
      if (!insertedData || insertedData.length === 0) {
        console.error('삽입 후 데이터가 반환되지 않음');
        return null;
      }
      
      console.log(`감정 분석 결과가 성공적으로 저장됨: ID=${insertedData[0]?.id}, 사용자=${userId}`);
      
      return insertedData[0];
    } catch (error) {
      console.error('감정 분석 저장 서비스 오류:', error);
      // 저장 실패해도 서비스는 계속 동작하도록 에러 무시
      return null;
    }
  }

  /**
   * 특정 사용자의 감정 분석 기록을 조회합니다.
   * 
   * @param {string} userId 사용자 ID
   * @param {Object} options 옵션
   * @param {number} options.limit 조회할 레코드 수 (기본값: 10)
   * @param {number} options.offset 오프셋 (기본값: 0)
   * @returns {Promise<Array>} 감정 분석 기록 목록
   */
  async getUserEmotionHistory(userId, options = {}) {
    let { limit = 10, offset = 0 } = options;
    
    // 숫자 타입이 아니면 기본값 사용
    limit = typeof limit === 'number' && !isNaN(limit) ? limit : 10;
    offset = typeof offset === 'number' && !isNaN(offset) ? offset : 0;
    
    // 범위 제한
    limit = Math.min(Math.max(1, limit), 100); // 최소 1, 최대 100
    offset = Math.max(0, offset); // 최소 0
    
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        console.error('감정 분석 기록 조회 중 오류:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('감정 분석 기록 조회 서비스 오류:', error);
      return [];
    }
  }
  
  /**
   * 특정 ID의 감정 분석 기록을 조회합니다.
   * 
   * @param {number} id 감정 분석 ID
   * @returns {Promise<Object>} 감정 분석 기록
   */
  async getEmotionAnalysisById(id) {
    try {
      console.log(`getEmotionAnalysisById 호출: ID=${id}, 타입=${typeof id}`);
      
      // ID가 유효한 숫자인지 확인
      if (isNaN(id) || id <= 0) {
        console.error(`감정 분석 기록 조회 오류: 유효하지 않은 ID ${id}, 타입=${typeof id}`);
        return null;
      }
      
      console.log(`Supabase 쿼리 실행: table=${this.tableName}, id=${id}`);
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('감정 분석 기록 조회 중 오류:', error);
        throw error;
      }
      
      console.log(`조회 결과: ${data ? '데이터 있음' : '데이터 없음'}`);
      return data;
    } catch (error) {
      console.error('감정 분석 기록 조회 서비스 오류:', error);
      return null;
    }
  }

  /**
   * 특정 사용자의 날짜 범위별 감정 분석 기록을 조회합니다.
   * 
   * @param {string} userId 사용자 ID
   * @param {string} startDate 시작 날짜 (ISO 형식: YYYY-MM-DD)
   * @param {string} endDate 종료 날짜 (ISO 형식: YYYY-MM-DD)
   * @param {Object} options 옵션
   * @param {number} options.limit 조회할 레코드 수 (기본값: 100)
   * @returns {Promise<Array>} 감정 분석 기록 목록
   */
  async getEmotionAnalysisByDate(userId, startDate, endDate, options = {}) {
    try {
      console.log(`날짜별 감정 분석 조회: 사용자=${userId}, 시작일=${startDate}, 종료일=${endDate}`);
      
      // 옵션 기본값 설정
      const limit = options.limit && !isNaN(Number(options.limit)) ? 
                    Math.min(Math.max(1, Number(options.limit)), 100) : 100;
      
      // 날짜 형식 검증 및 변환
      const formattedStartDate = startDate ? `${startDate}T00:00:00Z` : null;
      const formattedEndDate = endDate ? `${endDate}T23:59:59Z` : null;
      
      // 쿼리 구성
      let query = supabase.from(this.tableName)
                         .select('*')
                         .eq('user_id', userId)
                         .order('created_at', { ascending: false })
                         .limit(limit);
      
      // 날짜 필터 추가
      if (formattedStartDate) {
        query = query.gte('created_at', formattedStartDate);
      }
      if (formattedEndDate) {
        query = query.lte('created_at', formattedEndDate);
      }
      
      // 쿼리 실행
      const { data, error } = await query;
      
      if (error) {
        console.error('날짜별 감정 분석 조회 중 오류:', error);
        throw error;
      }
      
      console.log(`날짜별 감정 분석 조회 결과: ${data.length}개 항목 찾음`);
      return data;
    } catch (error) {
      console.error('날짜별 감정 분석 조회 서비스 오류:', error);
      return [];
    }
  }

  /**
   * 특정 사용자의 월별 감정 통계를 집계합니다.
   * 
   * @param {string} userId 사용자 ID
   * @param {string} yearMonth 특정 년월 (YYYY-MM 형식, 옵션)
   * @param {number} year 연도 (옵션 - 지정하지 않으면 전체 기간)
   * @returns {Promise<Object>} 월별 감정 통계 
   */
  async getMonthlyEmotionStats(userId, yearMonth = null, year = null) {
    try {
      // 년월이 지정된 경우 해당 년월만 조회
      if (yearMonth) {
        const [yearPart, monthPart] = yearMonth.split('-');
        const year = parseInt(yearPart, 10);
        const month = parseInt(monthPart, 10);
        
        console.log(`특정 년월 감정 통계 조회: 사용자=${userId}, 년월=${yearMonth}`);
        
        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
          console.error(`잘못된 년월 형식: ${yearMonth}`);
          return [];
        }
        
        // 해당 년월의 시작일과 종료일 계산
        const daysInMonth = new Date(year, month, 0).getDate();
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01T00:00:00Z`;
        const endDate = `${year}-${month.toString().padStart(2, '0')}-${daysInMonth}T23:59:59Z`;
        
        // 쿼리 구성
        const { data, error } = await supabase.from(this.tableName)
          .select('created_at, emotion')
          .eq('user_id', userId)
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        
        if (error) {
          console.error('년월별 감정 통계 조회 중 오류:', error);
          throw error;
        }
        
        // 해당 월의 감정 통계 집계
        const emotionCounts = {};
        let total = 0;
        
        data.forEach(item => {
          if (!item.emotion) return;
          const emotion = item.emotion || '알 수 없음';
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
          total++;
        });
        
        const result = [{
          year,
          month,
          total,
          emotions: emotionCounts
        }];
        
        console.log(`년월 감정 통계 조회 결과: ${total}개 항목 집계됨`);
        return result;
      }
      // 연도만 지정된 경우 해당 연도의 모든 월 조회
      else if (year) {
        console.log(`연도별 감정 통계 조회: 사용자=${userId}, 연도=${year}`);
        
        // 쿼리 구성
        const startDate = `${year}-01-01T00:00:00Z`;
        const endDate = `${year}-12-31T23:59:59Z`;
        const { data, error } = await supabase.from(this.tableName)
          .select('created_at, emotion')
          .eq('user_id', userId)
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        
        if (error) {
          console.error('연도별 감정 통계 조회 중 오류:', error);
          throw error;
        }
        
        return this._aggregateMonthlyStats(data);
      }
      // 아무것도 지정되지 않은 경우 전체 기간 조회
      else {
        console.log(`전체 기간 월별 감정 통계 조회: 사용자=${userId}`);
        
        // 쿼리 구성
        const { data, error } = await supabase.from(this.tableName)
          .select('created_at, emotion')
          .eq('user_id', userId);
        
        if (error) {
          console.error('월별 감정 통계 조회 중 오류:', error);
          throw error;
        }
        
        return this._aggregateMonthlyStats(data);
      }
    } catch (error) {
      console.error('월별 감정 통계 조회 서비스 오류:', error);
      return [];
    }
  }
  
  /**
   * 데이터를 월별로 집계하는 내부 헬퍼 메서드
   * @private
   */
  _aggregateMonthlyStats(data) {
    // 월별 감정 통계 집계
    const monthlyStats = {};
    
    data.forEach(item => {
      if (!item.created_at || !item.emotion) return;
      
      const date = new Date(item.created_at);
      const month = date.getMonth() + 1; // 0-베이스 → 1-베이스
      const yearFromDate = date.getFullYear();
      const monthKey = `${yearFromDate}-${month.toString().padStart(2, '0')}`;
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          year: yearFromDate,
          month: month,
          total: 0,
          emotions: {}
        };
      }
      
      const emotion = item.emotion || '알 수 없음';
      
      // 해당 월의 전체 카운트 증가
      monthlyStats[monthKey].total++;
      
      // 해당 월의 감정별 카운트 증가
      if (!monthlyStats[monthKey].emotions[emotion]) {
        monthlyStats[monthKey].emotions[emotion] = 0;
      }
      monthlyStats[monthKey].emotions[emotion]++;
    });
    
    // 월별 통계를 배열로 변환 (최신 달이 먼저 오도록 정렬)
    const result = Object.values(monthlyStats).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    
    console.log(`월별 감정 통계 조회 결과: ${result.length}개 월 데이터 추출`);
    return result;
  }

  /**
   * 특정 사용자의 최근 작성글을 가져옵니다.
   * 
   * @param {string} userId 사용자 ID
   * @param {number} count 가져올 항목 수 (기본값: 5)
   * @returns {Promise<Array>} 최근 감정 분석 기록 목록
   */
  async getRecentEmotionAnalysis(userId, count = 5) {
    try {
      console.log(`최근 작성글 조회: 사용자=${userId}, 개수=${count}`);
      
      // count 유효성 검사
      const limit = Math.min(Math.max(1, count), 20); // 최소 1개, 최대 20개
      
      // 쿼리 구성
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('최근 작성글 조회 중 오류:', error);
        throw error;
      }
      
      console.log(`최근 작성글 조회 결과: ${data.length}개 항목 검색됨`);
      
      // 검색 결과 포맷팅
      const formattedResults = data.map(item => {
        // 생성 날짜 포맷팅
        const createdAt = new Date(item.created_at);
        const formattedDate = createdAt.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        return {
          id: item.id,
          userId: item.user_id,
          createdAt: item.created_at,
          formattedDate,
          text: item.text,
          title: item.title || this._generateDefaultTitle(item.text),
          emotion: item.emotion,
          summary: item.summary,
          responseType: item.response_type
        };
      });
      
      return formattedResults;
    } catch (error) {
      console.error('최근 작성글 조회 서비스 오류:', error);
      return [];
    }
  }
  
  /**
   * 텍스트에서 기본 제목 생성 (제목이 없는 경우)
   * @private
   */
  _generateDefaultTitle(text) {
    if (!text) return '제목 없음';
    
    // 텍스트의 첫 15자를 사용하여 제목 생성 (한글 문자 고려)
    const maxLength = 15;
    let title = text.substring(0, maxLength).trim();
    
    // 제목이 최대 길이보다 짧은 경우 그대로 사용
    if (text.length <= maxLength) return title;
    
    // 제목이 잘린 경우 '...' 추가
    return `${title}...`;
  }
}

module.exports = new EmotionStorageService(); 