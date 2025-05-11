from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import openai
from pydantic import BaseModel

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
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return {"error": "OpenAI API key not configured"}
        
        openai.api_key = api_key
        model_name = os.environ.get("OPENAI_MODEL", "gpt-3.5-turbo")
        
        try:
            # Try using newer API format
            client = openai.OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "user", "content": request.prompt}
                ],
                temperature=request.temperature,
                max_tokens=request.max_tokens
            )
            return {"result": response.choices[0].message.content}
        except Exception as e1:
            # Fall back to older Completion API if needed
            try:
                response = openai.Completion.create(
                    engine=model_name,
                    prompt=request.prompt,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens
                )
                return {"result": response.choices[0].text.strip()}
            except Exception as e2:
                return {"error": f"OpenAI API error: {str(e1)} / {str(e2)}"}
    except Exception as e:
        return {"error": f"General error: {str(e)}"}

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

handler = app 