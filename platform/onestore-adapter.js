/* =====================================================================
   원스토어 H5 Game SDK 어댑터 — SDK와 게임 연결점(window.WarriorUp) 사이의 로직
   ---------------------------------------------------------------------
   · 기준: 원스토어 웹게임 Web SDK 연동 가이드 v1.1.0 (03. Lifecycle 관리)
     https://onestore-dev.gitbook.io/dev/tools/web-sdk/lifecycle
   · SDK 객체를 인자로 받으므로 테스트에서 모의 객체로 바꿔 끼울 수 있다.
   · 결제(IAP)·광고(IAA)는 게임에 없는 기능이라 연동하지 않는다.
   ===================================================================== */

const LOAD_WAIT_MS = 8000;   // 이미지·폰트 로딩을 기다리는 최대 시간. 넘으면 그대로 시작한다
const INIT_TRIES = 2;        // initializeAsync는 실패 시 상태가 초기화되어 재시도할 수 있다

const APP_CSS = `
html.os-app body{
  min-height:100dvh;
  padding-top:calc(12px + var(--os-safe-top,0px));
  padding-right:calc(12px + var(--os-safe-right,0px));
  padding-bottom:calc(24px + var(--os-safe-bottom,0px));
  padding-left:calc(12px + var(--os-safe-left,0px));
  overscroll-behavior:none;
}
html.os-app .toastBox{top:calc(16px + var(--os-safe-top,0px))}
html.os-app .modal{
  padding:calc(18px + var(--os-safe-top,0px)) calc(18px + var(--os-safe-right,0px))
          calc(18px + var(--os-safe-bottom,0px)) calc(18px + var(--os-safe-left,0px));
}`;

export function connectOneStore(sdk, win = window) {
  const doc = win.document;
  const game = () => win.WarriorUp;   // 게임 스크립트(index.html)가 만드는 연결점

  /* ── Lifecycle 리스너: initializeAsync() 전에 등록 ─────────────── */
  sdk.on('pause', () => {
    // reason: "background" | "ad" | "payment". 여러 번 와도 결과가 같다
    game()?.pauseAudio();
  });
  sdk.on('resume', (e) => {
    const g = game();
    if (!g) return;
    // ringerSilent는 pause~resume 사이 무음 모드가 바뀐 경우에만 실려 온다
    if (e && typeof e.ringerSilent === 'boolean') g.setSound(!e.ringerSilent);
    g.resumeAudio();
  });
  sdk.on('exit', () => {
    // 저장할 진행 데이터가 없는 게임이다(새로고침하면 처음부터). 소리만 멈춘다.
    // 저장 기능이 생기면 여기서 동기적으로, 0.5초 안에 저장할 것. quit() 재호출 불필요
    game()?.pauseAudio();
  });
  sdk.onBackPressed(() => {
    // 동기 함수여야 한다(앱이 200ms 안에 회신을 기다림). 정확히 true일 때만 소비로 처리된다
    const g = game();
    return g ? g.closePopup() === true : false;
  });

  /* ── 부팅: 초기화 → 로딩 진행률 → 시작 ─────────────────────────── */
  return initialize(INIT_TRIES)
    .then((info) => {
      if (info.err) {
        // 미지원 환경(일반 브라우저 등). reject가 아니라 err를 담아 resolve된다.
        // 게임은 이미 실행 중이므로 손대지 않는다
        return markPlatform('web', info.err);
      }
      applyEnvironment(info);
      sdk.setLoadingProgress(30);
      return waitForAssets()
        .then(() => {
          sdk.setLoadingProgress(100);
          return sdk.startGameAsync();   // 성공하면 앱이 로딩 화면을 걷고 게임을 보여준다
        })
        .then(() => markPlatform('onestore'))
        .catch((e) => {
          console.error('[onestore] startGameAsync 실패', e?.reason, e?.message);
          return markPlatform('onestore-error', e?.reason);
        });
    })
    .catch((e) => {
      console.error('[onestore] initializeAsync 실패', e?.reason, e?.message);
      return markPlatform('web', e?.reason);
    });

  function initialize(triesLeft) {
    return sdk.initializeAsync().catch((e) => {
      if (triesLeft <= 1) throw e;
      return initialize(triesLeft - 1);
    });
  }

  function applyEnvironment(info) {
    const root = doc.documentElement;
    const area = info.safeArea || {};
    for (const side of ['top', 'right', 'bottom', 'left']) {
      root.style.setProperty(`--os-safe-${side}`, `${Number(area[side]) || 0}px`);
    }
    const style = doc.createElement('style');
    style.id = 'onestore-app-css';
    style.textContent = APP_CSS;
    doc.head.appendChild(style);
    root.classList.add('os-app');
    if (info.ringerSilent === true) game()?.setSound(false);
  }

  // 화면에 걸린 이미지·웹폰트가 받아질 때까지(최대 LOAD_WAIT_MS) 기다린다
  function waitForAssets() {
    const pageLoaded = doc.readyState === 'complete'
      ? Promise.resolve()
      : new Promise((res) => win.addEventListener('load', res, { once: true }));
    const fontsReady = doc.fonts ? doc.fonts.ready : Promise.resolve();
    const timeout = new Promise((res) => win.setTimeout(res, LOAD_WAIT_MS));
    return Promise.race([Promise.all([pageLoaded, fontsReady]), timeout]);
  }

  function markPlatform(platform, reason) {
    doc.documentElement.dataset.platform = platform;
    return { platform, reason };
  }
}
