# Android SDK 경로 가이드

## 일반적인 Android SDK 경로

### Windows
```
C:\Users\YourUsername\AppData\Local\Android\Sdk
```

### macOS
```
/Users/YourUsername/Library/Android/sdk
```

또는
```
~/Library/Android/sdk
```

### Linux
```
/home/YourUsername/Android/Sdk
```

또는
```
~/Android/Sdk
```

## 현재 시스템에서 경로 확인 방법

### Windows (PowerShell)
```powershell
# 환경 변수 확인
$env:ANDROID_HOME

# 또는 Android Studio 기본 경로 확인
$env:LOCALAPPDATA + "\Android\Sdk"
```

### Windows (CMD)
```cmd
echo %ANDROID_HOME%
echo %LOCALAPPDATA%\Android\Sdk
```

### macOS / Linux
```bash
# 환경 변수 확인
echo $ANDROID_HOME

# Android Studio 기본 경로 확인 (macOS)
echo ~/Library/Android/sdk

# 또는
ls -la ~/Library/Android/sdk
```

## Android Studio에서 경로 확인

1. **Android Studio 실행**
2. **File** > **Settings** (또는 **Preferences** on macOS)
3. **Appearance & Behavior** > **System Settings** > **Android SDK**
4. **Android SDK Location** 필드에 경로가 표시됩니다

## Android 프로젝트에 경로 설정

Android 프로젝트가 SDK 경로를 찾지 못하는 경우, `android/local.properties` 파일을 생성해야 합니다.

### Windows 예시
```properties
sdk.dir=C\:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
```

### macOS 예시
```properties
sdk.dir=/Users/YourUsername/Library/Android/sdk
```

### Linux 예시
```properties
sdk.dir=/home/YourUsername/Android/Sdk
```

## 경로 설정 스크립트

다음 스크립트를 실행하여 자동으로 경로를 찾고 설정할 수 있습니다:

```bash
# Windows PowerShell
node set-android-sdk-path.js

# macOS/Linux
node set-android-sdk-path.js
```

