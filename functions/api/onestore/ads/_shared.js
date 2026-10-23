/* 원스토어 리워드 광고 보상 검증 — 공용 코드
   흐름: request-id(발급) → [광고 시청] → postback(원스토어 SSV가 확정) → claim(게임이 1회 수령)
   상태: issued → rewarded → claimed. 각 전이는 조건부 UPDATE라 두 번 일어나지 않는다.

   Cloudflare Pages 설정(대시보드에서 직접):
   · D1 바인딩  ONESTORE_ADS_DB      — 테이블은 platform/onestore-ads-schema.sql
   · 비밀 변수  ONESTORE_ADS_API_KEY — ONEconsole 인앱 광고 화면에 등록한 API Key와 같은 값 */

export const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000;   // SSV x-TIMESTAMP 허용 오차(가이드 예시 ±5분)

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export function notConfigured(env, needKey) {
  return !env.ONESTORE_ADS_DB || (needKey && !env.ONESTORE_ADS_API_KEY);
}

// playerId는 원스토어가 주는 게임별 가명 ID. 없을 수 있고, 있으면 발급·수령 때 같은 값이어야 한다
export function cleanPlayerId(v) {
  return typeof v === 'string' && v.length > 0 && v.length <= 128 ? v : null;
}

export function isRequestId(v) {
  return typeof v === 'string' && /^[0-9a-f-]{36}$/.test(v);
}

export async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}

export async function hmacHex(key, message) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(message)));
  return [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
