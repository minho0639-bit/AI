# 레터비 하이브리드 앱 빠른 시작 가이드

## 1단계: 의존성 설치

```bash
npm install
```

## 2단계: Capacitor 초기화 (이미 완료됨)

`capacitor.config.json` 파일이 이미 생성되어 있습니다.

## 3단계: 플랫폼 추가

### Android 추가
```bash
npx cap add android
```

### iOS 추가 (macOS만)
```bash
npx cap add ios
```

## 4단계: 웹 파일 빌드

웹 파일을 `public` 디렉토리로 복사:

```bash
npm run build:web
```

## 5단계: 웹 리소스 동기화

```bash
npm run sync
```

또는 빌드와 동기화를 한 번에:

```bash
npm run build
```

## 6단계: 앱 실행

### Android
```bash
npm run open:android
```
Android Studio가 열리면 Run 버튼을 클릭하세요.

### iOS (macOS만)
```bash
npm run open:ios
```
Xcode가 열리면 Run 버튼을 클릭하세요.

## 중요 설정

### 서버 URL 설정

`capacitor.config.json` 파일에서 실제 서버 주소로 변경하세요:

```json
{
  "server": {
    "hostname": "your-actual-server.com"
  }
}
```

또는 `js/api-config.js` 파일에서 `PRODUCTION_API_URL`을 수정하세요.

### 환경 변수

`.env` 파일에 다음 정보를 설정하세요:

```env
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=fanletter_post
SESSION_SECRET=your_secret_key
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_REDIRECT_URI=https://your-server.com/auth/kakao/callback
PORT=3000
```

## 개발 워크플로우

1. 웹 파일 수정
2. `npm run build:web` 실행 (웹 파일을 public 디렉토리로 복사)
3. `npm run sync` 실행 (웹 파일을 네이티브 프로젝트에 복사)
4. 앱에서 테스트

또는 한 번에:
```bash
npm run build  # 빌드 + 동기화
```

## 문제 해결

### Android SDK 설치 필요
Android 앱을 빌드하려면 Android SDK가 필요합니다:
- **자세한 설치 가이드**: `ANDROID_SDK_SETUP.md` 참조
- **빠른 체크리스트**: `ANDROID_SDK_QUICK_CHECK.md` 참조

### Android 빌드 오류
- Android Studio에서 SDK Manager로 최신 SDK 설치 확인
- `android/gradlew` 실행 권한 확인: `chmod +x android/gradlew`
- JDK 17 이상 설치 확인: `java -version`

### Gradle 버전 호환성 오류
Java 21과 Gradle 8.0.2가 호환되지 않는 경우:
```bash
npm run upgrade:gradle
```
또는 `GRADLE_UPGRADE.md` 파일 참조

### iOS 빌드 오류
- CocoaPods 설치: `sudo gem install cocoapods`
- Pod 설치: `cd ios && pod install`

### 네트워크 연결 문제
- `capacitor.config.json`의 `server.allowNavigation`에 필요한 도메인 추가
- CORS 설정 확인

## 추가 정보

자세한 내용은 `APP_BUILD_GUIDE.md`를 참조하세요.

