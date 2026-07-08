CREATE TABLE IF NOT EXISTS export_records (
  export_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  username TEXT NOT NULL DEFAULT '',
  export_type TEXT NOT NULL,
  filename TEXT NOT NULL DEFAULT '',
  scope_label TEXT NOT NULL DEFAULT '',
  event_count INTEGER NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  source_count INTEGER NOT NULL DEFAULT 0 CHECK (source_count >= 0),
  data_release_id TEXT NOT NULL DEFAULT '',
  methodology_version TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS export_records_organization_created_idx
  ON export_records(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS export_records_user_created_idx
  ON export_records(user_id, created_at DESC);
