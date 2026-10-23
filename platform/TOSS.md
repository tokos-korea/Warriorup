# 토스 앱인토스 — 준비 상태

광고 모듈만 준비했다. 토스 빌드(`@apps-in-toss/web-framework` 프로젝트)는 아직 없다.

- 기존 웹 프로젝트 연동: https://developers-apps-in-toss.toss.im/ai-vibe-coding/tutorials/webview
- 보상형 광고: https://developers-apps-in-toss.toss.im/documentation/common/monetization/iaa/interstitial-rewarded-ad
- 확인한 SDK: `@apps-in-toss/web-framework` 3.9.0 (`loadFullScreenAd`, `showFullScreenAd`, `getOperationalEnvironment`)

## 플랫폼 분리 원칙

판별은 User-Agent나 URL 파라미터가 아니라 **빌드 구성**으로 한다. 토스는 번들(`webBundleDir`)을 콘솔에 올리는 방식이라
토스 번들에 무엇이 들어가는지가 곧 판별 근거다.

| 빌드 | index.html이 로드하는 진입점 | 들어가면 안 되는 것 |
|---|---|---|
| Cloudflare Pages(원스토어·웹) | `platform/onestore.js` | `platform/toss*.js`(로드되지 않음, 번들러 전용 import라 브라우저에서 실행 불가) |
| 토스 번들 | `platform/toss.js` | `platform/onestore*.js`, `functions/`, `_headers`, 원스토어 CDN 주소 |

토스 빌드를 만들 때:
1. `npm install @apps-in-toss/web-framework` → `npx ait init` → `apps-in-toss.config.ts`의 `appName`을 콘솔 앱 이름과 같게
2. index.html의 `<script type="module" src="platform/onestore.js">`를 `platform/toss.js`로 바꾼 사본으로 번들
3. 번들 결과물에 `onestore`·`h5sdk.onestore.net` 문자열이 없는지 확인 (`grep -r onestore dist/`)

`platform/toss-ads.js`는 원스토어와 같은 게임 연결점(`WarriorUp.setReviveAd`)을 쓰므로 게임 규칙(한 판 1번, 관문 제외)이 같다.

## 광고 규칙 (토스 문서 기준)

- 개발 중에는 반드시 테스트 ID `ait-ad-test-rewarded-id` (`platform/toss-config.js` 기본값). 실제 ID로 테스트하면 정책 위반
- 출시 직전에 콘솔에서 발급받은 보상형 광고 그룹 ID로 바꾼다
- `loadFullScreenAd`의 `loaded` 이벤트 뒤에만 `showFullScreenAd`. 표시한 광고는 닫히면 새로 로드
- 보상은 `userEarnedReward` 이벤트가 왔을 때만. `dismissed`만으로는 주지 않음
- 토스 앱 5.227.0 미만은 미지원(`isSupported()`가 false면 광고 부활 팝업이 나오지 않음)
- 샌드박스 앱에서는 광고가 동작하지 않는다. 콘솔 QR 코드로 토스 앱에서 테스트
- 토스 문서는 클라이언트 `userEarnedReward` 기준 지급을 안내한다. 원스토어처럼 서버 포스트백을 받는 구조는 문서에서 확인하지 못했다
