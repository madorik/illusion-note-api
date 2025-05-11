from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from app.routes import emotion_route, openai_route
import os
from dotenv import load_dotenv

# 안전하게 환경 변수 로드 시도
try:
    load_dotenv()
except Exception as e:
    print(f"환경 변수 로드 중 오류 발생 (무시): {e}")

app = FastAPI(title="Emotion Analysis API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 오리진 허용
    allow_credentials=True,
    allow_methods=["*"],  # 모든 메소드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)

app.include_router(emotion_route.router)
app.include_router(openai_route.router)

@app.get("/")
async def root():
    return {"message": "Hello World from Illusion Note Backend API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("app.main:app", host=host, port=port, reload=True) 