# 팬레터포스트 웹

정적인 서비스 소개 페이지(`index.html`), 카테고리 선택/세부 선택/편지 작성 페이지(`letter.html`, `letter-target.html`, `letter-compose.html`), 회원가입 전용 페이지(`signup.html`), 그리고 MySQL과 연동되는 간단한 Express 백엔드(`server.js`)로 구성되어 있습니다.

## 사전 준비
1. MySQL에 `fanletter_post`(혹은 원하는 이름) DB 및 테이블 생성  
   → 제공된 SQL 스크립트 그대로 실행
2. 패키지 설치
   ```bash
   npm install
   ```
3. 환경 변수  
   `.env.example`를 복사해 `.env`를 만든 뒤 DB 접속 정보를 입력합니다.
   - `SESSION_SECRET`, `KAKAO_CLIENT_ID`, `KAKAO_REDIRECT_URI` 등 OAuth 항목도 함께 설정

## 실행 방법
```bash
npm run dev
```
- 서버: http://localhost:3000
- 정적 파일은 프로젝트 루트에서 서빙되며, 회원가입 폼은 `/api/signup`으로 요청을 보냅니다.

## API
- **POST `/api/signup`**
  - Body: `{ email, password, name?, phone?, marketingConsent? }`
  - 기능: 이메일 중복 체크 → BCrypt 해시 → `users` 테이블에 저장
  - 응답: `201 Created` / 오류 시 적절한 상태 코드와 메시지
- **POST `/api/login`**
  - Body: `{ email, password }`
  - 기능: 이메일/비밀번호 검증 후 세션 생성
- **GET `/api/me`**
  - 세션 기반 로그인 여부와 사용자 정보 반환
- **POST `/api/logout`**
  - 세션 파기 후 로그아웃
- **GET `/auth/kakao`**
  - 카카오 OAuth 인가 요청으로 리다이렉트. `KAKAO_CLIENT_ID`, `KAKAO_REDIRECT_URI` 환경 변수가 필요
- **GET `/auth/kakao/callback`**
  - Kakao 토큰 교환 및 사용자 정보 조회 → `social_accounts` / `users` 테이블에 저장 → 세션 발급 후 `/`로 리다이렉트

## 다음 단계 제안
- OAuth Naver/Google 연동 확장
- 이메일 인증/비밀번호 재설정 플로우
- 편지 작성 내용 입력/미리보기/결제 연동
