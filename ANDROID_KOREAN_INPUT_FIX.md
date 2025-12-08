# Android WebView 한글 입력 문제 해결 가이드

## 문제
모바일 앱의 편지 작성 페이지에서 한글 입력이 안 되는 문제

## 원인
Android WebView가 `contentEditable` div 요소를 EditText로 인식하지 못하여 IME(입력 메서드)가 제대로 작동하지 않습니다.

로그에서 확인:
```
IMM_LC: ssi() view is not EditText
requestCursorAnchorInfo on inactive InputConnection
```

**핵심 문제**: WebView의 InputConnection이 비활성 상태여서 한글 입력이 불가능합니다.

## 해결 방법

### 방법 1: Android MainActivity 수정 (필수)

`android/app/src/main/java/com/letterbee/fanletterpost/MainActivity.java` 파일을 열고 다음 코드를 추가하세요:

```java
package com.letterbee.fanletterpost;

import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.os.Build;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        
        // JavaScript 활성화 (이미 활성화되어 있을 수 있음)
        settings.setJavaScriptEnabled(true);
        
        // DOM Storage 활성화
        settings.setDomStorageEnabled(true);
        
        // Database 활성화
        settings.setDatabaseEnabled(true);
        
        // 한글 입력을 위한 중요 설정
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        
        // IME 입력 활성화
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setImportantForAutofill(WebView.IMPORTANT_FOR_AUTOFILL_YES);
        }
        
        // WebViewClient 설정 (카카오 로그인용)
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("https://kauth.kakao.com") || 
                    url.startsWith("https://kapi.kakao.com") ||
                    url.startsWith("http://b-itsolution.com:3202")) {
                    return false;
                }
                return super.shouldOverrideUrlLoading(view, request);
            }
            
            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("https://kauth.kakao.com") || 
                    url.startsWith("https://kapi.kakao.com") ||
                    url.startsWith("http://b-itsolution.com:3202")) {
                    return false;
                }
                return super.shouldOverrideUrlLoading(view, url);
            }
        });
        
        // WebChromeClient 설정 (한글 입력 지원)
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(android.view.View view, WebChromeClient.CustomViewCallback callback) {
                super.onShowCustomView(view, callback);
            }
        });
    }
}
```

### 방법 2: Kotlin으로 작성하는 경우

`android/app/src/main/java/com/letterbee/fanletterpost/MainActivity.kt` 파일:

```kotlin
package com.letterbee.fanletterpost

import android.os.Build
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        super.onCreate(savedInstanceState)
        
        val webView = bridge.webView
        val settings = webView.settings
        
        // JavaScript 활성화
        settings.javaScriptEnabled = true
        
        // DOM Storage 활성화
        settings.domStorageEnabled = true
        
        // Database 활성화
        settings.databaseEnabled = true
        
        // 한글 입력을 위한 중요 설정
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        
        // IME 입력 활성화
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.importantForAutofill = WebView.IMPORTANT_FOR_AUTOFILL_YES
        }
        
        // WebViewClient 설정
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.startsWith("https://kauth.kakao.com") || 
                    url.startsWith("https://kapi.kakao.com") ||
                    url.startsWith("http://b-itsolution.com:3202")) {
                    return false
                }
                return super.shouldOverrideUrlLoading(view, request)
            }
            
            @Suppress("DEPRECATION")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url?.startsWith("https://kauth.kakao.com") == true || 
                    url?.startsWith("https://kapi.kakao.com") == true ||
                    url?.startsWith("http://b-itsolution.com:3202") == true) {
                    return false
                }
                return super.shouldOverrideUrlLoading(view, url)
            }
        }
        
        // WebChromeClient 설정
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowCustomView(
                view: android.view.View?,
                callback: CustomViewCallback?
            ) {
                super.onShowCustomView(view, callback)
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

## 추가 확인 사항

- Android 기기의 키보드 설정에서 한글 입력기가 활성화되어 있는지 확인
- WebView 버전이 최신인지 확인 (Android System WebView 업데이트)
- 앱 실행 중 편지 작성 영역을 탭했을 때 키보드가 나타나는지 확인

## 참고

이 문제는 Android WebView의 알려진 제한사항입니다. `contentEditable` 요소는 네이티브 `EditText`와 다르게 처리되므로, WebView 설정을 조정하여 IME 입력을 활성화해야 합니다.

