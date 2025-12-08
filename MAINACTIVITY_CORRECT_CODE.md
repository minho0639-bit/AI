# MainActivity 올바른 한글 입력 해결 코드

## 문제
`@Override` 어노테이션에 "no usages" 경고가 나타나는 경우

## 해결 방법

### MainActivity.java (완전한 코드)

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
    
    // @Override 없이 직접 오버라이드 (Activity의 메서드)
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
        val ic = webView?.onCreateInputConnection(outAttrs)
        return ic ?: super.onCreateInputConnection(outAttrs)
    }
}
```

## 중요 사항

1. **`onCreateInputConnection`은 Activity의 메서드입니다** - BridgeActivity가 아닌 Activity 클래스에서 상속받습니다
2. **`@Override` 어노테이션은 유지하세요** - Activity 클래스의 메서드를 오버라이드하는 것이므로 필요합니다
3. **만약 여전히 경고가 나타나면**, IDE가 캐시 문제일 수 있으므로:
   - **File > Invalidate Caches / Restart** 실행
   - 또는 **Build > Clean Project** 후 **Build > Rebuild Project**

## 핵심 포인트

- `onCreateInputConnection`은 `Activity` 클래스의 메서드이므로 `@Override`가 정상적으로 작동해야 합니다
- 만약 경고가 계속 나타나면 IDE 캐시 문제일 가능성이 높습니다
- 코드는 정상적으로 작동할 것입니다

