from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

app = FastAPI(title="Illusion Note API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Illusion Note API - Welcome!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Vercel 서버리스 함수 핸들러
handler = Mangum(app) 