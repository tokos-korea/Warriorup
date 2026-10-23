/* POST /api/onestore/ads/request-id  { playerId? } → { requestId }
   리워드 광고 요청마다 서버가 추적 키를 발급한다. SDK는 requestId를 만들어 주지 않는다. */
import { json, notConfigured, cleanPlayerId, readJson } from './_shared.js';

export async function onRequestPost({ request, env }) {
  if (notConfigured(env, false)) return json({ error: 'not_configured' }, 503);
  const body = (await readJson(request)) || {};
  const requestId = crypto.randomUUID();
  await env.ONESTORE_ADS_DB
    .prepare('INSERT INTO onestore_ad_rewards (request_id, player_id, state, issued_at) VALUES (?1, ?2, ?3, ?4)')
    .bind(requestId, cleanPlayerId(body.playerId), 'issued', Date.now())
    .run();
  return json({ requestId });
}
