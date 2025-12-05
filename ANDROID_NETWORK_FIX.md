# Android 네트워크 연결 문제 해결

## 문제: "Failed to fetch" 오류

Android 앱에서 외부 서버로 API 요청을 보낼 때 "Failed to fetch" 오류가 발생하는 경우, 다음 설정을 확인하세요.

## 해결 방법

### 1단계: 네트워크 보안 설정 파일 생성

`android/app/src/main/res/xml/network_security_config.xml` 파일을 생성하세요:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- HTTP 연결 허용 (개발 환경) -->
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    
    <!-- 특정 도메인에 대한 설정 -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">b-itsolution.com</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
    </domain-config>
</network-security-config>
```

### 2단계: AndroidManifest.xml 수정

`android/app/src/main/AndroidManifest.xml` 파일을 열고 다음을 확인/추가하세요:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- 인터넷 권한 (이미 있을 수 있음) -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <application
        android:usesCleartextTraffic="true"
        android:networkSecurityConfig="@xml/network_security_config"
        ...>
        ...
    </application>
</manifest>
```

**중요 설정:**
- `android:usesCleartextTraffic="true"` - HTTP 연결 허용
- `android:networkSecurityConfig="@xml/network_security_config"` - 네트워크 보안 설정 파일 참조

### 3단계: 서버 CORS 설정 확인

서버(`server.js`)에서 Capacitor 앱의 origin을 허용해야 합니다:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://b-itsolution.com:3202'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 4단계: Android Studio에서 적용

1. **File** > **Sync Project with Gradle Files**
2. **Build** > **Clean Project**
3. **Build** > **Rebuild Project**
4. 앱 재실행

## 추가 확인 사항

### 인터넷 권한 확인

`AndroidManifest.xml`에 다음 권한이 있는지 확인:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### 로그 확인

Android Studio의 Logcat에서 다음을 확인하세요:

```
필터: "network" 또는 "CORS" 또는 "fetch"
```

### 테스트

앱 실행 후 Logcat에서 다음 로그를 확인:

```
✅ "API 호출: http://b-itsolution.com:3202/api/login"
✅ "API 응답 상태: 200 OK"
```

## 프로덕션 환경 주의사항

**중요**: `cleartextTrafficPermitted="true"`는 개발 환경에서만 사용하세요. 프로덕션에서는 HTTPS를 사용해야 합니다.

프로덕션 설정:

```xml
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

그리고 `capacitor.config.json`에서:

```json
{
  "server": {
    "androidScheme": "https"
  }
}
```

## 문제가 계속되면

1. **서버가 실행 중인지 확인**
   ```bash
   curl http://b-itsolution.com:3202/api/me
   ```

2. **방화벽 확인**
   - Android 기기와 서버가 같은 네트워크에 있는지 확인
   - 서버 방화벽이 포트 3202를 허용하는지 확인

3. **Chrome DevTools로 확인**
   - USB로 기기 연결
   - Chrome에서 `chrome://inspect` 접속
   - 기기 선택 후 **inspect**
   - Network 탭에서 요청 확인

