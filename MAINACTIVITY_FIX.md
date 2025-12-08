# MainActivity 한글 입력 완전 해결 코드

## 문제
Android WebView가 contentEditable 요소를 EditText로 인식하지 못하여 한글 입력이 안 됨

## 해결 방법

### MainActivity.java (Java 버전)

```java
package com.letterbee.fanletterpost;

import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.os.Build;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import android.view.View;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        
        // JavaScript 활성화
        settings.setJavaScriptEnabled(true);
        
        // DOM Storage 활성화 (한글 입력을 위해 필수!)
        settings.setDomStorageEnabled(true);
        
        // Database 활성화
        settings.setDatabaseEnabled(true);
        
        // 한글 입력을 위한 중요 설정
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        
        // IME 입력 활성화 (Android 8.0 이상)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setImportantForAutofill(WebView.IMPORTANT_FOR_AUTOFILL_YES);
        }
        
        // WebView의 InputConnection을 강제로 활성화하기 위한 커스텀 WebView
        webView.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {
                return false;
            }
        });
        
        // WebViewClient 설정
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
        
        // WebView가 항상 입력 가능하도록 설정
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.requestFocus();
    }
    
    @Override
    public InputConnection onCreateInputConnection(EditorInfo outAttrs) {
        // WebView의 InputConnection을 활성화
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            return webView.onCreateInputConnection(outAttrs);
        }
        return super.onCreateInputConnection(outAttrs);
    }
}
```

### MainActivity.kt (Kotlin 버전)

```kotlin
package com.letterbee.fanletterpost

import android.os.Build
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
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
        
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true  // 한글 입력을 위해 필수!
        settings.databaseEnabled = true
        
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.importantForAutofill = WebView.IMPORTANT_FOR_AUTOFILL_YES
        }
        
        webView.setOnLongClickListener { false }
        
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
        
        webView.isFocusable = true
        webView.isFocusableInTouchMode = true
        webView.requestFocus()
    }
    
    override fun onCreateInputConnection(outAttrs: EditorInfo?): InputConnection? {
        val webView = bridge.webView
        return webView?.onCreateInputConnection(outAttrs) ?: super.onCreateInputConnection(outAttrs)
    }
}
```

## 핵심 변경사항

1. **`onCreateInputConnection` 오버라이드 추가** - WebView의 InputConnection을 강제로 활성화
2. **`webView.setFocusable(true)`** - WebView가 포커스를 받을 수 있도록 설정
3. **`webView.setFocusableInTouchMode(true)`** - 터치 모드에서도 포커스 가능하도록 설정
4. **`webView.requestFocus()`** - 초기 포커스 요청

## 적용 방법

1. Android Studio에서 `MainActivity.java` 또는 `MainActivity.kt` 파일 열기
2. 위 코드로 교체
3. 앱 재빌드 및 실행

## 추가 확인사항

- `settings.setDomStorageEnabled(true)`가 반드시 설정되어 있어야 함
- Android 8.0 이상에서는 `setImportantForAutofill`도 필요

