/* POST /api/onestore/ads/claim  { requestId, playerId? }
   → 200 { granted:true }                       포스트백으로 확정된 보상을 지금 1회 수령
   → 200 { granted:false, reason:'pending' }    아직 포스트백이 오지 않음 — 잠시 뒤 다시
   → 409 { granted:false, reason:'already_claimed' }
   → 404 { granted:false, reason:'unknown' }    발급하지 않았거나 playerId가 다름 */
import { json, notConfigured, cleanPlayerId, isRequestId, readJson } from './_shared.js';

export async function onRequestPost({ request, env }) {
  if (notConfigured(env, false)) return json({ error: 'not_configured' }, 503);
  const body = (await readJson(request)) || {};
  if (!isRequestId(body.requestId)) return json({ granted: false, reason: 'unknown' }, 404);
  const playerId = cleanPlayerId(body.playerId);
  const db = env.ONESTORE_ADS_DB;

  // rewarded → claimed 전이는 한 번만 성공한다(동시에 두 번 와도 changes는 한쪽만 1)
  const r = await db
    .prepare("UPDATE onestore_ad_rewards SET state = 'claimed', claimed_at = ?3 WHERE request_id = ?1 AND player_id IS ?2 AND state = 'rewarded'")
    .bind(body.requestId, playerId, Date.now())
    .run();
  if (r.meta.changes === 1) return json({ granted: true });

  const row = await db
    .prepare('SELECT state FROM onestore_ad_rewards WHERE request_id = ?1 AND player_id IS ?2')
    .bind(body.requestId, playerId)
    .first();
  if (!row) return json({ granted: false, reason: 'unknown' }, 404);
  if (row.state === 'claimed') return json({ granted: false, reason: 'already_claimed' }, 409);
  return json({ granted: false, reason: 'pending' });
}
