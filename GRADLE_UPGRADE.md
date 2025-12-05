# Gradle 버전 업그레이드 가이드

## 문제
Java 21.0.3과 Gradle 8.0.2가 호환되지 않습니다.

## 해결 방법

### 방법 1: Gradle Wrapper 속성 파일 수정 (권장)

`android/gradle/wrapper/gradle-wrapper.properties` 파일을 열고 다음을 수정:

**변경 전:**
```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.0.2-all.zip
```

**변경 후:**
```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.9-all.zip
```

### 방법 2: 명령줄에서 업그레이드

Android 프로젝트 디렉토리에서:

```bash
cd android
./gradlew wrapper --gradle-version 8.9
```

### 방법 3: build.gradle 파일에서 버전 확인

`android/build.gradle` 파일에서도 Gradle 플러그인 버전을 확인:

```gradle
dependencies {
    classpath 'com.android.tools.build:gradle:8.1.0'  // 또는 최신 버전
}
```

## Gradle과 Java 호환성

| Gradle 버전 | 최소 Java | 최대 Java |
|------------|-----------|-----------|
| 8.0        | 8         | 19        |
| 8.5        | 8         | 19        |
| 8.9        | 8         | 21        |

Java 21을 사용하는 경우 Gradle 8.9 이상이 필요합니다.

## 업그레이드 후

1. **프로젝트 동기화**
   - Android Studio에서 **File** > **Sync Project with Gradle Files**
   - 또는 명령줄: `./gradlew --refresh-dependencies`

2. **빌드 테스트**
   ```bash
   cd android
   ./gradlew clean
   ./gradlew build
   ```

## 문제 해결

### "Gradle sync failed" 오류
- Android Studio를 재시작
- `android/.gradle` 디렉토리 삭제 후 다시 시도
- `./gradlew clean` 실행

### "Unsupported class file major version" 오류
- Java 버전 확인: `java -version`
- JDK 17-21 사용 권장


