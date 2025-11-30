# 팬레터포스트 웹

팬레터포스트는 사용자가 편지를 작성하고 디지털 인쇄를 통해 실제 편지로 전달받을 수 있는 서비스입니다.

## 프로젝트 구조

### 프론트엔드
- **정적 페이지**: HTML, CSS, JavaScript로 구성된 클라이언트 사이드 애플리케이션
  - `index.html`: 메인 홈페이지
  - `letter.html`, `letter-target.html`, `letter-stationery.html`, `letter-compose.html`: 편지 작성 플로우
  - `letter-payment.html`: 결제 및 미리보기 페이지
  - `profile.html`: 사용자 프로필 및 주문 내역
  - `signup.html`: 회원가입 페이지
  - `admin.html`: 관리자 대시보드

### 백엔드
- **Express.js 서버** (`server.js`): RESTful API 제공
- **MySQL 데이터베이스**: 사용자, 주문, 편지, 결제, 배송 정보 저장

## 주요 기능

### 사용자 기능
1. **편지 작성**
   - 폰트 선택 (Pretendard, Cormorant, 나눔펜, 개구, 동글, 싱글데이)
   - 텍스트 색상 선택 (잉크 블랙, 네이비, 로즈, 포레스트, 선셋, 크림 화이트)
   - 편지지 선택 (기본, 클래식, 블라썸, 미드나이트 등)
   - 리치 텍스트 편집 (굵게, 기울임, 밑줄)
   - 이모티콘 삽입
   - 실시간 미리보기

2. **결제 및 주문**
   - 편지 미리보기 확인
   - 쿠폰 적용
   - 결제 수단 선택 (카드, 휴대폰 소액결제)
   - PortOne 결제 연동

3. **주문 관리**
   - 주문 내역 조회
   - 편지 상태 확인

### 관리자 기능
1. **주문 관리**
   - 주문 목록 조회
   - 주문 상세 확인 (편지 내용, 디자인 정보 포함)
   - 편지 상태 업데이트 (임시 저장, 접수 완료, 인쇄 중, 발송 완료)
   - 배송 정보 관리
   - 편지 인쇄용 HTML 생성

2. **수령인 관리**
   - 수령인 추가/삭제
   - 카테고리 및 중분류 관리

3. **편지지 관리**
   - 편지지 템플릿 추가/수정/삭제
   - 편지지 활성화/비활성화

4. **쿠폰 관리**
   - 쿠폰 생성 및 관리
   - 쿠폰 수동 발급

5. **회원 관리**
   - 회원 목록 조회

## 디자인 일관성 보장

### 문제 해결
이전에는 사용자가 작성한 편지 디자인과 관리자 페이지에서 보이는 편지 디자인이 다르게 표시되는 문제가 있었습니다. 이를 해결하기 위해 다음과 같은 개선을 진행했습니다:

1. **데이터 저장 개선**
   - 편지 색상 정보(`text_color`)를 데이터베이스에 저장
   - 편지지 정보(`paper_option`)와 폰트 정보(`font_style`) 저장 보장

2. **관리자 페이지 렌더링 개선**
   - 사용자 미리보기와 동일한 구조로 편지 표시
   - 편지지 스타일 클래스 적용 (`paper-lined`, `paper-classic`, `paper-blossom`, `paper-midnight`)
   - 폰트 클래스 적용 (`font-default`, `font-serif`, `font-handwriting` 등)
   - 색상 정보 적용
   - 편지지 가이드 라인 표시

3. **CSS 통일**
   - 관리자 페이지에 편지지 스타일 CSS 추가
   - Google Fonts 링크 추가
   - 사용자 페이지와 동일한 스타일 변수 사용

### 디자인 정보 저장 구조
```javascript
{
  font: "default" | "serif" | "handwriting" | "gaegu" | "dongle" | "singleDay",
  color: "#1b1c1f" | "#1f3a93" | "#d94b8c" | "#1f7a54" | "#ff7a45" | "#f9f6ef",
  stationery: "basic" | "classic" | "blossom" | "midnight",
  formattedText: "<HTML content>",
  text: "<Plain text>"
}
```

### 편지지 스타일 매핑
- `basic` → `paper-lined`: 기본 흰색 편지지
- `classic` → `paper-classic`: 클래식한 베이지 톤
- `blossom` → `paper-blossom`: 핑크 톤
- `midnight` → `paper-midnight`: 다크 모드

## 사전 준비

1. **MySQL 데이터베이스 설정**
   - `fanletter_post` 데이터베이스 생성
   - 필요한 테이블 생성 (SQL 스크립트 실행)
   - `letters` 테이블에 `text_color` 컬럼 자동 추가 (서버 시작 시)

2. **패키지 설치**
   ```bash
   npm install
   ```

3. **환경 변수 설정**
   `.env` 파일을 생성하고 다음 정보를 입력:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=fanletter_post
   SESSION_SECRET=your_secret_key
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=admin_password
   KAKAO_CLIENT_ID=your_kakao_client_id
   KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback
   PORT=3000
   ```

## 실행 방법

```bash
npm run dev
```

서버가 시작되면:
- 프론트엔드: http://localhost:3000
- API 엔드포인트: http://localhost:3000/api/*

## API 엔드포인트

### 인증
- `POST /api/signup`: 회원가입
- `POST /api/login`: 로그인
- `POST /api/admin/login`: 관리자 로그인
- `GET /api/me`: 현재 사용자 정보
- `POST /api/logout`: 로그아웃

### 편지 작성
- `GET /api/stationery`: 활성 편지지 목록
- `GET /api/recipients/categories`: 수령인 카테고리 목록
- `GET /api/recipients/by-subcategory/:subcategoryId`: 중분류별 수령인 목록

### 주문
- `POST /api/orders`: 주문 생성 (편지 저장)
- `GET /api/orders/my`: 내 주문 목록

### 쿠폰
- `GET /api/coupons/me`: 내 쿠폰 목록
- `POST /api/coupons/consume`: 쿠폰 사용

### 관리자 API
- `GET /api/admin/orders`: 주문 목록
- `GET /api/admin/orders/:id`: 주문 상세
- `PUT /api/admin/orders/:id/status`: 편지 상태 업데이트
- `PUT /api/admin/orders/:id/shipment`: 배송 정보 업데이트
- `GET /api/admin/recipients`: 수령인 목록
- `POST /api/admin/recipients`: 수령인 추가
- `DELETE /api/admin/recipients/:id`: 수령인 삭제
- `GET /api/admin/stationery`: 편지지 목록
- `POST /api/admin/stationery`: 편지지 추가
- `PUT /api/admin/stationery/:id`: 편지지 수정
- `DELETE /api/admin/stationery/:id`: 편지지 삭제
- `GET /api/admin/coupons`: 쿠폰 목록 및 발급 내역
- `POST /api/admin/coupons`: 쿠폰 생성
- `POST /api/admin/coupons/issue`: 쿠폰 수동 발급
- `DELETE /api/admin/coupons/:id`: 쿠폰 삭제
- `GET /api/admin/users`: 회원 목록

## 데이터베이스 스키마

### 주요 테이블
- `users`: 사용자 정보
- `letters`: 편지 정보 (content, paper_option, font_style, text_color 포함)
- `payments`: 결제 정보
- `shipments`: 배송 정보
- `recipients`: 수령인 정보
- `stationery_templates`: 편지지 템플릿
- `coupons`: 쿠폰 정의
- `user_coupons`: 사용자별 쿠폰 발급 내역

## 기술 스택

- **프론트엔드**: HTML5, CSS3, Vanilla JavaScript
- **백엔드**: Node.js, Express.js
- **데이터베이스**: MySQL
- **인증**: Express Session, BCrypt
- **결제**: PortOne (구 이니시스)
- **OAuth**: Kakao

## 개발 가이드

### 편지 디자인 정보 추가
새로운 편지지나 폰트를 추가하려면:

1. **편지지 추가**
   - 관리자 페이지에서 편지지 추가
   - 또는 `DEFAULT_STATIONERY` 배열에 추가
   - CSS에 해당 편지지 스타일 추가

2. **폰트 추가**
   - Google Fonts에서 폰트 추가
   - `letter-compose.html`, `letter-payment.html`, `admin.html`에 폰트 링크 추가
   - CSS에 폰트 클래스 추가
   - `LETTER_FONT_CLASSES` 배열에 추가

3. **색상 추가**
   - `letter-compose.html`의 `colorOptions` 배열에 추가
   - `COLOR_VALUE_WHITELIST`에 색상 값 추가

## 문제 해결

### 편지 디자인이 다르게 표시되는 경우
1. 데이터베이스에 `text_color` 컬럼이 있는지 확인
2. 서버 로그에서 스키마 확장 오류 확인
3. 브라우저 개발자 도구에서 CSS 클래스 적용 확인
4. Google Fonts 로딩 확인

### 관리자 페이지에서 편지가 보이지 않는 경우
1. 관리자 로그인 상태 확인
2. API 응답 확인 (네트워크 탭)
3. 콘솔 오류 확인

## 라이선스

이 프로젝트는 비아이티 팬레터포스트의 소유입니다.
