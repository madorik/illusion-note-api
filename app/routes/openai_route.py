from fastapi import APIRouter, HTTPException, Request, Response
import traceback
import json
from pydantic import BaseModel
from app.models.openai_service import OpenAIService

router = APIRouter(prefix="/api/openai", tags=["openai"])

# 싱글톤 OpenAI 서비스 인스턴스
openai_service = OpenAIService()

class JournalEntry(BaseModel):
    text: str
    mode: str = "chat"  # chat, analyze, summarize
    mood_id: str = "neutral"  # happy, neutral, sad, tired, angry
    response_type: str = "comfort"  # comfort, fact, advice
    context: str = ""

class AnalysisResponse(BaseModel):
    detected_emotion: str
    summary: str
    response: str

@router.post("/generate", response_model=AnalysisResponse)
async def generate_response(journal: JournalEntry, request: Request, response: Response):
    try:
        client_host = request.client.host if request.client else "unknown"
        print(f"[API 요청 받음] /generate - 클라이언트 IP: {client_host}")
        print(f"[요청 파라미터] {json.dumps(journal.dict(), ensure_ascii=False, indent=2)}")
        
        # OpenAI API 호출
        result = openai_service.generate_response(
            text=journal.text,
            mode=journal.mode,
            mood_id=journal.mood_id,
            response_type=journal.response_type,
            context=journal.context
        )
        
        # 응답 유효성 검사 및 로깅
        if result and all(key in result for key in ["detected_emotion", "summary", "response"]):
            print(f"[API 응답 성공] {json.dumps(result, ensure_ascii=False, indent=2)}")
            
            # CORS 헤더 추가
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            
            return result
        else:
            print(f"[API 응답 오류] 필수 필드 누락 - {result}")
            raise ValueError("OpenAI 응답에 필요한 필드가 누락되었습니다")
    except Exception as e:
        error_detail = traceback.format_exc()
        print(f"[API 오류 발생] {e}")
        print(f"[상세 오류 내용]\n{error_detail}")
        
        # CORS 헤더 추가
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        
        # 클라이언트에 기본 응답 제공 (500 에러 대신)
        default_emotion = "보통"  # 기본 감정
        if hasattr(journal, 'mood_id') and journal.mood_id:
            # 사용자가 선택한 감정 사용
            if journal.mood_id == "happy":
                default_emotion = "좋음"
            elif journal.mood_id == "sad":
                default_emotion = "슬픔"
            elif journal.mood_id == "tired":
                default_emotion = "지침"
            elif journal.mood_id == "angry":
                default_emotion = "불안"
        
        error_response = {
            "detected_emotion": default_emotion,
            "summary": "처리 중 오류가 발생했습니다.",
            "response": f"죄송합니다. 요청을 처리하는 중 문제가 발생했습니다: {str(e)}"
        }
        
        print(f"[API 오류 응답] {json.dumps(error_response, ensure_ascii=False, indent=2)}")
        return error_response

@router.options("/generate")
async def options_generate(response: Response):
    # CORS 옵션 요청 처리
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return {} 