-- ============================================
-- Add unique constraint for filing upserts
-- and update document_rows for multi-statement support
-- ============================================

-- Unique constraint on filings for upsert (company + period + type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_filings_company_period_type
  ON filings(company_id, period_end, filing_type);

-- Add statement_type column to document_rows to distinguish BS/IS/CF rows
ALTER TABLE document_rows
  ADD COLUMN IF NOT EXISTS statement_type TEXT DEFAULT 'bs'
  CHECK (statement_type IN ('bs', 'is', 'cf'));

CREATE INDEX IF NOT EXISTS idx_document_rows_statement
  ON document_rows(filing_id, statement_type);
