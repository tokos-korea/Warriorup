# 원스토어 ONEplay 웹게임 연동

원스토어 H5 Game SDK **v1.1.0**(2026-10-21 릴리즈 노트 기준 최신)으로 Lifecycle만 연동했다.
결제(IAP)·광고(IAA)는 게임에 없는 기능이라 연동하지 않았다.

- 가이드: https://onestore-dev.gitbook.io/dev/tools/web-sdk
- 릴리즈 노트: https://onestore-dev.gitbook.io/dev/tools/web-sdk/releasenote

## 구조

| 파일 | 역할 |
|---|---|
| `platform/onestore.js` | 진입점. 공식 CDN에서 SDK를 import 하고 어댑터를 연결 |
| `platform/onestore-adapter.js` | 리스너 등록 → `initializeAsync` → `setLoadingProgress` → `startGameAsync`, pause/resume/exit/백키, safeArea |
| `index.html` `window.WarriorUp` | 게임이 플랫폼 코드에 내주는 연결점(소리 정지/재개, 소리 켜기/끄기, 팝업 닫기). 게임 규칙은 건드리지 않음 |
| `_headers` | Cloudflare Pages 응답 헤더. 원스토어 도메인의 iframe 삽입 허용 |

일반 브라우저에서는 `initializeAsync()`가 `{ err: "Platform Not Supported" }`로 응답해 게임을 그대로 둔다.
SDK CDN을 받지 못해도 이 모듈만 실패하고 게임은 동작한다. 현재 판정은 `<html data-platform>`
(`onestore` / `web` / `onestore-error`)에 남는다.

토스 앱인토스 연동은 `platform/toss.js`처럼 별도 파일로 두고 같은 `window.WarriorUp` 연결점을 쓰면 된다.

## ONEconsole에서 직접 할 일

1. Apps > 상품관리 > Web 상품관리 > 기본정보 → **테스트 URL**: `https://warriorup.pages.dev/`
2. **테스트 ID** 등록 (없으면 앱에 테스트 메뉴가 보이지 않는다)
3. 원스토어 앱(테스트 ID 로그인) → 마이 > 이용 안내 > 웹게임 테스트 > 내 테스트 게임 에서 실행
4. 광고 적용 여부: **아니요** (광고 미사용). 인앱 상품 등록 불필요 (결제 미사용)
