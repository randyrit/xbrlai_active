-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

GRANT USAGE ON SCHEMA cron TO postgres;

-- Weekly: prune activity log entries older than 1 year (Sunday 3 AM UTC)
SELECT cron.schedule(
  'prune-activity-log',
  '0 3 * * 0',
  $$SELECT prune_activity_log(365)$$
);

-- Monthly: prune resolved validation issues older than 90 days (1st at 4 AM UTC)
CREATE OR REPLACE FUNCTION prune_resolved_validation_issues(retention_days INT DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted INT;
BEGIN
  DELETE FROM validation_issues
    WHERE is_resolved = true
      AND resolved_at < now() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'prune-resolved-validations',
  '0 4 1 * *',
  $$SELECT prune_resolved_validation_issues(90)$$
);
