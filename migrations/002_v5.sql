-- SENTINEL V5: safe additive indexes. Run after 001_v4.sql.
-- Existing accounts, applications, events and API keys are preserved.
CREATE INDEX IF NOT EXISTS idx_sentinel_v5_burst ON security_events(application_id,source_ip,occurred_at DESC) WHERE event_type IN ('login.failed','failed.login');
CREATE INDEX IF NOT EXISTS idx_sentinel_v5_incidents ON incidents(application_id,detected_at DESC);
-- Reclassify only recognized events from earlier versions; no deletion.
UPDATE security_events SET severity='high' WHERE event_type IN ('login_blocked','login.blocked','rate_limit_exceeded','rate.limit.exceeded') AND severity='info';
UPDATE security_events SET severity='low' WHERE event_type IN ('failed.login','login.failed','registration_failed','registration.failed') AND severity='info';
UPDATE security_events SET severity='medium' WHERE event_type IN ('unauthorized_access','unauthorized.access') AND severity='info';
