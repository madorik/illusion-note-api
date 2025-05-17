/**
 * OpenAI API 연동을 위한 서비스 클래스 (단일 요청 버전)
 */
const OpenAI = require('openai');
const dotenv = require('dotenv');

// 환경 변수 로드 시도
try {
  dotenv.config();
} catch (e) {
  console.log(`환경 변수 로드 중 오류 발생 (무시): ${e}`);
}

class OpenAIService {
  constructor() {
    // 환경 변수에서 직접 OpenAI API 키 가져오기
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === "your-api-key-here") {
      console.log("경고: 유효한 OPENAI_API_KEY가 환경 변수에 설정되지 않았습니다.");
      this.apiKey = null;
    } else {
      this.apiKey = apiKey;
    }
    
    this.client = new OpenAI({ apiKey: this.apiKey });
    this.model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";
    
    // API 키 마스킹하여 로그 출력
    const maskedKey = this.apiKey ? 
      this.apiKey.substring(0, 5) + "..." + "*".repeat(10) : 
      "없음";
    console.log(`OpenAI 설정: 모델=${this.model}, API 키=${maskedKey}`);
    
    // 프롬프트 템플릿 통합
    this.combinedPromptTemplate = text => 
`아래 JSON 형식으로 응답해주세요.\n{
  "title": "제목",
  "emotion": "감지된 감정(예: 좋음, 보통, 슬픔, 지침, 불안)",
  "analyze_text": "입력 텍스트에 대한 논리적 분석 및 심리적 해석",
  "response": "요청된 응답 유형에 맞춘 1-2문장 요약",
  "summary": "입력 내용의 핵심과 감정적 측면을 포함한 3줄 이내 요약"
}\n
=== 사용자 입력 ===\n${text}`;

    this.systemMessages = {
      comfort: '너는 따뜻한 대화 파트너야. 공감하고 위로하는 메시지를 JSON 형식으로 제공해.',
      fact: '너는 논리적이고 사실 기반의 감정 코치야. 과학적 근거를 간단히 포함해 JSON 응답을 제공해.',
      advice: '너는 실용적이고 실행 가능한 단계별 조언을 제공하는 조언자야. JSON 형식으로 응답해.'
    };
  }

  /**
   * 텍스트에 대해 단일 API 호출로 감정 분석, 논리 분석, 응답 생성, 요약을 모두 수행
   * @param {string} text 사용자 입력
   * @param {'comfort'|'fact'|'advice'} responseType 응답 유형
   * @returns {Promise<object>} { emotion, analyze_text, response, summary }
   */
  async generateResponse(text, responseType = 'comfort') {
    if (!text) {
      return { emotion: '알 수 없음', analyze_text: '', response: '텍스트를 입력해주세요.', summary: '' };
    }
    if (!this.apiKey) {
      return { emotion: '오류', analyze_text: '', response: 'API 키 없음: 환경 변수를 확인해주세요.', summary: '' };
    }

    const systemMsg = this.systemMessages[responseType] || this.systemMessages.comfort;
    const userPrompt = this.combinedPromptTemplate(text);

    try {
      const res = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 600
      });

      const content = res.choices[0].message.content.trim();
      // JSON 파싱
      const data = JSON.parse(content);
      return {
        title: data.title || null,
        emotion: data.emotion || null,
        analyze_text: data.analyze_text || null,
        response: data.response || null,
        summary: data.summary || null
      };
    } catch (e) {
      console.error('OpenAI 단일 요청 오류:', e);
      return { emotion: '오류', analyze_text: '', response: '응답 생성 중 오류 발생', summary: '' };
    }
  }
}

module.exports = OpenAIService;
