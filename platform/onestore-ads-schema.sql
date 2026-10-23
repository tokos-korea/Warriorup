-- 원스토어 리워드 광고 보상 기록 (Cloudflare D1, 바인딩 이름 ONESTORE_ADS_DB)
-- Cloudflare 대시보드 > D1 > 해당 데이터베이스 > Console에서 한 번 실행한다.
CREATE TABLE IF NOT EXISTS onestore_ad_rewards (
  request_id  TEXT PRIMARY KEY,   -- 서버가 발급한 requestId (UUID)
  player_id   TEXT,               -- 원스토어 playerId (없을 수 있음)
  state       TEXT NOT NULL,      -- issued → rewarded(포스트백 확인) → claimed(게임이 수령)
  issued_at   INTEGER NOT NULL,   -- epoch ms
  rewarded_at INTEGER,
  claimed_at  INTEGER
);
CREATE INDEX IF NOT EXISTS onestore_ad_rewards_issued_at ON onestore_ad_rewards (issued_at);
