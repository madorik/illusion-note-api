/**
 * OpenAI API 연동을 위한 서비스 클래스
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
    
    // 모드별 프롬프트 템플릿
    this.promptTemplates = {
      "chat": "사용자 입력: {text}\n\n사용자의 감정은 '{emotion}'입니다. 응답 유형은 '{responseType}'입니다.\n\n위 내용에 대해 '{responseType}' 방식으로 이모지를 활용한 구조화된 답변을 제공해주세요. 답변은 1) 명확한 판단, 2) 이모지를 사용한 논리적 분석, 3) 심리적 해석, 4) 결론, 5) 제안할 대화의 형태로 제시하세요. 응답은 다음 JSON 형식을 따라주세요: {\"emotion\": \"{emotion}\", \"analyze_text\": \"입력에 대한 상세 분석과 답변\", \"response\": \"상세 답변의 1-2문장 요약\"}",
      "analyze": "사용자 입력: {text}\n\n사용자의 감정은 '{emotion}'입니다. 응답 유형은 '{responseType}'입니다.\n\n이 글에서 느껴지는 감정과 심리상태를 심층적으로 분석하고, '{responseType}' 방식으로 이모지를 활용한 구조화된 답변을 제공해주세요. 답변은 1) 명확한 판단, 2) 이모지를 사용한 논리적 분석, 3) 심리적 해석, 4) 결론, 5) 제안할 대화의 형태로 제시하세요. 응답은 다음 JSON 형식을 따라주세요: {\"emotion\": \"{emotion}\", \"analyze_text\": \"입력에 대한 심층 심리 분석과 상세 답변\", \"response\": \"상세 분석의 1-2문장 요약\"}",
      "summarize": "사용자 입력: {text}\n\n사용자의 감정은 '{emotion}'입니다. 응답 유형은 '{responseType}'입니다.\n\n이 내용을 '{responseType}' 방식으로 깊이 있게 분석하고, 이모지를 활용한 구조화된 답변을 제공해주세요. 답변은 1) 명확한 판단, 2) 이모지를 사용한 논리적 분석, 3) 심리적 해석, 4) 결론, 5) 제안할 대화의 형태로 제시하세요. 응답은 다음 JSON 형식을 따라주세요: {\"emotion\": \"{emotion}\", \"analyze_text\": \"입력에 대한 상세 분석과 답변\", \"response\": \"상세 분석의 1-2문장 요약\"}"
    };
    
    // 요약용 프롬프트 템플릿
    this.summaryTemplate = "사용자 입력: {text}\n\n사용자가 선택한 감정은 '{emotion}'입니다.\n\n위 내용에 대한 핵심을 3줄 이내로 요약해주세요. 요약은 입력 내용의 핵심과 감정적 측면을 모두 포함해야 합니다.";
    
    // 감정 매핑 (한글 <-> 영어)
    this.emotionMap = {
      "기쁨": "좋음",
      "행복": "좋음",
      "즐거움": "좋음",
      "만족": "좋음",
      "평온": "보통",
      "평범": "보통", 
      "중립": "보통",
      "일상": "보통",
      "슬픔": "슬픔",
      "우울": "슬픔",
      "상실": "슬픔",
      "외로움": "슬픔",
      "피곤": "지침",
      "지침": "지침",
      "무기력": "지침",
      "에너지 부족": "지침",
      "불안": "불안",
      "걱정": "불안",
      "두려움": "불안",
      "화남": "불안",
      // 영어 감정 -> 한글 표준 감정
      "happy": "좋음",
      "neutral": "보통",
      "sad": "슬픔",
      "tired": "지침",
      "angry": "불안"
    };
    
    // 응답 유형 매핑 (영어 -> 한글)
    this.responseTypeMap = {
      "comfort": "공감",
      "fact": "팩트",
      "advice": "조언"
    };
    
    // 응답 유형별 시스템 메시지
    this.systemMessages = {
      comfort: "당신은 사용자의 감정에 깊이 공감하고 위로하는 역할입니다. 다음과 같은 구조로 답변하세요:\n\n1. 먼저 상황에 대한 명확한 판단(누가 잘못했는지 등)을 한 문장으로 제시하세요.\n2. 이모지(🕒, 😊, 😢 등)를 활용하여 논리적 분석을 여러 항목으로 나누어 제시하세요.\n3. 심리적 해석을 '🙋‍♀️ 심리적 해석 (참고용)'이라는 제목 아래 제공하세요.\n4. '✔️ 결론'이라는 제목 아래 요점을 3-4개의 짧은 문장으로 정리하세요.\n5. 필요시 대화에 사용할 수 있는 구체적인 문장을 제안하세요.",
      fact: "당신은 사용자의 상황에 대해 객관적인 사실과 전문적인 정보를 제공하는 역할입니다. 다음과 같은 구조로 답변하세요:\n\n1. 먼저 상황에 대한 명확한 판단(누가 잘못했는지 등)을 한 문장으로 제시하세요.\n2. 이모지(🕒, 📊, 🔍 등)를 활용하여 논리적 분석을 여러 항목으로 나누어 제시하세요.\n3. 심리적 해석을 '🙋‍♀️ 심리적 해석 (참고용)'이라는 제목 아래 제공하세요.\n4. '✔️ 결론'이라는 제목 아래 요점을 3-4개의 짧은 문장으로 정리하세요.\n5. 필요시 대화에 사용할 수 있는 구체적인 문장을 제안하세요.",
      advice: "당신은 사용자에게 실용적인 조언과 구체적인 해결책을 제시하는 역할입니다. 다음과 같은 구조로 답변하세요:\n\n1. 먼저 상황에 대한 명확한 판단(누가 잘못했는지 등)을 한 문장으로 제시하세요.\n2. 이모지(🕒, 💬, 🤝 등)를 활용하여 논리적 분석을 여러 항목으로 나누어 제시하세요.\n3. 심리적 해석을 '🙋‍♀️ 심리적 해석 (참고용)'이라는 제목 아래 제공하세요.\n4. '✔️ 결론'이라는 제목 아래 요점을 3-4개의 짧은 문장으로 정리하세요.\n5. 필요시 대화에 사용할 수 있는 구체적인 문장을 제안하세요."
    };

    // 요약 전용 시스템 메시지
    this.summarySystemMessage = "텍스트의 핵심과 감정적 요소를 포함해 한 줄 이내로 간결하게 요약합니다.";

  }

  /**
   * 입력된 텍스트에 대한 OpenAI 응답 생성
   * 
   * @param {string} text 사용자가 입력한 텍스트
   * @param {string} mode 응답 생성 모드 ('chat', 'analyze', 'summarize')
   * @param {string} moodId 사용자가 선택한 감정 ID ('happy', 'neutral', 'sad', 'tired', 'angry')
   * @param {string} responseType 응답 유형 ('comfort', 'fact', 'advice')
   * @param {string} context 추가 컨텍스트 정보
   * @returns {Promise<object>} 감지된 감정, 요약, 응답을 포함한 객체
   */
  async generateResponse(text, mode = "chat", moodId = "neutral", responseType = "comfort", context = "") {
    console.log(`OpenAI 요청 시작: mode=${mode}, moodId=${moodId}, responseType=${responseType}`);
    
    if (!text) {
      console.log("경고: 빈 텍스트가 입력되었습니다.");
      return {
        emotion: "알 수 없음",
        response: "텍스트를 입력해주세요."
      };
    }
    
    // API 키 확인
    if (!this.apiKey) {
      console.log("경고: 유효한 API 키가 없어서 OpenAI API를 호출할 수 없습니다.");
      return this._generateStructuredResponse(
        "OpenAI API 키가 설정되지 않았습니다. 환경 변수를 확인해주세요.", 
        mode, 
        this.emotionMap[moodId] || "보통"
      );
    }
    
    // 감정과 응답 유형 한글 변환
    const emotionKr = this.emotionMap[moodId] || "보통";
    const responseTypeKr = this.responseTypeMap[responseType] || "공감";
    
    try {
      // 1. 메인 응답 생성 - 원래 responseType 매개변수도 함께 전달
      const mainResponse = await this._generateMainResponse(text, mode, emotionKr, responseTypeKr, context, responseType);
      
      // 2. 요약(summary) 생성 - 별도 API 호출
      const summary = await this._generateSummary(text, emotionKr);
      
      // 3. 결과 결합
      const result = {
        emotion: mainResponse.emotion || emotionKr,
        response: mainResponse.response || "응답을 생성할 수 없습니다.",
        analyze_text: mainResponse.analyze_text || ""
      };
      
      // summary가 존재하는 경우에만 포함
      if (summary) {
        result.summary = summary;
      }
      
      return result;
      
    } catch (e) {
      console.error(`OpenAI API 오류: ${e}`);
      console.error(`상세 오류 내용:\n${e.stack}`);
      
      return {
        emotion: emotionKr,
        response: `응답 생성 중 오류가 발생했습니다: ${e.message}`
      };
    }
  }
  
  /**
   * 메인 응답 생성 - 첫 번째 API 호출
   * 
   * @private
   */
  async _generateMainResponse(text, mode, emotionKr, responseTypeKr, context, responseType = "comfort") {
    // 프롬프트 생성
    let prompt = this.promptTemplates[mode] || this.promptTemplates["chat"];
    prompt = prompt
      .replace("{text}", text)
      .replace(/{emotion}/g, emotionKr)
      .replace(/{responseType}/g, responseTypeKr);
    
    if (context) {
      prompt += `\n추가 컨텍스트: ${context}`;
    }
    
    // 시스템 메시지 선택 - 직접 전달받은 responseType 사용
    const systemMessage = this.systemMessages[responseType] || this.systemMessages["comfort"];
    
    console.log(`메인 응답 OpenAI API 호출: 모델=${this.model}, 텍스트 길이=${text.length}, 감정=${emotionKr}, 응답유형=${responseType}`);
    
    // OpenAI API 호출
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });
    
    // 응답 텍스트 추출
    const responseText = response.choices[0].message.content.trim();
    console.log(`메인 응답 받음: 응답 길이=${responseText.length}`);
    
    // API가 JSON 형식으로 응답하지 않은 경우 처리
    try {
      // JSON 응답을 파싱
      const jsonResponse = JSON.parse(responseText);
      
      // JSON 파싱에 성공했으면 필요한 필드 확인
      if (jsonResponse.emotion && jsonResponse.response) {
        return jsonResponse;
      } else {
        // 필드 누락된 경우 기본 응답 생성
        return { 
          emotion: emotionKr,
          response: responseText,
          analyze_text: "분석 정보 없음"
        };
      }
    } catch (e) {
      // JSON 파싱에 실패한 경우 기본 응답 생성
      console.log(`경고: 메인 응답이 유효한 JSON이 아님: ${e}`);
      return { 
        emotion: emotionKr,
        response: responseText,
        analyze_text: "분석 정보 없음"
      };
    }
  }
  
  /**
   * 요약 생성 - 두 번째 API 호출
   * 
   * @private
   */
  async _generateSummary(text, emotionKr) {
    // 프롬프트 생성
    let prompt = this.summaryTemplate
      .replace("{text}", text)
      .replace("{emotion}", emotionKr);
    
    console.log(`요약 OpenAI API 호출: 텍스트 길이=${text.length}, 감정=${emotionKr}`);
    
    try {
      // OpenAI API 호출
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: this.summarySystemMessage },
          { role: "user", content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 100
      });
      
      // 응답 텍스트 추출 및 반환
      const summaryText = response.choices[0].message.content.trim();
      console.log(`요약 응답 받음: 길이=${summaryText.length}`);
      return summaryText;
    } catch (e) {
      console.error(`요약 생성 중 오류: ${e.message}`);
      return null; // null 반환으로 변경
    }
  }

  /**
   * 일반 텍스트에서 구조화된 응답을 생성합니다.
   * 
   * @param {string} text 응답 텍스트
   * @param {string} mode 응답 모드
   * @param {string} emotion 감정
   * @returns {object} 구조화된 응답
   */
  _generateStructuredResponse(text, mode, emotion) {
    // 모드별 응답 생성
    if (mode === "analyze") {
      return {
        emotion: emotion,
        response: text,
        analyze_text: "기본 분석 텍스트"
      };
    } else if (mode === "summarize") {
      return {
        emotion: emotion,
        response: text,
        analyze_text: "요약 분석 텍스트"
      };
    } else {  // chat 모드
      return {
        emotion: emotion,
        response: text,
        analyze_text: "기본 분석 텍스트"
      };
    }
  }
}

module.exports = OpenAIService; 