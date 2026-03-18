-- ============================================
-- Row-Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE filing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE disclosure_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE xbrl_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE signoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE filing_item_attachments ENABLE ROW LEVEL SECURITY;
-- taxonomy_elements is public reference data, no RLS needed

-- Helper: check if user is a team member of a company
CREATE OR REPLACE FUNCTION is_team_member(company UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE company_id = company AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if user is admin of a company
CREATE OR REPLACE FUNCTION is_company_admin(company UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE company_id = company AND user_id = auth.uid() AND role = 'Admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Companies ──
-- Team members can view their companies
CREATE POLICY "team_members_view_company" ON companies
  FOR SELECT USING (is_team_member(id));

-- Any authenticated user can create a company (they become admin)
CREATE POLICY "authenticated_create_company" ON companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can update company details
CREATE POLICY "admin_update_company" ON companies
  FOR UPDATE USING (is_company_admin(id));

-- ── Filings ──
CREATE POLICY "team_view_filings" ON filings
  FOR SELECT USING (is_team_member(company_id));

CREATE POLICY "team_insert_filings" ON filings
  FOR INSERT WITH CHECK (is_team_member(company_id));

CREATE POLICY "team_update_filings" ON filings
  FOR UPDATE USING (is_team_member(company_id));

-- ── Filing Items ──
CREATE POLICY "team_view_filing_items" ON filing_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM filings f WHERE f.id = filing_id AND is_team_member(f.company_id))
  );

CREATE POLICY "team_manage_filing_items" ON filing_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM filings f WHERE f.id = filing_id AND is_team_member(f.company_id))
  );

-- ── Disclosure Sections ──
CREATE POLICY "team_view_disclosure_sections" ON disclosure_sections
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM filings f WHERE f.id = filing_id AND is_team_member(f.company_id))
  );

CREATE POLICY "team_manage_disclosure_sections" ON disclosure_sections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM filings f WHERE f.id = filing_id AND is_team_member(f.company_id))
  );

-- ── Document Rows ──
CREATE POLICY "team_view_document_rows" ON document_rows
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM filings f WHERE f.id = filing_id AND is_team_member(f.company_id))
  );

CREATE POLICY "team_manage_document_rows" ON document_rows
  FOR ALL USING (
    EXISTS (SELECT 1 FROM filings f WHERE f.id = filing_id AND is_team_member(f.company_id))
  );

-- ── Source Files ──
CREATE POLICY "team_view_source_files" ON source_files
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM filings f WHERE f.id = filing_id AND is_team_member(f.company_id))
  );

CREATE POLICY "team_manage_source_files" ON source_files
  FOR ALL USING (
    EXISTS (SELECT 1 FROM filings f WHERE f.id = filing_id AND is_team_member(f.company_id))
  );

-- ── Source Breakdowns ──
CREATE POLICY "team_view_source_breakdowns" ON source_breakdowns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM document_rows dr
      JOIN filings f ON f.id = dr.filing_id
      WHERE dr.id = document_row_id AND is_team_member(f.company_id)
    )
  );

CREATE POLICY "team_manage_source_breakdowns" ON source_breakdowns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM document_rows dr
      JOIN filings f ON f.id = dr.filing_id
      WHERE dr.id = document_row_id AND is_team_member(f.company_id)
    )
  );

-- ── XBRL Tags ──
CREATE POLICY "team_view_xbrl_tags" ON xbrl_tags
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM filings f WHERE f.id = filing_id AND is_team_member(f.company_id))
  );

CREATE POLICY "team_manage_xbrl_tags" ON xbrl_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM filings f WHERE f.id = filing_id AND is_team_member(f.company_id))
  );

-- ── Overrides, Flags, Comments ──
CREATE POLICY "team_view_overrides" ON overrides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM document_rows dr
      JOIN filings f ON f.id = dr.filing_id
      WHERE dr.id = document_row_id AND is_team_member(f.company_id)
    )
  );

CREATE POLICY "team_manage_overrides" ON overrides
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM document_rows dr
      JOIN filings f ON f.id = dr.filing_id
      WHERE dr.id = document_row_id AND is_team_member(f.company_id)
    )
  );

CREATE POLICY "team_view_flags" ON flags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM document_rows dr
      JOIN filings f ON f.id = dr.filing_id
      WHERE dr.id = document_row_id AND is_team_member(f.company_id)
    )
  );

CREATE POLICY "team_manage_flags" ON flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM document_rows dr
      JOIN filings f ON f.id = dr.filing_id
      WHERE dr.id = document_row_id AND is_team_member(f.company_id)
    )
  );

CREATE POLICY "team_view_comments" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM document_rows dr
      JOIN filings f ON f.id = dr.filing_id
      WHERE dr.id = document_row_id AND is_team_member(f.company_id)
    )
    OR EXISTS (
      SELECT 1 FROM filing_items fi
      JOIN filings f ON f.id = fi.filing_id
      WHERE fi.id = filing_item_id AND is_team_member(f.company_id)
    )
  );

CREATE POLICY "team_insert_comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── Sign-offs ──
CREATE POLICY "team_view_signoffs" ON signoffs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM filing_items fi
      JOIN filings f ON f.id = fi.filing_id
      WHERE fi.id = filing_item_id AND is_team_member(f.company_id)
    )
  );

CREATE POLICY "team_insert_signoffs" ON signoffs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Activity Log ──
CREATE POLICY "team_view_activity" ON activity_log
  FOR SELECT USING (is_team_member(company_id));

CREATE POLICY "team_insert_activity" ON activity_log
  FOR INSERT WITH CHECK (is_team_member(company_id));

-- ── Team Members ──
CREATE POLICY "team_view_members" ON team_members
  FOR SELECT USING (is_team_member(company_id));

CREATE POLICY "admin_manage_members" ON team_members
  FOR ALL USING (is_company_admin(company_id));

-- Allow users to insert themselves as admin when creating a new company
CREATE POLICY "self_insert_as_admin" ON team_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ── Validation Issues ──
CREATE POLICY "team_view_validation" ON validation_issues
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM filings f WHERE f.id = filing_id AND is_team_member(f.company_id))
  );

CREATE POLICY "team_manage_validation" ON validation_issues
  FOR ALL USING (
    EXISTS (SELECT 1 FROM filings f WHERE f.id = filing_id AND is_team_member(f.company_id))
  );

-- ── Filing Item Attachments ──
CREATE POLICY "team_view_attachments" ON filing_item_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM filing_items fi
      JOIN filings f ON f.id = fi.filing_id
      WHERE fi.id = filing_item_id AND is_team_member(f.company_id)
    )
  );

CREATE POLICY "team_manage_attachments" ON filing_item_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM filing_items fi
      JOIN filings f ON f.id = fi.filing_id
      WHERE fi.id = filing_item_id AND is_team_member(f.company_id)
    )
  );

-- ── Taxonomy Elements (public read) ──
-- No RLS — public reference data
GRANT SELECT ON taxonomy_elements TO anon, authenticated;
