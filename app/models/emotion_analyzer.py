import os
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from dotenv import load_dotenv

# 안전하게 환경 변수 로드 시도
try:
    load_dotenv()
except Exception as e:
    print(f"환경 변수 로드 중 오류 발생 (무시): {e}")

class EmotionAnalyzer:
    """감정 분석 및 응답 생성을 위한 클래스"""
    
    def __init__(self):
        # 모델 이름은 환경 변수에서 가져옴
        self.model_name = os.getenv("MODEL_NAME", "facebook/bart-large-cnn")
        
        # 실제 프로덕션에서는 이 부분에 감정 분석 모델 로드 코드 추가
        # 현재는 간단한 구현을 위해 모의 응답 사용
        
        # 실제 모델 로드시 아래와 같이 구현
        # self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        # self.model = AutoModelForSeq2SeqLM.from_pretrained(self.model_name)
        
        # 감정 매핑 (mood_id -> 한글 감정)
        self.emotion_map = {
            "happy": "좋음",
            "neutral": "보통",
            "sad": "슬픔",
            "tired": "지침",
            "angry": "불안"
        }
        
        # 모드별 응답 템플릿
        self.mode_templates = {
            "comfort": {
                "happy": "당신의 기쁨을 함께 나눌 수 있어 저도 행복합니다. 이런 긍정적인 감정은 주변 사람들에게도 전달되어요. 오늘의 이 기분을 오래 간직하세요.",
                "neutral": "평온한 마음 상태도 중요한 감정이에요. 모든 날이 극적인 감정으로 가득 차있을 필요는 없습니다. 이런 균형 잡힌 감정은 당신의 안정을 보여줍니다.",
                "sad": "당신의 감정은 충분히 이해할 수 있어요. 마음이 아프고 힘든 것은 자연스러운 감정이에요. 이런 어려운 시간이 지나면 분명히 더 강해진 당신을 만나게 될 거예요.",
                "tired": "충분히 휴식을 취하는 것도 중요해요. 지치고 피곤한 것은 당신이 열심히 살아왔다는 증거이기도 합니다. 잠시 쉬어가도 괜찮아요.",
                "angry": "당신의 불안함은 자연스러운 감정이에요. 때로는 불안이 우리를 보호하기도 합니다. 이 감정을 인정하고 천천히 해결해 나가는 것이 중요해요."
            },
            "fact": {
                "happy": "긍정적 감정은 면역 체계를 강화시키고 스트레스 호르몬 수치를 낮춥니다. 연구에 따르면 행복한 사람들은 평균적으로 더 건강하고 더 오래 삽니다.",
                "neutral": "감정의 균형은 심리적 안정의 핵심입니다. 연구에 따르면 감정 변동이 적은 사람들은 스트레스 관리 능력이 더 뛰어나며 정신적 회복력이 강합니다.",
                "sad": "슬픔은 평균적으로 3-6개월 지속됩니다. 연구에 따르면 슬픔을 느낄 때 우리 뇌에서는 실제 물리적 고통과 비슷한 신경 반응이 일어납니다.",
                "tired": "피로감은 체내 코르티솔 수치와 밀접한 관련이 있습니다. 적절한 휴식은 뇌 기능을 향상시키고 면역 체계를 강화하는 데 필수적입니다.",
                "angry": "불안은 위험 상황에서 생존에 필요한 진화적 반응입니다. 단기적 불안은 주의력과 집중력을 높이지만, 만성적 불안은 심장 건강과 면역 체계에 부정적인 영향을 미칠 수 있습니다."
            },
            "advice": {
                "happy": "이 긍정적인 상태를 유지하기 위해 감사일기를 써보세요. 작은 성취감을 기록하고, 이런 기쁨을 주변 사람들과 나누는 것도 행복을 연장하는 좋은 방법입니다.",
                "neutral": "균형 잡힌 감정 상태를 유지하기 위해 규칙적인 일상과 적절한 휴식을 취하세요. 가벼운 운동이나 명상은 이런 안정된 상태를 유지하는 데 도움이 됩니다.",
                "sad": "자신을 돌보는 시간을 가지세요. 규칙적인 생활, 충분한 휴식, 건강한 식습관이 도움이 됩니다. 새로운 취미나 활동에 참여하는 것도 좋은 방법입니다.",
                "tired": "에너지를 회복하기 위해 충분한 수면을 취하고, 적절한 영양 섭취를 하세요. 가능하다면 일정을 조정하여 휴식 시간을 확보하고, 가벼운 스트레칭이나 산책도 도움이 됩니다.",
                "angry": "깊은 호흡과 마음 챙김 명상을 시도해보세요. 불안한 생각이 떠오를 때 그것을 기록하고 분석하는 것이 도움이 될 수 있습니다. 필요하다면 전문가의 도움을 구하는 것도 고려해보세요."
            }
        }

    def analyze(self, text, mood_id, mode):
        """
        텍스트를 분석하고 감정에 맞는 응답을 생성
        
        Args:
            text: 사용자가 입력한 텍스트
            mood_id: 사용자가 선택한 감정 ID ('happy', 'sad' 등)
            mode: 응답 모드 ('comfort', 'fact', 'advice')
            
        Returns:
            dict: 감지된 감정, 요약, 응답을 포함한 딕셔너리
        """
        # 실제 모델 사용시 아래와 같이 구현
        # inputs = self.tokenizer(text, return_tensors="pt", max_length=512, truncation=True)
        # outputs = self.model.generate(**inputs, max_length=150)
        # summary = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # 현재는 사용자가 선택한 감정을 그대로 사용
        detected_emotion = self.emotion_map.get(mood_id, "알 수 없음")
        
        # 간단한 요약 생성 (실제로는 모델이 생성)
        summary = f"당신의 감정은 '{detected_emotion}'이에요. 입력하신 내용에서 '{detected_emotion}' 감정이 느껴집니다."
        
        # 모드에 따른 응답 생성
        response = self.mode_templates[mode][mood_id] if mode in self.mode_templates and mood_id in self.mode_templates[mode] else "응답을 생성할 수 없습니다."
        
        return {
            "detected_emotion": detected_emotion,
            "summary": summary,
            "response": response
        } 