# Android Studio에서 프로젝트 실행 가이드

## 1단계: 프로젝트 동기화

Android Studio를 열면 자동으로 Gradle 동기화가 시작됩니다. 완료될 때까지 기다리세요.

**수동 동기화가 필요한 경우:**
- 상단 메뉴: **File** > **Sync Project with Gradle Files**
- 또는 툴바의 동기화 아이콘 클릭

## 2단계: SDK 및 빌드 도구 확인

### SDK 확인
1. **File** > **Settings** (또는 **Preferences** on macOS)
2. **Appearance & Behavior** > **System Settings** > **Android SDK**
3. 다음이 설치되어 있는지 확인:
   - ✅ Android SDK Platform 33 이상
   - ✅ Android SDK Build-Tools
   - ✅ Android SDK Command-line Tools

### JDK 확인
1. **File** > **Settings** > **Build, Execution, Deployment** > **Build Tools** > **Gradle**
2. **Gradle JDK**가 **17 이상**으로 설정되어 있는지 확인
   - 없으면 **Download JDK** 클릭하여 설치

## 3단계: 에뮬레이터 또는 실제 기기 준비

### 에뮬레이터 사용 (권장)

1. **Tools** > **Device Manager** 클릭
2. **Create Device** 클릭
3. 원하는 기기 선택 (예: Pixel 5)
4. 시스템 이미지 선택 (API 33 이상 권장)
5. **Finish** 클릭하여 에뮬레이터 생성
6. 에뮬레이터 실행 버튼 클릭

### 실제 Android 기기 사용

1. Android 기기의 **개발자 옵션** 활성화:
   - 설정 > 휴대전화 정보 > 빌드 번호를 7번 탭
2. **USB 디버깅** 활성화:
   - 설정 > 개발자 옵션 > USB 디버깅
3. USB 케이블로 컴퓨터에 연결
4. 기기에서 "USB 디버깅 허용" 확인

## 4단계: 앱 빌드 및 실행

### 방법 1: Android Studio에서 실행 (권장)

1. 상단 툴바에서 **기기 선택 드롭다운** 클릭
   - 에뮬레이터 또는 연결된 기기 선택
2. **Run** 버튼 클릭 (녹색 재생 아이콘)
   - 또는 **Shift + F10** (Windows/Linux)
   - 또는 **Ctrl + R** (macOS)

### 방법 2: 명령줄에서 빌드

터미널에서:

```bash
cd android

# 디버그 APK 빌드
./gradlew assembleDebug

# 릴리스 APK 빌드
./gradlew assembleRelease

# APK 위치
# android/app/build/outputs/apk/debug/app-debug.apk
```

## 5단계: 문제 해결

### "SDK location not found" 오류

`android/local.properties` 파일을 생성하고 SDK 경로 추가:

**Windows:**
```properties
sdk.dir=C\:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
```

**macOS:**
```properties
sdk.dir=/Users/YourUsername/Library/Android/sdk
```

**Linux:**
```properties
sdk.dir=/home/YourUsername/Android/Sdk
```

또는 자동 설정:
```bash
npm run setup:android-sdk
```

### Gradle 동기화 실패

1. **File** > **Invalidate Caches / Restart**
2. **Invalidate and Restart** 선택
3. 프로젝트가 다시 로드되면 **File** > **Sync Project with Gradle Files**

### "Gradle version incompatible" 오류

Gradle 버전 업그레이드:
```bash
npm run upgrade:gradle
```

또는 `android/gradle/wrapper/gradle-wrapper.properties` 파일에서:
```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.9-all.zip
```

### 빌드 오류

1. **Build** > **Clean Project**
2. **Build** > **Rebuild Project**
3. 다시 실행

## 6단계: 웹 파일 수정 후 동기화

웹 파일(HTML, CSS, JS)을 수정한 후:

```bash
# 웹 파일을 public 디렉토리로 빌드
npm run build:web

# Android 프로젝트에 동기화
npm run sync
```

또는 한 번에:
```bash
npm run build
```

그 다음 Android Studio에서:
- **File** > **Sync Project with Gradle Files**
- 앱 다시 실행

## 7단계: 로그 확인

앱 실행 중 문제가 발생하면:

1. Android Studio 하단의 **Logcat** 탭 확인
2. 필터에서 앱 패키지명 선택: `com.letterbee.fanletterpost`
3. 에러 메시지 확인

## 주요 단축키

- **Run**: `Shift + F10` (Windows/Linux) / `Ctrl + R` (macOS)
- **Debug**: `Shift + F9` (Windows/Linux) / `Ctrl + D` (macOS)
- **Sync Project**: `Ctrl + Shift + O` (Windows/Linux) / `Cmd + Shift + O` (macOS)
- **Build**: `Ctrl + F9` (Windows/Linux) / `Cmd + F9` (macOS)

## 다음 단계

앱이 성공적으로 실행되면:
1. 기능 테스트
2. 네트워크 연결 확인 (서버 URL 설정 확인)
3. 프로덕션 빌드 준비

