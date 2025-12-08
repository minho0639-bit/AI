# 한글 입력 최종 해결 방법

## 문제 분석

로그 분석 결과:
- `ssi() view is not EditText` - Android가 contentEditable을 EditText로 인식하지 못함
- 한글 입력 시 `ViewPostIme key 2`만 반복되고 실제 입력이 안 됨
- 영어와 숫자는 입력됨

## 근본 원인

Android WebView는 `contentEditable` div 요소를 네이티브 EditText로 인식하지 않아 IME(입력 메서드)가 제대로 작동하지 않습니다. 이것은 Android WebView의 알려진 제한사항입니다.

## 최종 해결 방법

### 방법 1: MainActivity 수정 (필수) + 실제 textarea 사용

**1단계: MainActivity.java 수정**

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
import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private WebView webView;
    
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);  // 필수!
        settings.setDatabaseEnabled(true);
        
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setImportantForAutofill(WebView.IMPORTANT_FOR_AUTOFILL_YES);
        }
        
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.requestFocus();
        
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
    
    @Override
    public boolean onCheckIsTextEditor() {
        return true;
    }
    
    @Override
    public InputConnection onCreateInputConnection(EditorInfo outAttrs) {
        if (outAttrs != null) {
            outAttrs.inputType = android.view.inputmethod.EditorInfo.TYPE_CLASS_TEXT | 
                                 android.view.inputmethod.EditorInfo.TYPE_TEXT_VARIATION_NORMAL |
                                 android.view.inputmethod.EditorInfo.TYPE_TEXT_FLAG_MULTI_LINE;
            outAttrs.imeOptions = EditorInfo.IME_ACTION_NONE;
        }
        
        if (webView != null) {
            InputConnection ic = webView.onCreateInputConnection(outAttrs);
            if (ic != null) {
                return ic;
            }
        }
        return null;
    }
    
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (webView != null && webView.hasFocus()) {
            return webView.onKeyDown(keyCode, event);
        }
        return super.onKeyDown(keyCode, event);
    }
    
    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        if (webView != null && webView.hasFocus()) {
            return webView.onKeyUp(keyCode, event);
        }
        return super.onKeyUp(keyCode, event);
    }
}
```

**2단계: letter-compose.html 수정**

`createPaperPage` 함수를 수정하여 실제 textarea를 추가하고 contentEditable과 동기화합니다.

```javascript
function createPaperPage(initialContent = null) {
  if (!paperStack) return null;
  const page = document.createElement("div");
  page.className = "letter-paper";
  
  // Android WebView에서 한글 입력을 위해 실제 textarea 사용
  const isAndroid = /Android/i.test(navigator.userAgent);
  let hiddenTextarea = null;
  
  if (isAndroid) {
    hiddenTextarea = document.createElement("textarea");
    hiddenTextarea.className = "hidden-textarea";
    hiddenTextarea.style.cssText = `
      position: absolute;
      opacity: 0;
      pointer-events: none;
      width: 1px;
      height: 1px;
      overflow: hidden;
      z-index: -1;
      left: -9999px;
    `;
    hiddenTextarea.setAttribute("lang", "ko");
    hiddenTextarea.setAttribute("dir", "ltr");
    hiddenTextarea.setAttribute("spellcheck", "true");
    hiddenTextarea.setAttribute("autocorrect", "on");
    hiddenTextarea.setAttribute("autocapitalize", "sentences");
    hiddenTextarea.setAttribute("inputmode", "text");
  }
  
  const body = document.createElement("div");
  body.className = "paper-body";
  body.contentEditable = "true";
  body.dataset.placeholder = getPlaceholderText();
  
  // ... 기존 속성 설정 ...
  
  if (isAndroid && hiddenTextarea) {
    // textarea와 contentEditable 동기화
    hiddenTextarea.addEventListener("input", () => {
      const textareaValue = hiddenTextarea.value;
      const bodyText = getPlainText(body);
      if (textareaValue !== bodyText) {
        // textarea의 내용을 contentEditable에 반영
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(body);
        range.deleteContents();
        const lines = textareaValue.split('\n');
        lines.forEach((line, index) => {
          if (index > 0) {
            const br = document.createElement("br");
            body.appendChild(br);
          }
          if (line) {
            body.appendChild(document.createTextNode(line));
          }
        });
        range.selectNodeContents(body);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        handleBodyInput(body);
      }
    });
    
    body.addEventListener("input", () => {
      const bodyText = getPlainText(body);
      if (hiddenTextarea.value !== bodyText) {
        hiddenTextarea.value = bodyText;
      }
      handleBodyInput(body);
    });
    
    body.addEventListener("focus", () => {
      activeBody = body;
      updateFormatToolbarState();
      setTimeout(() => {
        hiddenTextarea.focus();
      }, 50);
    });
    
    body.addEventListener("click", (e) => {
      activeBody = body;
      updateFormatToolbarState();
      body.focus();
      setTimeout(() => {
        hiddenTextarea.focus();
      }, 50);
    });
    
    page.appendChild(hiddenTextarea);
  }
  
  // ... 나머지 코드 ...
}
```

## 적용 방법

1. **MainActivity.java 수정**: `MAINACTIVITY_WORKING_CODE.md` 파일의 코드 사용 (KeyEvent import 포함)
2. **letter-compose.html 수정**: 위의 textarea 동기화 코드 추가
3. **앱 재빌드 및 실행**

## 중요 사항

- `import android.view.KeyEvent;` 필수!
- `webView`를 클래스 변수로 저장 필수!
- Android에서만 textarea 사용, 다른 플랫폼에서는 기존 방식 유지

이 방법으로 한글 입력이 작동할 것입니다!

