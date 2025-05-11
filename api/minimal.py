from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import openai
from dotenv import load_dotenv
from pydantic import BaseModel

# Load environment variables
try:
    load_dotenv()
except Exception as e:
    print(f"Error loading environment variables: {e}")

# Initialize OpenAI API key from environment variable
api_key = os.environ.get("OPENAI_API_KEY")
if api_key:
    openai.api_key = api_key
else:
    print("WARNING: OPENAI_API_KEY not set")

# OpenAI model to use
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

# Create FastAPI app
app = FastAPI(title="Illusion Note API - Minimal Version")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class TextRequest(BaseModel):
    text: str
    
class PromptRequest(BaseModel):
    prompt: str
    temperature: float = 0.7
    max_tokens: int = 500

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Illusion Note API - Minimal Version for Vercel"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# OpenAI integration endpoint
@app.post("/api/openai/completion")
async def openai_completion(request: PromptRequest):
    try:
        if not openai.api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        response = openai.Completion.create(
            engine=OPENAI_MODEL,
            prompt=request.prompt,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        return {"result": response.choices[0].text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# A simple emotion analyzer endpoint
@app.post("/api/emotion")
async def analyze_emotion(request: TextRequest):
    emotions = {
        "happy": 0.0,
        "sad": 0.0,
        "angry": 0.0,
        "fear": 0.0,
        "surprise": 0.0
    }
    
    text = request.text.lower()
    
    # Very basic rule-based emotion detection
    if any(word in text for word in ["happy", "joy", "glad", "delighted"]):
        emotions["happy"] = 0.8
    if any(word in text for word in ["sad", "unhappy", "depressed", "miserable"]):
        emotions["sad"] = 0.8
    if any(word in text for word in ["angry", "mad", "furious", "outraged"]):
        emotions["angry"] = 0.8
    if any(word in text for word in ["afraid", "scared", "terrified", "fearful"]):
        emotions["fear"] = 0.8
    if any(word in text for word in ["surprised", "shocked", "amazed", "astonished"]):
        emotions["surprise"] = 0.8
    
    return {"emotions": emotions} 