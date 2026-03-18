-- ============================================
-- Storage Bucket for Filing Attachments
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'filing-attachments',
  'filing-attachments',
  false,
  10485760,  -- 10MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/csv',
    'text/plain',
    'image/png',
    'image/jpeg'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Files stored under: {company_id}/{filing_id}/{filename}

CREATE POLICY "team_upload_attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'filing-attachments'
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.company_id = (storage.foldername(name))[1]::uuid
      AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "team_read_attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'filing-attachments'
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.company_id = (storage.foldername(name))[1]::uuid
      AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "team_delete_attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'filing-attachments'
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.company_id = (storage.foldername(name))[1]::uuid
      AND tm.user_id = auth.uid()
      AND tm.role IN ('Admin', 'Preparer')
  )
);
