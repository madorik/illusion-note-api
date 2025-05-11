import uvicorn
import os
from dotenv import load_dotenv

if __name__ == "__main__":
    # 환경 변수 직접 설정
    os.environ["PORT"] = "8000"
    os.environ["HOST"] = "0.0.0.0"
    os.environ["MODEL_NAME"] = "facebook/bart-large-cnn"
    os.environ["OPENAI_API_KEY"] = "your-api-key-here"  # Replace with your actual API key
    os.environ["OPENAI_MODEL"] = "gpt-4o-mini"
    
    # dotenv도 로드 (존재하는 경우에만 작동)
    try:
        load_dotenv()
    except:
        pass
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    print(f"서버 시작: http://{host}:{port}")
    print(f"안드로이드 에뮬레이터에서 접근: http://10.0.2.2:{port}")
    
    uvicorn.run("app.main:app", host=host, port=port, reload=True, 
                app_dir="backend") 