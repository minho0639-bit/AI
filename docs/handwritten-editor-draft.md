## 손편지 에디터 초안

### 제품 방향
- **목표**: 온라인에서도 손글씨 감성을 살린 팬레터·감사편지를 작성하고 공유할 수 있는 가벼운 웹 에디터
- **핵심 가치**: 따뜻한 종이 질감, 잉크 번짐 느낌, 간단한 애니메이션으로 실제 손편지 작성 경험 재현

### 사용자 시나리오
1. 방문 즉시 빈 편지지와 펜이 보이며, 사용자는 바로 타이핑을 시작
2. 우측 패널에서 용지 질감, 선 색상, 잉크 색상, 필기체 폰트 등을 조합
3. 작성 내용은 자동 저장되며, PDF/이미지로 내보내거나 공유 링크 발급

### 주요 기능
- **편지지 캔버스**: 가로/세로 모드, 여백/줄 간격 조절, 배경 질감 선택(크래프트/코튼/빈티지 등)
- **타이포·펜 옵션**: 3~5개 필기체 폰트, 잉크 색(네이비/버건디/포레스트), 펜 굵기, 잉크 번짐 레벨
- **장식 요소**: 스탬프, 스티커, 구석 장식, 직접 드래그하여 배치
- **미리보기·내보내기**: 전체 화면 미리보기, PNG/PDF export, 공유용 magic link 생성(초기엔 PNG 다운로드만)
- **감정 태그**: 작성 완료 후 한 단어 감정 태그 입력 → 공유 썸네일 구성에 활용

### 기술 스택 제안
- **프론트엔드**: Vite + React + TypeScript (빠른 반복 개발)
- **스타일**: TailwindCSS + CSS custom properties (테마 전환 용이)
- **상태 관리**: Zustand로 편집 옵션/내용/장식 상태 관리
- **캔버스 렌더링**: DOM + SVG를 기준으로 하고, export 시 html2canvas/Canvas API 사용

### 페이지/컴포넌트 구성 (초기 단일 페이지)
1. `LetterCanvas` – 편지지를 표현, 유저 입력 textarea + 미리보기 레이어
2. `Toolbar` – 폰트/색/배경 선택, 장식 갤러리
3. `StickerLayer` – 장식 drag & drop
4. `PreviewModal` – 전체 화면 미리보기 및 export 버튼
5. `AutosaveIndicator` – 로컬 스토리지 저장 상태 표시

### 데이터 구조 개략
```ts
type LetterState = {
  content: string;
  paper: { texture: PaperTexture; color: string; lineGap: number; margin: number };
  pen: { font: FontOption; inkColor: string; weight: number; bleed: number };
  decor: StickerInstance[];
  meta: { title: string; moodTag: MoodTag; updatedAt: number };
};
```

### 4주 로드맵(초안)
1. **Week1**: UI 스켈레톤 + 기본 타이핑/옵션 조절
2. **Week2**: 장식 레이어 + autosave, 반응형 스타일
3. **Week3**: Export(PNG/PDF) + 공유 썸네일
4. **Week4**: 감정 태그 흐름, 모션/사운드 폴리싱

### 추가 아이디어
- 작성 글자 수에 따라 잉크 농도/페이드 효과
- 배경 음악(레코드 잡음) 온/오프
- 감정 태그 기반 추천 편지지 테마

### 다음 단계
1. Figma 와이어프레임 → 색감, 폰트, 장식 자산 확정
2. 컴포넌트별 Issue/Ticket 작성
3. 프로토타입 배포 후 유저 테스트(편지 작성 완료율, 내보내기 사용률 추적)
