# Vercel 배포 가이드

이 문서는 Illusion Note API를 Vercel에 배포하는 방법을 설명합니다.

## 사전 준비

1. [GitHub](https://github.com) 계정
2. [Vercel](https://vercel.com) 계정

## 배포 방법

### 1. GitHub에 코드 푸시

프로젝트가 GitHub 저장소에 있는지 확인하세요. 없다면 다음 명령어를 사용하여 저장소를 생성하고 코드를 푸시하세요:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/your-repo-name.git
git push -u origin main
```

### 2. Vercel 대시보드에서 배포

1. [Vercel 대시보드](https://vercel.com/dashboard)에 로그인합니다.
2. "New Project" 버튼을 클릭합니다.
3. GitHub 계정을 연결하고, 배포할 저장소를 선택합니다.
4. 프로젝트 구성:
   - Framework Preset: 자동 감지되거나 "Other"를 선택
   - Root Directory: 그대로 유지
   - Build Command: 비워두기
   - Output Directory: 비워두기

5. 환경 변수 설정 (중요)
   - `OPENAI_API_KEY`: OpenAI API 키
   - 필요한 경우 다른 환경 변수도 추가

6. "Deploy" 버튼을 클릭합니다.

### 3. Vercel CLI로 배포 (선택사항)

로컬에서 직접 배포하고 싶은 경우:

1. Vercel CLI 설치:
```bash
npm i -g vercel
```

2. 로그인:
```bash
vercel login
```

3. 배포:
```bash
vercel
```

4. 프롬프트에 따라 설정을 완료합니다.

## 배포 후 확인

1. 배포가 완료되면 Vercel에서 제공하는 URL로 접속하여 API가 정상적으로 작동하는지 확인합니다.
2. `/health` 엔드포인트에 접속하여 상태를 확인합니다: `https://your-deployment-url.vercel.app/health`

## 주의사항

1. Vercel은 서버리스 환경이므로 스타트업 시간이 있을 수 있습니다.
2. 대규모 모델 로딩이 필요한 경우 콜드 스타트 시간이 길어질 수 있습니다.
3. 환경 변수가 올바르게 설정되었는지 반드시 확인하세요.

## 문제 해결

1. 배포에 실패한 경우 Vercel 대시보드에서 빌드 로그를 확인하세요.
2. 일반적인 오류:
   - 패키지 설치 실패: `requirements-vercel.txt` 파일 확인
   - 환경 변수 미설정: Vercel 프로젝트 설정에서 환경 변수 확인
   - 타임아웃: 빌드 시간이 너무 오래 걸리는 경우 모델 크기 축소 고려 