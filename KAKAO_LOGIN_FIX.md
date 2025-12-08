# 카카오 로그인 외부 브라우저 문제 해결 가이드

## 문제
카카오 로그인 시 앱 내에서 로그인이 안되고 새로운 브라우저가 열리는 문제

## 원인
Android WebView가 외부 URL(`https://kauth.kakao.com`)로 리다이렉트할 때 기본 브라우저로 열리는 것이 기본 동작입니다.

## 해결 방법

### 방법 1: Android MainActivity 수정 (권장)

`android/app/src/main/java/com/letterbee/fanletterpost/MainActivity.java` 파일을 열고 다음 코드를 추가하세요:

```java
package com.letterbee.fanletterpost;

import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.os.Build;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // WebView가 외부 브라우저로 열리지 않도록 설정
        WebView webView = getBridge().getWebView();
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                
                // 카카오 로그인 도메인은 WebView 내에서 처리
                if (url.startsWith("https://kauth.kakao.com") || 
                    url.startsWith("https://kapi.kakao.com") ||
                    url.startsWith("http://b-itsolution.com:3202")) {
                    return false; // WebView 내에서 처리
                }
                
                // 다른 외부 URL은 기본 브라우저로 열기
                return super.shouldOverrideUrlLoading(view, request);
            }
            
            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Android 5.0 이하 호환성
                if (url.startsWith("https://kauth.kakao.com") || 
                    url.startsWith("https://kapi.kakao.com") ||
                    url.startsWith("http://b-itsolution.com:3202")) {
                    return false; // WebView 내에서 처리
                }
                return super.shouldOverrideUrlLoading(view, url);
            }
        });
    }
}
```

### 방법 2: Kotlin으로 작성하는 경우

`android/app/src/main/java/com/letterbee/fanletterpost/MainActivity.kt` 파일:

```kotlin
package com.letterbee.fanletterpost

import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebResourceRequest
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        super.onCreate(savedInstanceState)
        
        // WebView가 외부 브라우저로 열리지 않도록 설정
        bridge.webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                
                // 카카오 로그인 도메인은 WebView 내에서 처리
                if (url.startsWith("https://kauth.kakao.com") || 
                    url.startsWith("https://kapi.kakao.com") ||
                    url.startsWith("http://b-itsolution.com:3202")) {
                    return false // WebView 내에서 처리
                }
                
                return super.shouldOverrideUrlLoading(view, request)
            }
            
            @Suppress("DEPRECATION")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                // Android 5.0 이하 호환성
                if (url?.startsWith("https://kauth.kakao.com") == true || 
                    url.startsWith("https://kapi.kakao.com") == true ||
                    url.startsWith("http://b-itsolution.com:3202") == true) {
                    return false // WebView 내에서 처리
                }
                return super.shouldOverrideUrlLoading(view, url)
            }
        }
    }
}
```

## 적용 방법

1. Android Studio에서 프로젝트 열기:
   ```bash
   npm run open:android
   ```

2. `MainActivity.java` 또는 `MainActivity.kt` 파일 찾기:
   - 경로: `android/app/src/main/java/com/letterbee/fanletterpost/MainActivity.*`

3. 위의 코드를 추가하거나 수정

4. 앱 재빌드 및 실행

## 확인 사항

- `capacitor.config.json`의 `allowNavigation`에 카카오 도메인이 포함되어 있는지 확인
- AndroidManifest.xml에 인터넷 권한이 있는지 확인
- 서버 CORS 설정이 올바른지 확인

## 추가 참고

- Capacitor는 기본적으로 `allowNavigation`에 추가된 도메인을 WebView 내에서 처리합니다
- 하지만 일부 Android 버전에서는 여전히 외부 브라우저로 열릴 수 있습니다
- 위의 MainActivity 수정으로 강제로 WebView 내에서 처리하도록 할 수 있습니다

