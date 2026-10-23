/* 원스토어 H5 Game SDK 진입점 — index.html <head>에서 type="module"로 로드한다.
   SDK 버전은 릴리즈 노트의 최신 버전(v1.1.0, 2026-10-23 확인)을 쓴다.
   https://onestore-dev.gitbook.io/dev/tools/web-sdk/releasenote
   일반 브라우저에서는 initializeAsync()가 err로 응답해 게임을 그대로 둔다.
   CDN을 받지 못해도 이 모듈만 실패하고 게임 스크립트는 영향을 받지 않는다.
   토스 앱인토스 빌드에는 이 파일과 onestore-*.js가 들어가지 않는다(platform/ONESTORE.md 참고). */
import { createSDK } from 'https://h5sdk.onestore.net/lib/v1.1.0/onestore-h5-sdk.min.js';
import { connectOneStore } from './onestore-adapter.js';
import { connectOneStoreAds } from './onestore-ads.js';

const sdk = createSDK();
connectOneStore(sdk).then((r) => {
  // 광고는 원스토어 앱 안에서 시작에 성공했을 때만 켠다 (isSupported는 initializeAsync 이후에만 확정)
  if (r.platform === 'onestore') {
    document.documentElement.dataset.ads = connectOneStoreAds(sdk, { playerId: r.playerId });
  }
});
