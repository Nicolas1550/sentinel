-- Run once in Neon SQL Editor for SENTINEL V4.
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
 key TEXT PRIMARY KEY,
 count INTEGER NOT NULL DEFAULT 0,
 expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_expiry ON rate_limit_buckets(expires_at);
-- Periodically: DELETE FROM rate_limit_buckets WHERE expires_at < NOW() - INTERVAL '1 day';
