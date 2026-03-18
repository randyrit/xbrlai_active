-- ============================================
-- XBRL Disclosure App — Initial Schema
-- ============================================

-- Companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ticker TEXT NOT NULL,
  cik TEXT NOT NULL UNIQUE,
  sic TEXT,
  state_of_incorp TEXT,
  fiscal_year_end TEXT DEFAULT 'December 31',
  filer_category TEXT DEFAULT 'Large Accelerated Filer',
  logo_url TEXT,
  color TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Filings (10-Q, 10-K, amendments)
CREATE TABLE filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  filing_type TEXT NOT NULL CHECK (filing_type IN ('10-K', '10-Q', '10-K/A', '10-Q/A')),
  period TEXT NOT NULL,
  period_end DATE NOT NULL,
  filing_date DATE,
  deadline DATE NOT NULL,
  status TEXT DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'in-review', 'filed', 'amended')),
  progress_pct INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  accession_number TEXT,
  financial_data JSONB DEFAULT '{}',
  workflow_stages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_filings_company ON filings(company_id);
CREATE INDEX idx_filings_status ON filings(status);

-- Filing checklist items (Part I Item 1, etc.)
CREATE TABLE filing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID REFERENCES filings(id) ON DELETE CASCADE NOT NULL,
  part TEXT NOT NULL,
  item_number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'not-started' CHECK (status IN ('not-started', 'in-progress', 'in-review', 'complete')),
  assignee TEXT,
  reviewer TEXT,
  due_date DATE,
  is_blocked BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_filing_items_filing ON filing_items(filing_id);

-- Disclosure sections (Cover Page, Financial Statements, Notes)
CREATE TABLE disclosure_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID REFERENCES filings(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'not-started',
  tag_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Document rows (balance sheet line items)
CREATE TABLE document_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID REFERENCES filings(id) ON DELETE CASCADE NOT NULL,
  row_key TEXT NOT NULL,
  label TEXT NOT NULL,
  value_current TEXT,
  value_prior TEXT,
  xbrl_concept TEXT,
  indent_level INTEGER DEFAULT 0,
  is_bold BOOLEAN DEFAULT false,
  border_top TEXT,
  section_header TEXT,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(filing_id, row_key)
);

CREATE INDEX idx_document_rows_filing ON document_rows(filing_id);
CREATE INDEX idx_document_rows_concept ON document_rows(xbrl_concept);

-- Source files (Google Drive or uploaded)
CREATE TABLE source_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID REFERENCES filings(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  folder TEXT,
  modified_at TEXT,
  file_size TEXT,
  sheets TEXT[],
  status TEXT DEFAULT 'synced',
  external_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Source breakdowns (maps source file cells to document rows)
CREATE TABLE source_breakdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_row_id UUID REFERENCES document_rows(id) ON DELETE CASCADE NOT NULL,
  source_file_id UUID REFERENCES source_files(id),
  sheet_name TEXT,
  cell_reference TEXT,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  is_computed BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_source_breakdowns_row ON source_breakdowns(document_row_id);

-- XBRL tags
CREATE TABLE xbrl_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID REFERENCES filings(id) ON DELETE CASCADE NOT NULL,
  document_row_id UUID REFERENCES document_rows(id),
  concept TEXT NOT NULL,
  value TEXT NOT NULL,
  display_value TEXT,
  period TEXT,
  unit TEXT DEFAULT 'USD',
  decimals TEXT,
  status TEXT DEFAULT 'tagged' CHECK (status IN ('tagged', 'review', 'error', 'approved')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_xbrl_tags_filing ON xbrl_tags(filing_id);
CREATE INDEX idx_xbrl_tags_concept ON xbrl_tags(concept);

-- Taxonomy elements (US GAAP concepts)
CREATE TABLE taxonomy_elements (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  data_type TEXT,
  period_type TEXT,
  balance TEXT,
  documentation TEXT,
  parent_group TEXT,
  taxonomy_year TEXT DEFAULT '2026',
  sort_order INTEGER DEFAULT 0
);

-- ============================================
-- User Action Tables
-- ============================================

-- Overrides (manual value corrections)
CREATE TABLE overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_row_id UUID REFERENCES document_rows(id) ON DELETE CASCADE NOT NULL,
  original_value TEXT NOT NULL,
  override_value TEXT NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_overrides_row ON overrides(document_row_id) WHERE is_active = true;

-- Flags (flag for review)
CREATE TABLE flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_row_id UUID REFERENCES document_rows(id) ON DELETE CASCADE NOT NULL,
  flagged_by UUID REFERENCES auth.users(id),
  reason TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Comments (on rows or filing items)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_row_id UUID REFERENCES document_rows(id) ON DELETE CASCADE,
  filing_item_id UUID REFERENCES filing_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (document_row_id IS NOT NULL OR filing_item_id IS NOT NULL)
);

-- Sign-offs (preparer → reviewer chain)
CREATE TABLE signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_item_id UUID REFERENCES filing_items(id) ON DELETE CASCADE NOT NULL,
  signoff_type TEXT NOT NULL CHECK (signoff_type IN ('preparer', 'reviewer', 'approver')),
  user_id UUID REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(filing_item_id, signoff_type)
);

-- Activity log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  filing_id UUID REFERENCES filings(id),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  detail TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_log_company ON activity_log(company_id, created_at DESC);
CREATE INDEX idx_activity_log_filing ON activity_log(filing_id, created_at DESC);

-- Team members
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Preparer', 'Reviewer', 'XBRL Tagger', 'Approver', 'Admin')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(company_id, email)
);

-- Validation issues
CREATE TABLE validation_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID REFERENCES filings(id) ON DELETE CASCADE NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
  section TEXT,
  message TEXT NOT NULL,
  rule TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_validation_issues_filing ON validation_issues(filing_id) WHERE NOT is_resolved;

-- Attachments for filing items
CREATE TABLE filing_item_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_item_id UUID REFERENCES filing_items(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Updated_at triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_filings_updated_at BEFORE UPDATE ON filings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_filing_items_updated_at BEFORE UPDATE ON filing_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_disclosure_sections_updated_at BEFORE UPDATE ON disclosure_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
