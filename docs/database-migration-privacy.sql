-- Privacy Settings and Audit Log Tables
-- Week 4: Ollama Integration and Privacy Mode

-- Privacy Settings Table
CREATE TABLE IF NOT EXISTS privacy_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  privacy_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  preferred_provider VARCHAR(50) NOT NULL DEFAULT 'ollama',
  allow_cloud_processing BOOLEAN NOT NULL DEFAULT true,
  require_confirmation_for_cloud BOOLEAN NOT NULL DEFAULT true,
  pii_detection_enabled BOOLEAN NOT NULL DEFAULT true,
  data_retention_days INTEGER NOT NULL DEFAULT 90,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Privacy Audit Log Table
CREATE TABLE IF NOT EXISTS privacy_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  pii_detected BOOLEAN DEFAULT false,
  pii_types TEXT[],
  user_approved BOOLEAN,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_privacy_settings_user_id
  ON privacy_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_user_id
  ON privacy_audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_timestamp
  ON privacy_audit_log(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_action
  ON privacy_audit_log(action);

-- RLS (Row Level Security) Policies
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_audit_log ENABLE ROW LEVEL SECURITY;

-- Privacy Settings Policies
CREATE POLICY "Users can view their own privacy settings"
  ON privacy_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy settings"
  ON privacy_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings"
  ON privacy_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own privacy settings"
  ON privacy_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Privacy Audit Log Policies
CREATE POLICY "Users can view their own audit log"
  ON privacy_audit_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit log entries"
  ON privacy_audit_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: No UPDATE or DELETE policies for audit log (immutable)

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on privacy_settings
CREATE TRIGGER update_privacy_settings_updated_at
  BEFORE UPDATE ON privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old audit logs based on retention policy
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM privacy_audit_log
  WHERE timestamp < NOW() - INTERVAL '1 day' * (
    SELECT COALESCE(data_retention_days, 90)
    FROM privacy_settings
    WHERE user_id = privacy_audit_log.user_id
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- Optional: Schedule regular cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * *', 'SELECT cleanup_old_audit_logs()');

-- Comments for documentation
COMMENT ON TABLE privacy_settings IS 'User privacy settings and preferences for AI processing';
COMMENT ON TABLE privacy_audit_log IS 'Audit trail of privacy-related events and data processing';
COMMENT ON COLUMN privacy_settings.privacy_mode_enabled IS 'When true, only local providers (Ollama, Browser ML) are used';
COMMENT ON COLUMN privacy_settings.preferred_provider IS 'Preferred AI provider: ollama, claude, or browser-ml';
COMMENT ON COLUMN privacy_settings.allow_cloud_processing IS 'Whether cloud providers are allowed';
COMMENT ON COLUMN privacy_settings.require_confirmation_for_cloud IS 'Require user confirmation before sending data to cloud';
COMMENT ON COLUMN privacy_settings.pii_detection_enabled IS 'Enable automatic PII detection and sanitization';
COMMENT ON COLUMN privacy_settings.data_retention_days IS 'Number of days to retain audit logs';
COMMENT ON COLUMN privacy_audit_log.action IS 'Type of privacy event: cloud-processing, pii-detected, data-sanitized, provider-switched';
COMMENT ON COLUMN privacy_audit_log.pii_types IS 'Array of PII types detected: email, phone, ssn, credit-card, etc.';
