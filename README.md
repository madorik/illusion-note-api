# Illusion Note API

감정 분석 및 OpenAI 통합을 포함한 노트 서비스를 위한 백엔드 API입니다.

## 주요 기능

- 텍스트 감정 분석 (Transformers 라이브러리 사용)
- OpenAI API 통합
- FastAPI 기반 RESTful API

## 설치 방법

1. 저장소 클론

```bash
git clone https://github.com/madorik/illusion-note-api.git
cd illusion-note-api
```

2. 필요한 패키지 설치

```bash
pip install -r requirements.txt
```

3. 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정합니다:

```
PORT=8000
HOST=0.0.0.0
MODEL_NAME=facebook/bart-large-cnn
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

## 실행 방법

### Windows

```bash
run_backend.bat
```

### 모든 플랫폼

```bash
python run.py
```

서버가 시작되면 다음 주소로 접속할 수 있습니다:
- 로컬: http://localhost:8000
- 안드로이드 에뮬레이터: http://10.0.2.2:8000

## Vercel 배포 방법

1. Vercel CLI 설치 (선택사항)

```bash
npm i -g vercel
```

2. Vercel에 배포

```bash
vercel
```

또는 Vercel 대시보드에서:

1. 새 프로젝트 생성
2. GitHub 저장소 연결
3. 환경 변수 설정 (OPENAI_API_KEY 등)
4. 배포

## API 문서

API 문서는 서버 실행 후 다음 주소에서 확인할 수 있습니다:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 개발 환경

- Python 3.10+
- FastAPI
- Transformers
- PyTorch
- OpenAI 