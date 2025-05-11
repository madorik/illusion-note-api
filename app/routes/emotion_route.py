from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.emotion_analyzer import EmotionAnalyzer

router = APIRouter(prefix="/api", tags=["emotion"])

# 싱글톤 감정 분석기 인스턴스
emotion_analyzer = EmotionAnalyzer()

class JournalEntry(BaseModel):
    text: str
    mood_id: str
    mode: str

class AnalysisResponse(BaseModel):
    detected_emotion: str
    summary: str
    response: str

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_emotion(journal: JournalEntry):
    try:
        # 감정 분석 수행
        result = emotion_analyzer.analyze(
            text=journal.text,
            mood_id=journal.mood_id,
            mode=journal.mode
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 