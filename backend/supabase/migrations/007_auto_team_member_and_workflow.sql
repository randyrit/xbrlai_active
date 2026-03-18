-- ============================================
-- Auto Team Member + Filing Workflow Triggers
-- ============================================

-- 1. Auto-add company creator as Admin team member
CREATE OR REPLACE FUNCTION auto_add_company_creator()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO team_members (company_id, user_id, name, email, role, accepted_at)
    SELECT
      NEW.id,
      NEW.created_by,
      COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
      u.email,
      'Admin',
      now()
    FROM auth.users u
    WHERE u.id = NEW.created_by
    ON CONFLICT (company_id, email) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_add_company_creator
  AFTER INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION auto_add_company_creator();

-- 2. Auto-transition filing status based on checklist progress
CREATE OR REPLACE FUNCTION auto_transition_filing_status()
RETURNS TRIGGER AS $$
DECLARE
  total INT;
  completed INT;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE status = 'complete')
  INTO total, completed
  FROM filing_items
  WHERE filing_id = NEW.filing_id;

  IF total > 0 THEN
    IF completed = total THEN
      UPDATE filings SET status = 'in-review'
        WHERE id = NEW.filing_id AND status = 'in-progress';
    ELSIF completed < total THEN
      UPDATE filings SET status = 'in-progress'
        WHERE id = NEW.filing_id AND status = 'in-review';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_transition_filing_status
  AFTER UPDATE OF status ON filing_items
  FOR EACH ROW EXECUTE FUNCTION auto_transition_filing_status();

-- 3. Dashboard summary RPC (single call instead of 6 queries)
CREATE OR REPLACE FUNCTION get_filing_dashboard(p_filing_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'filing', (SELECT row_to_json(f) FROM filings f WHERE f.id = p_filing_id),
    'item_counts', (
      SELECT jsonb_build_object(
        'total', count(*),
        'complete', count(*) FILTER (WHERE status = 'complete'),
        'in_progress', count(*) FILTER (WHERE status = 'in-progress'),
        'in_review', count(*) FILTER (WHERE status = 'in-review'),
        'not_started', count(*) FILTER (WHERE status = 'not-started'),
        'blocked', count(*) FILTER (WHERE is_blocked = true)
      )
      FROM filing_items WHERE filing_id = p_filing_id
    ),
    'validation_counts', (
      SELECT jsonb_build_object(
        'errors', count(*) FILTER (WHERE severity = 'error'),
        'warnings', count(*) FILTER (WHERE severity = 'warning'),
        'info', count(*) FILTER (WHERE severity = 'info')
      )
      FROM validation_issues WHERE filing_id = p_filing_id AND NOT is_resolved
    ),
    'statement_row_counts', (
      SELECT jsonb_build_object(
        'bs', count(*) FILTER (WHERE statement_type = 'bs'),
        'is', count(*) FILTER (WHERE statement_type = 'is'),
        'cf', count(*) FILTER (WHERE statement_type = 'cf')
      )
      FROM document_rows WHERE filing_id = p_filing_id
    ),
    'recent_activity', (
      SELECT COALESCE(jsonb_agg(row_to_json(a) ORDER BY a.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT action, target, detail, created_at
        FROM activity_log WHERE filing_id = p_filing_id
        ORDER BY created_at DESC LIMIT 10
      ) a
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
