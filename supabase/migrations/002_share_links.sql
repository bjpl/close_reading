-- Share Links Table Migration
-- Enables public read-only document sharing via unique tokens

CREATE TABLE share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  access_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_share_links_token ON share_links(token);
CREATE INDEX idx_share_links_document ON share_links(document_id);
CREATE INDEX idx_share_links_created_by ON share_links(created_by);
CREATE INDEX idx_share_links_expires_at ON share_links(expires_at) WHERE expires_at IS NOT NULL;

-- RLS Policies
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

-- Users can create share links for their documents
CREATE POLICY "Users can create share links" ON share_links
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (SELECT 1 FROM documents WHERE id = document_id AND user_id = auth.uid())
  );

-- Users can view their own share links
CREATE POLICY "Users can view own share links" ON share_links
  FOR SELECT USING (created_by = auth.uid());

-- Users can delete their own share links
CREATE POLICY "Users can delete own share links" ON share_links
  FOR DELETE USING (created_by = auth.uid());

-- Anyone can access share links (for validation)
CREATE POLICY "Anyone can access via token" ON share_links
  FOR SELECT USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_share_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_share_links_updated_at
  BEFORE UPDATE ON share_links
  FOR EACH ROW
  EXECUTE FUNCTION update_share_links_updated_at();

-- Function to clean up expired share links (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_share_links()
RETURNS void AS $$
BEGIN
  DELETE FROM share_links
  WHERE expires_at IS NOT NULL
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;
