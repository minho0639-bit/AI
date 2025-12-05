# API 설정 가이드 - 모바일 앱 서버 연결

## 문제 해결

모바일 앱에서 "Unexpected token '<', "<!DOCTYPE "... is not valid JSON" 오류가 발생하는 경우, 서버 URL이 제대로 설정되지 않았을 가능성이 높습니다.

## 설정 방법

### 1단계: 실제 서버 URL 확인

실제 백엔드 서버의 주소를 확인하세요:
- 예: `https://api.letterbee.app`
- 예: `https://your-server.com`
- 예: `http://192.168.1.100:3000` (로컬 네트워크)

### 2단계: js/api-config.js 파일 수정

`js/api-config.js` 파일을 열고 `PRODUCTION_API_URL`을 실제 서버 주소로 변경:

```javascript
// 변경 전
const PRODUCTION_API_URL = 'https://your-api-server.com';

// 변경 후 (실제 서버 주소로)
const PRODUCTION_API_URL = 'https://api.letterbee.app';
```

### 3단계: capacitor.config.json 파일 수정

`capacitor.config.json` 파일의 `server.hostname`을 실제 서버 도메인으로 변경:

```json
{
  "server": {
    "hostname": "api.letterbee.app",  // 실제 서버 도메인
    "androidScheme": "https",
    "iosScheme": "https"
  }
}
```

### 4단계: 웹 파일 빌드 및 동기화

변경사항을 적용하려면:

```bash
# 웹 파일 빌드
npm run build:web

# Android 프로젝트에 동기화
npm run sync
```

## 테스트

### 개발 환경 (로컬 서버)

로컬 개발 서버를 사용하는 경우:

```javascript
// js/api-config.js
const DEVELOPMENT_API_URL = 'http://192.168.1.100:3000';  // 로컬 IP 주소
```

**주의**: 모바일 기기에서 `localhost`는 작동하지 않습니다. 컴퓨터의 로컬 네트워크 IP 주소를 사용하세요.

### 프로덕션 환경

실제 배포 서버를 사용하는 경우:

```javascript
// js/api-config.js
const PRODUCTION_API_URL = 'https://api.letterbee.app';
```

## 디버깅

### 콘솔에서 API URL 확인

모바일 앱에서 다음을 실행:

```javascript
console.log('API Base URL:', window.apiConfig?.baseUrl);
```

### 네트워크 요청 확인

Android Studio의 Logcat에서:
1. 필터에 `api` 또는 `fetch` 입력
2. 네트워크 요청 URL 확인
3. 응답 내용 확인

### Chrome DevTools 사용 (Android)

1. USB로 Android 기기 연결
2. Chrome에서 `chrome://inspect` 접속
3. 기기 선택 후 **inspect** 클릭
4. Network 탭에서 API 요청 확인

## 일반적인 문제

### 문제 1: CORS 오류

서버에서 CORS를 허용해야 합니다:

```javascript
// server.js
app.use(cors({
  origin: ['capacitor://localhost', 'ionic://localhost', 'http://localhost'],
  credentials: true
}));
```

### 문제 2: HTTPS/HTTP 혼용

모바일 앱은 HTTPS를 권장합니다. HTTP를 사용하려면:

```json
// capacitor.config.json
{
  "server": {
    "androidScheme": "http",  // 개발 환경에서만
    "iosScheme": "http"
  }
}
```

### 문제 3: 세션 쿠키 문제

모바일 앱에서는 세션 쿠키가 제대로 작동하지 않을 수 있습니다. 대신 토큰 기반 인증을 고려하세요.

## 확인 체크리스트

- [ ] `js/api-config.js`의 `PRODUCTION_API_URL`이 실제 서버 주소로 설정됨
- [ ] `capacitor.config.json`의 `server.hostname`이 실제 서버 도메인으로 설정됨
- [ ] `npm run build:web` 실행 완료
- [ ] `npm run sync` 실행 완료
- [ ] 앱 재빌드 및 재설치 완료
- [ ] 서버가 실행 중이고 접근 가능함
- [ ] 서버 CORS 설정이 올바름

