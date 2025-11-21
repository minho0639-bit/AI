# 온라인으로 마음을 담아 편지를 직접 전달하는 서비스 팬레터포스트

## 손편지 에디터 초안
- `docs/handwritten-editor-draft.md`: 제품 방향, 기능 목록, 4주 로드맵을 정리한 개념 문서
- `handwritten-editor/`: HTML/CSS/JS만으로 구성한 프로토타입. 브라우저에서 `index.html`을 열면 손편지 작성, 용지·잉크·폰트 변경, 스티커 삽입, 간단 미리보기를 체험할 수 있습니다.

### 실행 방법
```bash
cd handwritten-editor
python3 -m http.server 4173
```
이후 브라우저에서 `http://localhost:4173` 접속

### 다음 확장 아이디어
- html2canvas 연동으로 PNG/PDF 내보내기
- 장식 drag & drop, 감정 태그 UI, 공유 링크 발급 등
