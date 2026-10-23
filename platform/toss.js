/* 토스 앱인토스 진입점 — 토스 빌드에서 index.html의 platform/onestore.js 대신 넣는다.
   원스토어 SDK·광고 코드는 import하지 않는다. 판별 근거는 "토스 빌드에만 이 파일이 들어간다"는 빌드 구성이다.
   게임 스크립트(본문 끝 일반 <script>)가 먼저 실행되므로 window.WarriorUp은 이미 있다. */
import { connectTossAds } from './toss-ads.js';

document.documentElement.dataset.platform = 'toss';
document.documentElement.dataset.ads = connectTossAds();
