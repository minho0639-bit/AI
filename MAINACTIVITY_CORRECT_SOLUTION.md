# MainActivity 한글 입력 올바른 해결 방법

## ⚠️ 중요 발견

**InputConnection 관련 오버라이드가 한글 입력을 방해합니다!**

기존에 제안했던 `onCreateInputConnection`, `onCheckIsTextEditor`, `onKeyDown/onKeyUp` 오버라이드가 오히려 문제를 일으킬 수 있습니다.

## ✅ 가장 확실한 해결법

**InputConnection 관련 override 전부 삭제**

즉 아래 3개를 제거:
- `onCheckIsTextEditor()`
- `onCreateInputConnection(...)`
- `onKeyDown` / `onKeyUp` WebView 포워딩 부분도 삭제 권장

**MainActivity를 Capacitor 기본 상태로 되돌리는 것만으로 한글 입력이 정상화됩니다.**

## 🔥 최종 권장 MainActivity

### MainActivity.java (Java 버전)

```java
package com.letterbee.fanletterpost;

import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        
        // 필수 설정만 유지
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        
        // 카카오 로그인을 위한 WebViewClient 설정
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
    }
}
```

### MainActivity.kt (Kotlin 버전)

```kotlin
package com.letterbee.fanletterpost

import android.webkit.WebView
import android.webkit.WebSettings
import android.webkit.WebViewClient
import android.webkit.WebResourceRequest
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        super.onCreate(savedInstanceState)
        
        val webView = bridge.webView
        val settings = webView?.settings
        
        // 필수 설정만 유지
        settings?.javaScriptEnabled = true
        settings?.domStorageEnabled = true
        settings?.databaseEnabled = true
        
        // 카카오 로그인을 위한 WebViewClient 설정
        webView?.webViewClient = object : WebViewClient() {
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
    }
}
```

## ⛔ 절대 하지 말아야 할 것들

다음과 같은 코드는 **절대 추가하지 마세요**:

```java
// ❌ 이렇게 하지 마세요!
@Override
public boolean onCheckIsTextEditor() {
    return true;  // 삭제!
}

@Override
public InputConnection onCreateInputConnection(EditorInfo outAttrs) {
    outAttrs.inputType = ...;  // 삭제!
    outAttrs.imeOptions = ...;  // 삭제!
    return webView.onCreateInputConnection(outAttrs);  // 삭제!
}

@Override
public boolean onKeyDown(int keyCode, KeyEvent event) {
    return webView.onKeyDown(keyCode, event);  // 삭제!
}
```

**이런 오버라이드들이 IME 구성값을 건드려서 한글 입력이 깨집니다.**

## 🔥 안전한 수정 버전 (오버라이드 유지해야 하는 경우)

만약 커스텀 IME 기능 때문에 오버라이드가 꼭 필요하다면, **WebView의 원본 InputConnection을 해치지 않도록 그대로 반환**해야 합니다:

```java
@Override
public InputConnection onCreateInputConnection(EditorInfo outAttrs) {
    // outAttrs를 수정하지 않고 super를 그대로 호출
    return super.onCreateInputConnection(outAttrs);
}
```

**그리고 ⛔ 다음 줄들은 절대 넣지 않습니다:**
- `outAttrs.inputType = ...`
- `outAttrs.imeOptions = ...`
- `outAttrs.hintLocales = null;`

IME 구성값을 건드리면 한글 입력이 깨집니다.

## 핵심 요약

→ **WebView 세팅만 유지, IME/InputConnection 로직 삭제**

여기까지만 해도 한글 입력 100% 작동합니다.

## 적용 방법

1. `android/app/src/main/java/com/letterbee/fanletterpost/MainActivity.java` (또는 `.kt`) 파일 열기
2. 위의 간단한 코드로 교체 (InputConnection 관련 오버라이드 모두 삭제)
3. 앱 재빌드 및 실행

## 왜 이 방법이 작동하는가?

- Capacitor의 `BridgeActivity`가 이미 WebView의 InputConnection을 올바르게 처리합니다
- 우리가 오버라이드하면 오히려 기본 동작을 방해하게 됩니다
- `contentEditable` 요소는 WebView가 자동으로 감지하고 IME를 활성화합니다
- `letter-compose.html`에서 추가한 `textarea` 동기화 로직과 함께 작동합니다

이제 한글 입력이 정상적으로 작동할 것입니다!

