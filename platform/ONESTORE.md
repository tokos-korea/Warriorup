# 원스토어 ONEplay 웹게임 연동

원스토어 H5 Game SDK **v1.1.0**으로 Lifecycle과 **리워드 광고(광고 보고 부활)**를 연동했다. 전면 광고·결제(IAP)는 쓰지 않는다.

- v1.1.0: 2026-09-07 릴리즈, 2026-09-17 상품 조회 추가. 2026-10-23 릴리즈 노트에서 최신임을 확인했다
- 가이드: https://onestore-dev.gitbook.io/dev/tools/web-sdk (광고: `/iaa`, 콘솔·SSV: `/docs/apps/product/monetization/iaa`)
- 공식 Web SDK SKILL(점검 기준으로 사용): https://github.com/ONE-store/onestore_web_sdk_skills
- 토스 앱인토스 쪽은 `platform/TOSS.md`

## 구조

| 파일 | 역할 |
|---|---|
| `platform/onestore.js` | 진입점. 공식 CDN에서 SDK를 import, 어댑터 연결, 시작 성공 뒤 광고 연결 |
| `platform/onestore-adapter.js` | 리스너 등록 → `initializeAsync` → `setLoadingProgress` → `startGameAsync`, pause/resume/exit/백키, safeArea |
| `platform/onestore-ads.js` | 리워드 광고. 서버 발급 `requestId` → `showRewardedAsync` → 서버 수령(claim) 확인 뒤에만 부활 |
| `platform/onestore-config.js` | 리워드 광고 지면 ID. **비어 있으면 광고 부활이 꺼진다** |
| `functions/api/onestore/ads/*` | 보상 검증 서버(Cloudflare Pages Functions + D1) |
| `platform/onestore-ads-schema.sql` | D1 테이블 |
| `index.html` `window.WarriorUp` | 게임 연결점(소리, 팝업, `setReviveAd`). 게임 규칙은 건드리지 않음 |
| `_headers` | 원스토어 도메인의 iframe 삽입 허용 |

판정 결과는 `<html data-platform>`(`onestore`/`web`/`onestore-error`)과 `<html data-ads>`(`ready`/`no_placement`/`unsupported`)에 남는다.

## 광고 보고 부활 (게임 규칙)

- 강화 실패 시, **부활권을 쓸 수 있는 단계에서만**, **한 판에 1번** "광고 부활" 팝업을 먼저 띄운다
- "아니요"를 고르거나 광고를 끝까지 못 보면 기존 부활권 팝업(부활권 사용 여부)으로 넘어간다
- 한 판 = 1강에서 다시 시작할 때까지(강화 소멸, 관문 패배, 처음부터에서 다시 생김)
- **관문 대결 패배에는 광고 부활이 없다**
- 플랫폼이 광고를 등록하지 않으면(일반 웹, 지면 ID 없음) 팝업이 나오지 않고 기존 흐름 그대로다

## 보상 검증 (원스토어 가이드: `rewarded`는 지급 근거가 아님)

```
게임 ─POST /request-id─▶ 서버: requestId 발급(issued)
게임 ─showRewardedAsync({placementId, requestId})─▶ 광고
원스토어 ─POST /postback (x-API-KEY, x-TIMESTAMP, x-SIGNATURE)─▶ 서버: 서명 확인 → rewarded
게임 ─POST /claim─▶ 서버: rewarded → claimed (1회만) → 부활
```

- 서명: `HMAC-SHA256(API Key, x-TIMESTAMP + "\n" + 받은 body 원문)` hex, timestamp ±5분
- 같은 포스트백 재전송·동시 수령은 조건부 UPDATE로 1회만 지급된다. playerId가 다르면 수령할 수 없다
- 포스트백이 늦으면 약 12초까지 확인하고, 그래도 없으면 다음 클릭 때 새 광고 없이 다시 확인한다
- `timeout` 실패 뒤 광고가 늦게 뜰 수 있어 requestId를 남겨 두고 다음 클릭 때 확인한다
- 한계: 게임 상태가 브라우저 메모리에만 있으므로, 이 검증은 "광고를 안 보고 광고 부활을 얻는 것"을 막는다.
  브라우저 메모리를 직접 고치는 치트까지 막지는 못한다(저장·랭킹이 없는 현재 구조에서는 영향이 이 판에 한정)
- 공식 문서의 서명 예시값은 실제 HMAC 계산 결과와 다르다(예시용 임의 값으로 보임). 실제 포스트백으로 확인할 것

## 환경별 동작 (SDK v1.1.0 코드로 확인)

| 환경 | 동작 |
|---|---|
| 원스토어 앱 | 앱 로딩 화면 → 이미지·폰트 로드(최대 8초) → `startGameAsync` 성공 시 게임 표시. safeArea 여백, 무음 모드면 소리 끔. 광고는 `ads.isSupported("rewarded")`가 true이고 지면 ID가 있을 때만 |
| 일반 브라우저 | `initializeAsync()`가 `{ err: "Platform Not Supported" }`로 응답 → 게임 그대로, 광고 없음(`/api` 요청도 없음). 탭을 숨기면 SDK가 pause를 보내 소리가 멈춘다 |
| 원스토어가 아닌 사이트의 iframe | SDK가 앱으로 보고 핸드셰이크를 시도하다 3초 타임아웃(2회) 후 `web` 판정. 그동안에도 게임은 조작 가능 |
| SDK CDN 장애 | 이 모듈만 실패하고 게임은 동작 |

게임 스크립트(본문 끝 일반 `<script>`)가 SDK 모듈보다 먼저 실행된다. 이 게임은 입력이 있기 전까지 아무 일도 하지 않고,
앱 로딩 화면이 `startGameAsync` 전까지 화면을 가리므로 문제가 없다.

저장 기능이 없는 게임이다(새로고침·앱 재실행 시 처음부터). 그래서 `exit`에서는 소리만 멈춘다.

## 직접 할 일

### Cloudflare 대시보드 (Workers & Pages > warriorup > Settings)
1. D1 데이터베이스를 만들고(예: `warriorup-ads`) Console에서 `platform/onestore-ads-schema.sql` 실행
2. Bindings > D1 database: 변수 이름 **`ONESTORE_ADS_DB`** → 위 DB (Production, 필요하면 Preview도)
3. Variables and Secrets > **Secret** `ONESTORE_ADS_API_KEY` = ONEconsole에 등록할 API Key (영문·숫자·`-`·`_` 5~64자, 직접 생성)
4. 설정 후 재배포

### ONEconsole
1. Apps > 상품관리 > Web 상품관리 > 기본정보 → **테스트 URL**: `https://warriorup.pages.dev/`, **광고 적용 여부: 예**
2. **테스트 ID** 등록
3. Apps > 상품현황 > 수익화 > 인앱 광고 → **리워드 비디오** [ID 발급 요청] (영업일 약 1일). 전면 광고는 신청하지 않는다
4. 발급 후 같은 화면에서 **콜백 서버(상용)**: `https://warriorup.pages.dev/api/onestore/ads/postback`, **API Key**: 위 3번과 같은 값
5. 발급받은 지면 ID를 `platform/onestore-config.js`의 `REWARDED_PLACEMENT_ID`에 넣고 배포
6. 원스토어 앱(테스트 ID) → 마이 > 이용 안내 > 웹게임 테스트 > 내 테스트 게임 에서 실행

테스트용 지면 ID는 원스토어가 제공하지 않는다(필요하면 devhelper@onestore.net 문의). 실기기 확인 전에는 광고 연동 성공을 단정하지 않는다.

배포 후 헤더 확인: `curl -sI https://warriorup.pages.dev/ | grep -i -e x-frame -e content-security`
