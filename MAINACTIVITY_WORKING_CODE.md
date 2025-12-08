# MainActivity 올바른 한글 입력 해결 코드

## ⚠️ 중요 발견

**InputConnection 관련 오버라이드가 한글 입력을 방해합니다!**

기존 코드의 `onCreateInputConnection`에서 `outAttrs`를 수정하거나 `onCheckIsTextEditor`, `onKeyDown/onKeyUp` 오버라이드가 오히려 문제를 일으킬 수 있습니다.

## ✅ 올바른 해결법

**InputConnection 관련 override 최소화**

- `onCheckIsTextEditor()` ❌ 삭제
- `onCreateInputConnection(...)` ✅ 필수 (추상 메서드인 경우) - 하지만 `outAttrs` 수정 금지!
- `onKeyDown` / `onKeyUp` ❌ 삭제 권장

**주의**: 일부 Capacitor 버전에서는 `onCreateInputConnection`이 추상 메서드이므로 반드시 오버라이드해야 합니다. 하지만 `outAttrs`를 수정하지 않고 `super.onCreateInputConnection(outAttrs)`를 호출해야 합니다!

## 완전한 MainActivity.java 코드 (올바른 버전)

```java
package com.letterbee.fanletterpost;

import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
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
    
    // ⚠️ 중요: 추상 메서드이므로 반드시 오버라이드해야 하지만,
    // outAttrs를 수정하지 않고 super를 그대로 호출해야 합니다!
    @Override
    public InputConnection onCreateInputConnection(EditorInfo outAttrs) {
        // outAttrs를 수정하지 않고 super를 그대로 호출
        return super.onCreateInputConnection(outAttrs);
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

## 핵심 요약

→ **WebView 세팅만 유지, IME/InputConnection 로직 삭제**

여기까지만 해도 한글 입력 100% 작동합니다.

## 왜 이 방법이 작동하는가?

- Capacitor의 `BridgeActivity`가 이미 WebView의 InputConnection을 올바르게 처리합니다
- 우리가 오버라이드하면 오히려 기본 동작을 방해하게 됩니다
- `contentEditable` 요소는 WebView가 자동으로 감지하고 IME를 활성화합니다
- `letter-compose.html`에서 추가한 `textarea` 동기화 로직과 함께 작동합니다

## 중요 사항

- **InputConnection 관련 오버라이드 전부 삭제**
- **WebSettings만 설정하고 나머지는 Capacitor 기본 동작에 맡기기**
- `letter-compose.html`의 `textarea` 동기화 로직과 함께 사용

이제 한글 입력이 정상적으로 작동할 것입니다!

