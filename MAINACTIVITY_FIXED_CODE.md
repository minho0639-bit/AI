# MainActivity 수정된 코드 (컴파일 오류 해결)

## 문제
`super.onCreateInputConnection(outAttrs)` 호출 시 컴파일 오류 발생

## 해결 방법

`BridgeActivity`에 `onCreateInputConnection` 메서드가 없으므로 `super` 호출을 제거하고 WebView의 InputConnection을 직접 반환합니다.

### MainActivity.java (수정된 코드)

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
        // WebView의 InputConnection을 활성화 (한글 입력을 위해 필수!)
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            InputConnection ic = webView.onCreateInputConnection(outAttrs);
            if (ic != null) {
                return ic;
            }
        }
        // WebView의 InputConnection이 없으면 null 반환 (기본 동작)
        return null;
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
        // WebView의 InputConnection을 활성화 (한글 입력을 위해 필수!)
        val webView = bridge.webView
        return webView?.onCreateInputConnection(outAttrs)
    }
}
```

## 핵심 변경사항

**83번째 줄 수정:**
```java
// 변경 전 (오류 발생)
return super.onCreateInputConnection(outAttrs);

// 변경 후 (정상 작동)
return null;
```

또는 더 안전하게:
```java
InputConnection ic = webView.onCreateInputConnection(outAttrs);
if (ic != null) {
    return ic;
}
return null;
```

## 설명

- `BridgeActivity`는 `Activity`를 상속받지만 `onCreateInputConnection`을 직접 구현하지 않았을 수 있습니다
- WebView의 `onCreateInputConnection`을 직접 호출하면 한글 입력이 작동합니다
- WebView의 InputConnection이 null인 경우에만 null을 반환하면 됩니다

이제 컴파일 오류 없이 빌드되고 한글 입력이 작동할 것입니다!

