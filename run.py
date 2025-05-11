import uvicorn
import os
from dotenv import load_dotenv

if __name__ == "__main__":
    # 먼저 .env 파일 로드
    try:
        load_dotenv(override=True)  # override=True로 설정하여 기존 환경 변수 덮어쓰기
        print(".env 파일에서 환경 변수 로드 완료")
    except Exception as e:
        print(f"환경 변수 로드 오류: {e}")
    
    # 환경 변수 확인
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key:
        masked_key = api_key[:10] + "..." + api_key[-5:] if len(api_key) > 15 else "설정됨"
        print(f"OPENAI_API_KEY: {masked_key}")
    else:
        print("경고: OPENAI_API_KEY가 설정되지 않았습니다. .env 파일에 유효한 API 키를 설정해주세요.")
    
    # 다른 환경 변수 기본값 설정 (없는 경우에만)
    if not os.environ.get("PORT"):
        os.environ["PORT"] = "8000"
    if not os.environ.get("HOST"):
        os.environ["HOST"] = "0.0.0.0"
    if not os.environ.get("MODEL_NAME"):
        os.environ["MODEL_NAME"] = "facebook/bart-large-cnn"
    if not os.environ.get("OPENAI_MODEL"):
        os.environ["OPENAI_MODEL"] = "gpt-4o-mini"
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    print(f"서버 시작: http://{host}:{port}")
    print(f"안드로이드 에뮬레이터에서 접근: http://10.0.2.2:{port}")
    
    uvicorn.run("app.main:app", host=host, port=port, reload=True, 
                app_dir="backend") 