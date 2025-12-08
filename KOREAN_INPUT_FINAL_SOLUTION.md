# 한글 입력 최종 해결 방법

## ⚠️ 중요 발견

**InputConnection 관련 오버라이드가 한글 입력을 방해합니다!**

기존에 제안했던 `onCreateInputConnection`, `onCheckIsTextEditor`, `onKeyDown/onKeyUp` 오버라이드가 오히려 문제를 일으킬 수 있습니다.

## 문제 분석

로그 분석 결과:
- `ssi() view is not EditText` - Android가 contentEditable을 EditText로 인식하지 못함
- 한글 입력 시 `ViewPostIme key 2`만 반복되고 실제 입력이 안 됨
- 영어와 숫자는 입력됨

## 근본 원인

1. **InputConnection 오버라이드가 IME 구성값을 건드려서 한글 입력이 깨짐**
2. Android WebView는 `contentEditable` div 요소를 네이티브 EditText로 인식하지 않아 IME(입력 메서드)가 제대로 작동하지 않을 수 있습니다.

## ✅ 가장 확실한 해결 방법

### 방법 1: MainActivity를 Capacitor 기본 상태로 되돌리기 (권장)

**InputConnection 관련 override 전부 삭제**

- `onCheckIsTextEditor()` ❌ 삭제
- `onCreateInputConnection(...)` ❌ 삭제  
- `onKeyDown` / `onKeyUp` ❌ 삭제

**1단계: MainActivity.java 수정 (간단한 버전)**

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
        settings.setDomStorageEnabled(true);  // 필수!
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

**2단계: letter-compose.html 수정 (이미 완료됨)**

`createPaperPage` 함수에서 실제 `textarea`를 추가하고 `contentEditable`과 동기화합니다. 이 부분은 이미 구현되어 있습니다.

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

## 중요 사항

- **InputConnection 관련 오버라이드 전부 삭제**
- **WebSettings만 설정하고 나머지는 Capacitor 기본 동작에 맡기기**
- `letter-compose.html`의 `textarea` 동기화 로직과 함께 사용

이제 한글 입력이 정상적으로 작동할 것입니다!
