# Android SDK 빠른 체크리스트

## 빠른 확인

터미널에서 다음 명령으로 현재 상태를 확인하세요:

```bash
# Java 버전 확인 (JDK 17 이상 필요)
java -version

# Android SDK 경로 확인
echo $ANDROID_HOME  # macOS/Linux
echo %ANDROID_HOME%  # Windows CMD
$env:ANDROID_HOME   # Windows PowerShell

# ADB 확인
adb version

# Android SDK Manager 확인
sdkmanager --list
```

## 설치 상태 확인

### ✅ Java (JDK)
- [ ] Java가 설치되어 있음
- [ ] 버전이 17 이상임

### ✅ Android SDK
- [ ] Android Studio가 설치되어 있음
- [ ] ANDROID_HOME 환경 변수가 설정되어 있음
- [ ] Android SDK Platform 33 이상이 설치되어 있음
- [ ] Android SDK Build-Tools가 설치되어 있음

### ✅ 환경 변수
- [ ] ANDROID_HOME이 설정되어 있음
- [ ] PATH에 platform-tools가 포함되어 있음

## 빠른 설치 (Android Studio 사용)

1. **Android Studio 다운로드**
   - https://developer.android.com/studio

2. **설치 및 SDK 구성 요소 설치**
   - Android Studio 실행
   - Tools > SDK Manager
   - Android SDK Platform 33 설치
   - Android SDK Build-Tools 설치

3. **환경 변수 설정**
   - Windows: 시스템 속성 > 환경 변수
   - macOS/Linux: ~/.bashrc 또는 ~/.zshrc에 추가

## Android 프로젝트 빌드 테스트

```bash
cd android
./gradlew tasks
```

성공하면 Android SDK가 제대로 설정된 것입니다!

자세한 내용은 `ANDROID_SDK_SETUP.md`를 참조하세요.

