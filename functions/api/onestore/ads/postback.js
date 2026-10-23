/* POST /api/onestore/ads/postback — 원스토어 SSV 콜백 (ONEconsole에 이 주소를 콜백 URL로 등록)
   https://onestore-dev.gitbook.io/dev/docs/apps/product/monetization/iaa (콜백 서버 URL 연동)
   · x-API-KEY: 등록한 API Key 그대로
   · x-TIMESTAMP: epoch millis, 짧은 유효창 안의 값만 인정(리플레이 방지)
   · x-SIGNATURE: HMAC-SHA256(API Key, timestamp + "\n" + 수신한 body 원문) hex
   · body: {"requestId":"…","status":"SUCCESS","reason":""}
   · 2xx면 성공으로 본다(응답 바디는 읽지 않음). 같은 포스트백이 다시 와도 결과가 같아야 한다 */
import { json, notConfigured, isRequestId, hmacHex, safeEqual, TIMESTAMP_WINDOW_MS } from './_shared.js';

export async function onRequestPost({ request, env }) {
  if (notConfigured(env, true)) return json({ error: 'not_configured' }, 503);
  const key = env.ONESTORE_ADS_API_KEY;
  const apiKey = request.headers.get('x-API-KEY');
  const ts = request.headers.get('x-TIMESTAMP');
  const signature = (request.headers.get('x-SIGNATURE') || '').toLowerCase();
  const rawBody = await request.text();          // 다시 직렬화하지 않고 받은 바이트 그대로 서명을 확인한다

  if (!safeEqual(apiKey, key)) return json({ error: 'unauthorized' }, 401);
  if (!/^\d{10,16}$/.test(ts || '') || Math.abs(Date.now() - Number(ts)) > TIMESTAMP_WINDOW_MS) {
    return json({ error: 'stale_timestamp' }, 401);
  }
  if (!safeEqual(signature, await hmacHex(key, `${ts}\n${rawBody}`))) return json({ error: 'bad_signature' }, 401);

  let body;
  try { body = JSON.parse(rawBody); } catch { return json({ error: 'bad_body' }, 400); }
  if (!isRequestId(body.requestId) || body.status !== 'SUCCESS') return json({ error: 'bad_body' }, 400);

  // issued일 때만 rewarded로 바꾼다. 재전송·이미 수령한 건은 아무것도 바꾸지 않고 2xx로 끝낸다
  await env.ONESTORE_ADS_DB
    .prepare("UPDATE onestore_ad_rewards SET state = 'rewarded', rewarded_at = ?2 WHERE request_id = ?1 AND state = 'issued'")
    .bind(body.requestId, Date.now())
    .run();
  return json({ ok: true });
}
