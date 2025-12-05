# 모바일 앱 디버깅 가이드

## 문제: 로그인 화면으로 가지 않음

모바일 앱이 로그인 화면으로 이동하지 않는 경우, 다음을 확인하세요.

## 1단계: Android Studio Logcat 확인

### Logcat 열기
1. Android Studio 하단의 **Logcat** 탭 클릭
2. 필터에 `chromium` 또는 `WebView` 입력
3. 또는 필터 없이 모든 로그 확인

### 확인할 오류 메시지
- `ERR_FILE_NOT_FOUND` - 파일을 찾을 수 없음
- `ERR_CONNECTION_REFUSED` - 서버 연결 실패
- `Uncaught SyntaxError` - JavaScript 오류
- `Failed to load resource` - 리소스 로드 실패

## 2단계: Chrome DevTools로 디버깅

### Android 기기 연결
1. USB로 Android 기기 연결
2. Chrome 브라우저에서 `chrome://inspect` 접속
3. **Remote devices** 섹션에서 기기 확인
4. 기기 옆의 **inspect** 클릭

### 확인 사항
1. **Console** 탭:
   - 빨간색 오류 메시지 확인
   - `api-config.js` 로드 여부 확인
   - `window.apiConfig` 존재 여부 확인

2. **Network** 탭:
   - `index.html` 로드 여부
   - `js/api-config.js` 로드 여부
   - `styles.css` 로드 여부
   - 이미지 파일 로드 여부

3. **Sources** 탭:
   - 파일들이 제대로 로드되었는지 확인
   - JavaScript 파일에 breakpoint 설정 가능한지 확인

## 3단계: 일반적인 문제 확인

### 문제 1: 스플래시 스크린에서 멈춤

**증상**: 앱이 스플래시 화면에서 멈춤

**원인**: JavaScript 오류로 인해 스플래시 스크린 제거 코드가 실행되지 않음

**해결**:
```javascript
// index.html의 스플래시 스크린 코드 확인
// 1.5초 후 자동으로 숨겨지는지 확인
```

**임시 해결**: 스플래시 스크린을 강제로 제거
```javascript
// index.html에 추가
setTimeout(() => {
  const splash = document.getElementById('splashScreen');
  if (splash) splash.remove();
}, 2000);
```

### 문제 2: api-config.js 로드 실패

**증상**: `window.apiConfig is undefined` 오류

**확인**:
```javascript
// Console에서 확인
console.log('api-config loaded:', typeof window.apiConfig);
```

**해결**:
1. `public/js/api-config.js` 파일이 존재하는지 확인
2. `index.html`에서 스크립트 로드 순서 확인
3. 파일 경로가 올바른지 확인

### 문제 3: 파일 경로 문제

**증상**: 이미지나 CSS 파일을 찾을 수 없음

**확인**:
- `public` 디렉토리에 모든 파일이 복사되었는지 확인
- `npm run build:web` 실행 여부 확인

### 문제 4: 네트워크 오류

**증상**: API 호출 실패

**확인**:
```javascript
// Console에서 확인
console.log('API Base URL:', window.apiConfig?.baseUrl);
```

**해결**:
- `js/api-config.js`의 `PRODUCTION_API_URL` 확인
- 서버가 실행 중인지 확인
- 네트워크 연결 확인

## 4단계: 단계별 확인 체크리스트

### 앱 실행 시 확인
- [ ] 앱이 실행되는가?
- [ ] 스플래시 스크린이 나타나는가?
- [ ] 스플래시 스크린이 사라지는가?
- [ ] 메인 화면이 나타나는가?
- [ ] 로그인 폼이 보이는가?

### JavaScript 오류 확인
- [ ] Logcat에 오류 메시지가 있는가?
- [ ] Chrome DevTools Console에 오류가 있는가?
- [ ] `api-config.js`가 로드되었는가?

### 파일 로드 확인
- [ ] `index.html`이 로드되었는가?
- [ ] `styles.css`가 로드되었는가?
- [ ] `js/api-config.js`가 로드되었는가?
- [ ] 이미지 파일들이 로드되었는가?

## 5단계: 빠른 디버깅 코드 추가

`index.html`에 다음 디버깅 코드를 추가:

```javascript
// index.html의 <script> 태그 시작 부분에 추가
console.log('=== 앱 시작 ===');
console.log('Capacitor:', typeof window.Capacitor);
console.log('api-config:', typeof window.apiConfig);
console.log('Current URL:', window.location.href);

// 페이지 로드 완료 확인
window.addEventListener('load', () => {
  console.log('페이지 로드 완료');
  console.log('스플래시 스크린:', document.getElementById('splashScreen'));
  console.log('로그인 폼:', document.getElementById('login-form'));
});

// 에러 핸들러
window.addEventListener('error', (event) => {
  console.error('전역 오류:', event.error);
});

// Unhandled Promise Rejection
window.addEventListener('unhandledrejection', (event) => {
  console.error('처리되지 않은 Promise 거부:', event.reason);
});
```

## 6단계: 웹 파일 동기화 확인

```bash
# 1. 웹 파일 빌드
npm run build:web

# 2. public 디렉토리 확인
ls -la public/

# 3. Android 프로젝트에 동기화
npm run sync

# 4. Android Studio에서
# File > Sync Project with Gradle Files
```

## 7단계: 최소 테스트 페이지 생성

문제를 격리하기 위해 간단한 테스트 페이지 생성:

`public/test.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <title>테스트</title>
</head>
<body>
  <h1>테스트 페이지</h1>
  <p>이 페이지가 보이면 기본 로딩은 정상입니다.</p>
  <script>
    console.log('테스트 페이지 로드됨');
  </script>
</body>
</html>
```

`capacitor.config.json`에서 시작 페이지를 임시로 변경:
```json
{
  "server": {
    "url": "http://localhost:3000/test.html"
  }
}
```

## 일반적인 해결 방법

### 방법 1: 캐시 정리
```bash
cd android
./gradlew clean
rm -rf app/build
```

### 방법 2: 앱 재설치
Android Studio에서:
1. **Run** > **Edit Configurations**
2. **Uninstall** 옵션 체크
3. 앱 실행

### 방법 3: WebView 캐시 정리
앱에서:
1. 설정 > 앱 > 레터비 > 저장공간
2. **캐시 삭제**

## 추가 디버깅 팁

1. **로깅 추가**: 중요한 단계마다 `console.log()` 추가
2. **에러 핸들러**: 모든 API 호출에 try-catch 추가
3. **네트워크 확인**: 서버가 실제로 접근 가능한지 확인
4. **파일 확인**: `public` 디렉토리에 모든 파일이 있는지 확인

## 다음 단계

위의 체크리스트를 따라 확인한 후, 발견한 오류 메시지를 공유해주시면 더 구체적으로 도와드릴 수 있습니다.

