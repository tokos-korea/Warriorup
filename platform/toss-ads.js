/* =====================================================================
   토스 앱인토스 보상형 광고 — '광고 보고 부활' (원스토어 광고와 같은 게임 연결점을 쓴다)
   ---------------------------------------------------------------------
   · 앱인토스 공식 SDK(@apps-in-toss/web-framework)로만 호출한다. 외부 광고 스크립트를 로드하지 않는다.
   · 이 파일은 토스 빌드(번들러가 패키지를 해석)에서만 쓴다. Cloudflare/원스토어 페이지는 로드하지 않는다.
   · 기준: loadFullScreenAd / showFullScreenAd (토스 앱 5.227.0 이상)
     https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/ads/showfullscreenad
   · 보상은 userEarnedReward 이벤트가 왔을 때만 준다. dismissed만으로는 주지 않는다.
   · 샌드박스 앱에서는 광고가 지원되지 않는다. 콘솔 QR 코드로 토스 앱에서 테스트한다.
   ===================================================================== */
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';
import { TOSS_REWARDED_AD_GROUP_ID } from './toss-config.js';

export function connectTossAds(win = window, adGroupId = TOSS_REWARDED_AD_GROUP_ID) {
  const game = win.WarriorUp;
  if (!adGroupId) return 'no_ad_group';
  if (!loadFullScreenAd.isSupported() || !showFullScreenAd.isSupported()) return 'unsupported';
  if (!game || typeof game.setReviveAd !== 'function') return 'no_game';

  let loaded = false;
  let loading = false;
  let busy = false;

  load();
  game.setReviveAd(showRevive);
  return 'ready';

  // 광고는 로드 이벤트를 받은 뒤에만 표시한다. 표시한 광고는 다시 쓸 수 없어 닫히면 새로 로드한다
  function load() {
    if (loaded || loading) return;
    loading = true;
    let cleanup = () => {};   // 이벤트가 동기로 와도 안전하도록 먼저 만든다
    cleanup = loadFullScreenAd({
      options: { adGroupId },
      onEvent: (e) => { if (e.type === 'loaded') { loaded = true; loading = false; cleanup(); } },
      onError: (err) => { console.error('[toss-ads] load', err); loading = false; cleanup(); },
    });
  }

  function showRevive() {
    if (busy) return Promise.resolve({ ok: false });
    if (!loaded) {
      load();
      return Promise.resolve({ ok: false, message: '광고를 준비하고 있습니다. 잠시 후 다시 시도해 주세요.' });
    }
    busy = true;
    loaded = false;
    return new Promise((resolve) => {
      let earned = false;
      let done = false;
      const finish = (r) => { if (done) return; done = true; busy = false; cleanup(); load(); resolve(r); };
      let cleanup = () => {};
      cleanup = showFullScreenAd({
        options: { adGroupId },
        onEvent: (e) => {
          if (e.type === 'userEarnedReward') earned = true;
          else if (e.type === 'dismissed') {
            finish(earned ? { ok: true } : { ok: false, message: '광고를 끝까지 시청해야 부활할 수 있습니다.' });
          } else if (e.type === 'failedToShow') {
            finish({ ok: false, message: '지금은 광고를 표시할 수 없습니다.' });
          }
        },
        onError: (err) => {
          console.error('[toss-ads] show', err);
          finish({ ok: false, message: '지금은 광고를 표시할 수 없습니다.' });
        },
      });
    });
  }
}
