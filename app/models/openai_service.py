import os
import traceback
from openai import OpenAI
from dotenv import load_dotenv

# 안전하게 환경 변수 로드 시도
try:
    load_dotenv()
except Exception as e:
    print(f"환경 변수 로드 중 오류 발생 (무시): {e}")

class OpenAIService:
    """OpenAI API 연동을 위한 서비스 클래스"""
    
    def __init__(self):
        # 환경 변수에서 직접 OpenAI API 키 가져오기 (시스템 환경 변수 우선)
        api_key = os.environ.get("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
        
        if not api_key or api_key == "your-api-key-here":
            print("경고: 유효한 OPENAI_API_KEY가 환경 변수에 설정되지 않았습니다.")
            api_key = None  # OpenAI 클라이언트가 기본값을 사용하도록
            
        self.client = OpenAI(api_key=api_key)
        self.model = os.environ.get("OPENAI_MODEL") or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        
        # API 키 마스킹하여 로그 출력
        masked_key = "없음"
        if api_key:
            masked_key = api_key[:5] + "..." + "*" * 10
        print(f"OpenAI 설정: 모델={self.model}, API 키={masked_key}")
        
        # 모드별 프롬프트 템플릿
        self.prompt_templates = {
            "chat": "다음은 사용자의 일기입니다: {text}\n\n사용자가 선택한 감정은 '{emotion}'이며, 응답 유형은 '{response_type}'입니다.\n\n위 내용에 대해 선택된 감정과 응답 유형에 맞게 공감하며 대화하듯이 응답해주세요. 다음 형식으로 JSON 응답을 생성해주세요: {{\"detected_emotion\": \"{emotion}\", \"summary\": \"일기 내용 요약\", \"response\": \"공감하는 응답\"}}",
            "analyze": "다음은 사용자의 일기입니다: {text}\n\n사용자가 선택한 감정은 '{emotion}'이며, 응답 유형은 '{response_type}'입니다.\n\n이 글에서 느껴지는 감정과 심리상태를 분석해주세요. 그리고 사용자가 선택한 응답 유형({response_type})에 맞는 답변을 제공해주세요. 다음 형식으로 JSON 응답을 생성해주세요: {{\"detected_emotion\": \"{emotion}\", \"summary\": \"분석 요약\", \"response\": \"상세 분석 내용\"}}",
            "summarize": "다음은 사용자의 일기입니다: {text}\n\n사용자가 선택한 감정은 '{emotion}'이며, 응답 유형은 '{response_type}'입니다.\n\n이 내용을 간결하게 요약해주세요. 그리고 사용자가 선택한 응답 유형({response_type})에 맞는 답변을 제공해주세요. 다음 형식으로 JSON 응답을 생성해주세요: {{\"detected_emotion\": \"{emotion}\", \"summary\": \"일기 요약\", \"response\": \"요약에 대한 코멘트\"}}"
        }
        
        # 감정 매핑 (한글 <-> 영어)
        self.emotion_map = {
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
            # 영어 감정 -> 한글 표준 감정
            "happy": "좋음",
            "neutral": "보통",
            "sad": "슬픔",
            "tired": "지침",
            "angry": "불안"
        }
        
        # 응답 유형 매핑 (영어 -> 한글)
        self.response_type_map = {
            "comfort": "위로",
            "fact": "팩트",
            "advice": "조언"
        }
        
        # 응답 유형별 시스템 메시지
        self.system_messages = {
            "comfort": "당신은 일기장 앱을 사용하는 사용자와 대화하는 AI 비서입니다. 사용자의 감정에 공감하고 위로하는 응답을 제공합니다. 결론과 교훈을 강조하지 말고, 대신 사용자의 감정에 초점을 맞추고 공감을 표현하세요.",
            "fact": "당신은 일기장 앱을 사용하는 사용자와 대화하는 AI 비서입니다. 사용자의 상황과 감정에 대해 객관적인 사실과 정보를 제공합니다. 개인적인 조언보다는 심리학적 사실이나 통계 정보에 기반한 정보를 제공하세요.",
            "advice": "당신은 일기장 앱을 사용하는 사용자와 대화하는 AI 비서입니다. 사용자의 상황과 감정에 기반하여 실용적인 조언과 해결책을 제공합니다. 공감도 중요하지만, 주로 사용자가 상황을 개선할 수 있는 구체적인 조언에 집중하세요."
        }
    
    def generate_response(self, text, mode="chat", mood_id="neutral", response_type="comfort", context=""):
        """
        입력된 텍스트에 대한 OpenAI 응답 생성
        
        Args:
            text: 사용자가 입력한 텍스트
            mode: 응답 생성 모드 ('chat', 'analyze', 'summarize')
            mood_id: 사용자가 선택한 감정 ID ('happy', 'neutral', 'sad', 'tired', 'angry')
            response_type: 응답 유형 ('comfort', 'fact', 'advice')
            context: 추가 컨텍스트 정보
            
        Returns:
            dict: 감지된 감정, 요약, 응답을 포함한 딕셔너리
        """
        print(f"OpenAI 요청 시작: mode={mode}, mood_id={mood_id}, response_type={response_type}")
        
        if not text:
            print("경고: 빈 텍스트가 입력되었습니다.")
            return {
                "detected_emotion": "알 수 없음",
                "summary": "텍스트가 입력되지 않았습니다.",
                "response": "텍스트를 입력해주세요."
            }
        
        # 감정과 응답 유형 한글 변환
        emotion_kr = self.emotion_map.get(mood_id, "보통")
        response_type_kr = self.response_type_map.get(response_type, "위로")
        
        # 프롬프트 생성
        prompt = self.prompt_templates.get(mode, self.prompt_templates["chat"]).format(
            text=text, 
            emotion=emotion_kr,
            response_type=response_type_kr
        )
        
        if context:
            prompt += f"\n추가 컨텍스트: {context}"
        
        # 시스템 메시지 선택
        system_message = self.system_messages.get(response_type, self.system_messages["comfort"])
        
        try:
            print(f"OpenAI API 호출: 모델={self.model}, 텍스트 길이={len(text)}, 감정={emotion_kr}, 응답유형={response_type_kr}")
            
            # OpenAI API 호출 - 최신 클라이언트 사용
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            # 응답 텍스트 추출
            response_text = response.choices[0].message.content.strip()
            print(f"OpenAI 응답 받음: 응답 길이={len(response_text)}")
            
            # API가 JSON 형식으로 응답하지 않은 경우 처리
            try:
                # JSON 응답을 파싱해봅니다
                import json
                json_response = json.loads(response_text)
                
                # JSON 파싱에 성공했으면 필요한 필드 확인
                if "detected_emotion" in json_response and "summary" in json_response and "response" in json_response:
                    # 감정값 표준화 - 하지만 사용자가 선택한 감정 우선
                    json_response["detected_emotion"] = emotion_kr
                    print("OpenAI 응답 처리 완료: JSON 형식 응답 사용")
                    return json_response
                else:
                    # 필드 누락된 경우 수동 생성
                    print("경고: OpenAI 응답이 필요한 필드를 포함하지 않음, 구조화된 응답으로 변환")
                    return self._generate_structured_response(response_text, mode, emotion_kr)
            except json.JSONDecodeError as e:
                # JSON 파싱에 실패한 경우 수동 생성
                print(f"경고: OpenAI 응답이 유효한 JSON이 아님, 구조화된 응답으로 변환: {e}")
                return self._generate_structured_response(response_text, mode, emotion_kr)
            
        except Exception as e:
            error_detail = traceback.format_exc()
            print(f"OpenAI API 오류: {e}")
            print(f"상세 오류 내용:\n{error_detail}")
            
            return {
                "detected_emotion": emotion_kr,
                "summary": "응답 생성 중 오류가 발생했습니다.",
                "response": f"응답 생성 중 오류가 발생했습니다: {str(e)}"
            }
    
    def _generate_structured_response(self, text, mode, emotion):
        """
        일반 텍스트에서 구조화된 응답을 생성합니다.
        """
        # 모드별 요약/응답 생성
        if mode == "analyze":
            summary = text[:100] + "..." if len(text) > 100 else text
            return {
                "detected_emotion": emotion,
                "summary": summary,
                "response": text
            }
        elif mode == "summarize":
            return {
                "detected_emotion": emotion,
                "summary": text,
                "response": "위 내용으로 요약됩니다."
            }
        else:  # chat 모드
            return {
                "detected_emotion": emotion,
                "summary": f"당신의 감정은 '{emotion}'으로 감지되었습니다.",
                "response": text
            } 