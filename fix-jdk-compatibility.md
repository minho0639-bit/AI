# JDK 호환성 문제 해결 가이드

## 문제 원인

Java 21과 Android SDK의 `jlink` 도구 간 호환성 문제입니다.

## 해결 방법

### 방법 1: Gradle JDK를 17로 변경 (권장)

Android Studio에서:

1. **File** > **Settings** (또는 **Preferences** on macOS)
2. **Build, Execution, Deployment** > **Build Tools** > **Gradle**
3. **Gradle JDK** 드롭다운에서:
   - **Download JDK** 클릭
   - **Version**: 17 선택
   - **Vendor**: Adoptium (Eclipse Temurin) 또는 Oracle 선택
   - **Download** 클릭
4. 다운로드된 JDK 17 선택
5. **Apply** > **OK**
6. **File** > **Sync Project with Gradle Files**

### 방법 2: gradle.properties 파일에 JDK 경로 지정

`android/gradle.properties` 파일을 열고 다음 추가:

```properties
# JDK 17 경로 지정 (시스템에 맞게 수정)
org.gradle.java.home=/path/to/jdk-17

# 또는 Android Studio의 JDK 사용
org.gradle.java.home=/usr/local/android-studio/jbr
```

### 방법 3: 환경 변수 설정

터미널에서:

```bash
# JDK 17 경로 확인
which java
java -version

# JDK 17이 설치되어 있다면
export JAVA_HOME=/path/to/jdk-17
export PATH=$JAVA_HOME/bin:$PATH
```

### 방법 4: Gradle 캐시 정리

```bash
cd android

# Gradle 캐시 정리
rm -rf ~/.gradle/caches/8.9/transforms

# 또는 전체 캐시 정리
rm -rf ~/.gradle/caches

# 빌드 디렉토리 정리
./gradlew clean

# 다시 빌드
./gradlew build
```

## Android Studio에서 JDK 확인 및 변경

### 현재 JDK 확인

1. **File** > **Project Structure** (또는 **Ctrl+Alt+Shift+S**)
2. **SDK Location** 탭 확인
3. **JDK location** 확인

### JDK 변경

1. **File** > **Settings** > **Build Tools** > **Gradle**
2. **Gradle JDK** 변경
3. 프로젝트 동기화

## 권장 설정

- **Gradle JDK**: 17 (LTS)
- **Gradle 버전**: 8.9
- **Android Gradle Plugin**: 8.1.0 이상
- **Compile SDK**: 33 이상

## 빠른 해결 스크립트

다음 명령을 순서대로 실행:

```bash
cd android

# 1. 캐시 정리
rm -rf ~/.gradle/caches/8.9/transforms
./gradlew clean

# 2. Gradle 동기화
./gradlew --refresh-dependencies

# 3. 다시 빌드
./gradlew build
```

## Android Studio에서 해결

1. **File** > **Invalidate Caches / Restart**
2. **Invalidate and Restart**
3. **File** > **Settings** > **Build Tools** > **Gradle**
4. **Gradle JDK**를 17로 변경
5. **File** > **Sync Project with Gradle Files**
6. **Build** > **Clean Project**
7. **Build** > **Rebuild Project**

