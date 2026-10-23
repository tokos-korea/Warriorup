# 원스토어 ONEplay 웹게임 연동

원스토어 H5 Game SDK **v1.1.0**으로 Lifecycle만 연동했다. 결제(IAP)·광고(IAA)는 게임에 없는 기능이라 연동하지 않았다.

- v1.1.0: 2026-09-07 릴리즈, 2026-09-17 상품 조회 추가. 2026-10-23 릴리즈 노트에서 최신임을 확인했다
- 가이드: https://onestore-dev.gitbook.io/dev/tools/web-sdk
- 릴리즈 노트: https://onestore-dev.gitbook.io/dev/tools/web-sdk/releasenote
- 공식 Web SDK SKILL(점검 기준으로 사용): https://github.com/ONE-store/onestore_web_sdk_skills

## 구조

| 파일 | 역할 |
|---|---|
| `platform/onestore.js` | 진입점. 공식 CDN에서 SDK를 import 하고 어댑터를 연결 |
| `platform/onestore-adapter.js` | 리스너 등록 → `initializeAsync` → `setLoadingProgress` → `startGameAsync`, pause/resume/exit/백키, safeArea |
| `index.html` `window.WarriorUp` | 게임이 플랫폼 코드에 내주는 연결점(소리 정지/재개, 소리 켜기/끄기, 팝업 닫기). 게임 규칙은 건드리지 않음 |
| `_headers` | Cloudflare Pages 응답 헤더. 원스토어 도메인의 iframe 삽입 허용 |

현재 판정은 `<html data-platform>`(`onestore` / `web` / `onestore-error`)에 남는다.

## 환경별 동작 (SDK v1.1.0 코드로 확인)

| 환경 | 동작 |
|---|---|
| 원스토어 앱 | 앱 로딩 화면 → 이미지·폰트 로드(최대 8초) → `startGameAsync` 성공 시 게임 표시. safeArea 여백, 무음 모드면 소리 끔 |
| 일반 브라우저 | `initializeAsync()`가 `{ err: "Platform Not Supported" }`로 응답 → 게임 그대로. SDK가 `visibilitychange`를 pause/resume으로 넘겨 주므로 탭을 숨기면 소리가 멈춘다 |
| 원스토어가 아닌 사이트의 iframe | SDK가 앱으로 보고 핸드셰이크를 시도하다 3초 타임아웃(2회) 후 `web` 판정. 그동안에도 게임은 조작 가능 |
| SDK CDN 장애 | 이 모듈만 실패하고 게임은 동작 |

게임 스크립트(본문 끝 일반 `<script>`)가 SDK 모듈보다 먼저 실행된다. 이 게임은 입력이 있기 전까지 아무 일도 하지 않고,
앱 로딩 화면이 `startGameAsync` 전까지 화면을 가리므로 문제가 없다. 어댑터는 `window.WarriorUp`이 없을 때도 안전하게 넘어간다.

저장 기능이 없는 게임이다(새로고침·앱 재실행 시 처음부터). 그래서 `exit`에서는 소리만 멈춘다.
저장을 추가하면 `exit` 리스너에서 동기적으로 0.5초 안에, `playerId` 기준으로 저장할 것.

## 토스 앱인토스

원스토어 코드는 `platform/onestore*.js`에만 있다. 앱인토스는 `platform/toss.js`처럼 별도 파일로 두고 같은 `window.WarriorUp` 연결점을 쓴다.
SDK 전역 이름은 `ONEstoreH5`·`webGameBridge`뿐이라 이름 충돌은 없다. 앱인토스 빌드에서 원스토어 SDK를 아예 내려받지 않게 하려면
그때 index.html의 `platform/onestore.js` 로드를 플랫폼별로 나눈다. 앱인토스가 게임을 iframe으로 띄운다면 그 도메인을 `_headers`에 더해야 한다.

## ONEconsole에서 직접 할 일

1. Apps > 상품관리 > Web 상품관리 > 기본정보 → **테스트 URL**: 이 브랜치가 배포된 HTTPS 주소(리다이렉트 없는 최종 주소)
2. **테스트 ID** 등록 (없으면 앱에 테스트 메뉴가 보이지 않는다)
3. 원스토어 앱(테스트 ID 로그인) → 마이 > 이용 안내 > 웹게임 테스트 > 내 테스트 게임 에서 실행
4. 광고 적용 여부: **아니요** (광고 미사용). 인앱 상품·광고 지면 ID 불필요

배포 후 헤더 확인: `curl -sI https://warriorup.pages.dev/ | grep -i -e x-frame -e content-security`
