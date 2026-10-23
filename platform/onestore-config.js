/* 원스토어 설정값 — ONEconsole에서 발급받은 값만 넣는다. 비밀값이 아니므로 Git에 있어도 된다.
   (SSV 콜백 API Key는 비밀값이라 여기 두지 않고 Cloudflare 환경변수 ONESTORE_ADS_API_KEY에 둔다) */

/* 리워드 광고 지면 ID — APPS > 상품현황 > 수익화 > 인앱 광고 > 리워드 비디오 [ID 발급 요청]으로 받는다.
   비어 있으면 광고 부활 기능이 꺼진다(팝업이 나오지 않는다). 테스트용 지면 ID는 원스토어가 제공하지 않는다. */
export const REWARDED_PLACEMENT_ID = '';
