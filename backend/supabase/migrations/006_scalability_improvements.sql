-- ============================================
-- Scalability & Futureproofing Improvements
-- ============================================

-- 1. Raw numeric columns on document_rows for DB-level calculations
ALTER TABLE document_rows
  ADD COLUMN IF NOT EXISTS value_current_raw NUMERIC,
  ADD COLUMN IF NOT EXISTS value_prior_raw NUMERIC,
  ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'monetary'
    CHECK (unit_type IN ('monetary', 'perShare', 'shares')),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TRIGGER trg_document_rows_updated_at
  BEFORE UPDATE ON document_rows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Composite index on team_members for RLS helper performance
CREATE INDEX IF NOT EXISTS idx_team_members_company_user
  ON team_members(company_id, user_id);

-- 3. Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_filing_items_filing_status
  ON filing_items(filing_id, status);

CREATE INDEX IF NOT EXISTS idx_document_rows_filing_statement_sort
  ON document_rows(filing_id, statement_type, sort_order);

CREATE INDEX IF NOT EXISTS idx_xbrl_tags_filing_status
  ON xbrl_tags(filing_id, status);

CREATE INDEX IF NOT EXISTS idx_flags_row_resolved
  ON flags(document_row_id) WHERE NOT resolved;

CREATE INDEX IF NOT EXISTS idx_comments_row
  ON comments(document_row_id);

CREATE INDEX IF NOT EXISTS idx_comments_filing_item
  ON comments(filing_item_id);

CREATE INDEX IF NOT EXISTS idx_disclosure_sections_filing
  ON disclosure_sections(filing_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_source_files_filing
  ON source_files(filing_id);

-- 4. Missing taxonomy element
INSERT INTO taxonomy_elements (id, label, data_type, period_type, balance, documentation, parent_group, sort_order)
VALUES ('us-gaap:OtherAssetsNoncurrent', 'Other Non-current Assets', 'monetaryItemType', 'instant', 'debit',
        'Amount of noncurrent assets classified as other.', 'us-gaap-bs', 19)
ON CONFLICT (id) DO NOTHING;

-- 5. Auto-compute filing progress from checklist item statuses
CREATE OR REPLACE FUNCTION compute_filing_progress(p_filing_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total INT;
  completed INT;
  pct INT;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE status = 'complete')
    INTO total, completed
    FROM filing_items
    WHERE filing_id = p_filing_id;

  IF total = 0 THEN pct := 0;
  ELSE pct := ROUND((completed::NUMERIC / total) * 100);
  END IF;

  UPDATE filings SET progress_pct = pct WHERE id = p_filing_id;
  RETURN pct;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trg_update_filing_progress()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM compute_filing_progress(NEW.filing_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_filing_items_progress
  AFTER INSERT OR UPDATE OF status ON filing_items
  FOR EACH ROW EXECUTE FUNCTION trg_update_filing_progress();

-- 6. Activity log pruning function
CREATE OR REPLACE FUNCTION prune_activity_log(retention_days INT DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted INT;
BEGIN
  DELETE FROM activity_log
    WHERE created_at < now() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Validation issues index for dashboard summaries
CREATE INDEX IF NOT EXISTS idx_validation_issues_filing_severity
  ON validation_issues(filing_id, severity) WHERE NOT is_resolved;
