# Gradle 빌드 문제 해결 가이드

## "BUILD FAILED" 오류 해결

### 1단계: 상세 오류 로그 확인

터미널에서 다음 명령으로 상세 로그 확인:

```bash
cd android
./gradlew build --stacktrace
```

또는 더 자세한 정보:

```bash
./gradlew build --stacktrace --info
```

### 2단계: Deprecation 경고 확인

Deprecation 경고는 보통 빌드를 막지 않지만, 확인하려면:

```bash
./gradlew build --warning-mode all
```

## 일반적인 빌드 오류 해결

### 오류 1: "SDK location not found"

**해결:**
```bash
npm run setup:android-sdk
```

또는 `android/local.properties` 파일 수동 생성:

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

### 오류 2: "Gradle version incompatible"

**해결:**
```bash
npm run upgrade:gradle
```

### 오류 3: "Could not resolve all dependencies"

**해결:**
```bash
cd android
./gradlew clean
./gradlew --refresh-dependencies
```

### 오류 4: "Java version incompatible"

**확인:**
```bash
java -version
```

JDK 17-21 사용 권장. Android Studio에서:
1. **File** > **Settings** > **Build Tools** > **Gradle**
2. **Gradle JDK**를 17 이상으로 설정

### 오류 5: "Manifest merger failed"

`android/app/src/main/AndroidManifest.xml` 파일 확인 및 수정 필요.

### 오류 6: "Duplicate class found"

의존성 충돌. `android/app/build.gradle`에서 중복 의존성 제거.

## 빌드 캐시 정리

빌드 문제가 계속되면 캐시를 정리하세요:

```bash
cd android

# Gradle 캐시 정리
./gradlew clean

# 빌드 디렉토리 삭제
rm -rf app/build
rm -rf build

# Gradle 캐시 디렉토리 삭제 (선택사항)
rm -rf .gradle

# 다시 빌드
./gradlew build
```

## Android Studio에서 해결

### 1. 캐시 무효화 및 재시작

1. **File** > **Invalidate Caches / Restart**
2. **Invalidate and Restart** 선택
3. 프로젝트가 다시 로드되면 **File** > **Sync Project with Gradle Files**

### 2. Build Clean

1. **Build** > **Clean Project**
2. **Build** > **Rebuild Project**

### 3. Gradle 동기화

1. **File** > **Sync Project with Gradle Files**
2. 또는 툴바의 동기화 아이콘 클릭

## 단계별 디버깅

### 1. 간단한 빌드 테스트

```bash
cd android
./gradlew tasks
```

성공하면 Gradle 설정은 정상입니다.

### 2. 의존성 확인

```bash
./gradlew dependencies
```

### 3. 빌드 구성 확인

```bash
./gradlew build --dry-run
```

## 로그 파일 확인

Android Studio에서:
1. 하단 **Build** 탭 확인
2. 빨간색 오류 메시지 확인
3. **Logcat** 탭에서 런타임 오류 확인

## 일반적인 해결 순서

1. ✅ Gradle 버전 확인 및 업그레이드
2. ✅ SDK 경로 확인
3. ✅ JDK 버전 확인
4. ✅ 캐시 정리
5. ✅ 프로젝트 동기화
6. ✅ 상세 로그 확인

## 추가 도움

오류 메시지의 전체 내용을 확인하려면:

```bash
cd android
./gradlew build --stacktrace 2>&1 | tee build-error.log
```

그리고 `build-error.log` 파일의 내용을 확인하세요.

