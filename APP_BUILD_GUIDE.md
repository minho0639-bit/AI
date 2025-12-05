# 레터비 하이브리드 앱 빌드 가이드

이 문서는 레터비 프로젝트를 Android 및 iOS 하이브리드 앱으로 빌드하는 방법을 안내합니다.

## 사전 요구사항

### 공통
- Node.js 18 이상
- npm 또는 yarn

### Android 빌드
- Android Studio (최신 버전)
- JDK 17 이상
- Android SDK (API Level 33 이상)

### iOS 빌드 (macOS만 가능)
- Xcode 14 이상
- CocoaPods
- macOS 운영체제

## 설치 단계

### 1. 의존성 설치

```bash
npm install
```

### 2. Capacitor 초기화

```bash
npx cap init
```

이미 `capacitor.config.json` 파일이 생성되어 있으므로, 기존 설정을 사용합니다.

### 3. Android 플랫폼 추가

```bash
npx cap add android
```

### 4. iOS 플랫폼 추가 (macOS만)

```bash
npx cap add ios
```

### 5. 웹 리소스 동기화

웹 파일을 네이티브 프로젝트에 복사:

```bash
npm run sync
```

또는

```bash
npx cap sync
```

## 빌드 및 실행

### Android

1. Android Studio에서 프로젝트 열기:
```bash
npm run open:android
```

2. Android Studio에서:
   - 기기 또는 에뮬레이터 선택
   - Run 버튼 클릭 또는 `Shift + F10`

또는 명령줄에서:
```bash
cd android
./gradlew assembleDebug
```

### iOS (macOS만)

1. Xcode에서 프로젝트 열기:
```bash
npm run open:ios
```

2. Xcode에서:
   - 시뮬레이터 또는 실제 기기 선택
   - Run 버튼 클릭 또는 `Cmd + R`

## 개발 워크플로우

### 웹 코드 수정 후

웹 파일을 수정한 후에는 반드시 동기화해야 합니다:

```bash
npm run sync
```

### 네이티브 코드 수정 후

Android나 iOS 네이티브 코드를 수정한 경우, 웹 리소스를 다시 복사:

```bash
npm run copy
```

## 주요 설정 파일

### capacitor.config.json
- 앱 ID: `com.letterbee.fanletterpost`
- 앱 이름: `레터비`
- 웹 디렉토리: `.` (현재 디렉토리)

### 서버 설정
앱이 백엔드 서버에 연결되도록 `capacitor.config.json`의 `server.hostname`을 실제 서버 주소로 변경하세요.

## 프로덕션 빌드

### Android APK/AAB 생성

```bash
cd android
./gradlew bundleRelease  # AAB 파일 (Play Store용)
./gradlew assembleRelease  # APK 파일
```

### iOS 앱 스토어 빌드

Xcode에서:
1. Product > Archive
2. Distribute App 선택
3. App Store Connect에 업로드

## 문제 해결

### Android 빌드 오류
- `gradlew` 실행 권한 확인: `chmod +x android/gradlew`
- Android SDK 경로 확인
- JDK 버전 확인 (17 이상 필요)

### iOS 빌드 오류
- CocoaPods 설치: `sudo gem install cocoapods`
- Pod 설치: `cd ios && pod install`
- Xcode 버전 확인 (14 이상)

### 네트워크 연결 문제
- `capacitor.config.json`의 `server.allowNavigation`에 필요한 도메인 추가
- CORS 설정 확인

## 추가 플러그인

필요한 경우 다음 플러그인을 추가로 설치할 수 있습니다:

```bash
npm install @capacitor/camera
npm install @capacitor/filesystem
npm install @capacitor/share
npx cap sync
```

## 참고 자료

- [Capacitor 공식 문서](https://capacitorjs.com/docs)
- [Android 개발 가이드](https://developer.android.com/)
- [iOS 개발 가이드](https://developer.apple.com/documentation/)

