/* =====================================================================
   원스토어 리워드 광고 — '광고 보고 부활' 하나만 쓴다 (전면 광고 없음)
   ---------------------------------------------------------------------
   · 기준: 원스토어 Web SDK 04. 인앱 광고 (IAA) v1.1.0
     https://onestore-dev.gitbook.io/dev/tools/web-sdk/iaa
   · status "rewarded"는 광고 노출 신호일 뿐 지급 근거가 아니다. 부활은 서버가
     SSV 포스트백을 받아 확정한 requestId를 1회 수령(claim)했을 때만 한다.
   · requestId는 서버(functions/api/onestore/ads/*)가 발급한다. SDK는 만들어 주지 않는다.
   · SDK 객체를 인자로 받으므로 테스트에서 모의 객체로 바꿔 끼울 수 있다.
   ===================================================================== */
import { REWARDED_PLACEMENT_ID } from './onestore-config.js';

const API = '/api/onestore/ads';
const CLAIM_TRIES = 8;        // 포스트백이 늦게 올 수 있어 1.5초 간격으로 약 12초까지 확인한다
const CLAIM_GAP_MS = 1500;

const FAIL_MESSAGE = {
  no_fill: '지금은 표시할 광고가 없습니다. 잠시 후 다시 시도해 주세요.',
  already_showing: '이미 광고가 재생 중입니다.',
  network_error: '네트워크 연결을 확인해 주세요.',
};

export function connectOneStoreAds(sdk, { playerId } = {}, win = window, placementId = REWARDED_PLACEMENT_ID) {
  const game = win.WarriorUp;
  if (!placementId) return 'no_placement';           // 지면 ID 미발급 — 광고 부활을 켜지 않는다
  if (!sdk.ads.isSupported('rewarded')) return 'unsupported';   // initializeAsync 이후라 확정값이다
  if (!game || typeof game.setReviveAd !== 'function') return 'no_game';

  // 시청은 했지만 아직 서버 확정을 못 받은 requestId. 다음 클릭 때 새 광고 대신 이것부터 확인한다
  let pending = null;
  let busy = false;

  sdk.ads.loadRewarded({ placementId });              // 사전 로딩(선택). 완료 회신은 없다
  game.setReviveAd(showRevive);
  return 'ready';

  async function showRevive() {
    if (busy) return { ok: false };
    busy = true;
    try {
      if (pending) {
        const id = pending;
        pending = null;                               // 한 번 더 확인하고, 안 되면 새 광고로 넘어간다
        const r = await claim(id);
        if (r.ok) return r;
        return { ok: false, message: r.message || '광고 보상을 확인하지 못했습니다. 다시 시도해 주세요.' };
      }

      const requestId = await issueRequestId();
      const result = await sdk.ads.showRewardedAsync({ placementId, requestId });
      sdk.ads.loadRewarded({ placementId });          // 다음 광고 미리 로드

      if (result.status === 'rewarded') {
        const r = await claim(requestId);
        if (r.pending) pending = requestId;
        return r;
      }
      if (result.status === 'dismissed') {
        return { ok: false, message: '광고를 끝까지 시청해야 부활할 수 있습니다.' };
      }
      // failed — 보상 대상이 아니다. timeout 뒤에는 광고가 늦게 뜰 수 있어 requestId를 남겨 둔다
      if (result.reason === 'timeout') pending = requestId;
      return { ok: false, message: FAIL_MESSAGE[result.reason] || '지금은 광고를 표시할 수 없습니다.' };
    } catch (e) {
      console.error('[onestore-ads]', e?.message || e);
      return { ok: false, message: '광고 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' };
    } finally {
      busy = false;
    }
  }

  async function issueRequestId() {
    const res = await post('/request-id', { playerId });
    if (!res.requestId) throw new Error(`request-id 발급 실패 (${res.error || 'unknown'})`);
    return res.requestId;
  }

  // 서버가 포스트백을 받아 확정한 보상을 1회 수령한다. 확정 전이면 잠시 간격을 두고 다시 묻는다
  async function claim(requestId) {
    for (let i = 0; i < CLAIM_TRIES; i++) {
      const res = await post('/claim', { requestId, playerId });
      if (res.granted) return { ok: true };
      if (res.reason !== 'pending') {
        return { ok: false, message: res.reason === 'already_claimed'
          ? '이미 사용한 광고 보상입니다.' : '광고 보상을 확인하지 못했습니다.' };
      }
      await new Promise((r) => win.setTimeout(r, CLAIM_GAP_MS));
    }
    return { ok: false, pending: true, message: '광고 보상 확인이 늦어지고 있습니다. 잠시 후 다시 눌러 주세요.' };
  }

  async function post(path, body) {
    const res = await win.fetch(API + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok && res.status !== 404 && res.status !== 409) throw new Error(`${path} HTTP ${res.status}`);
    return res.json();
  }
}
