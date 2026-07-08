CREATE TABLE IF NOT EXISTS access_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  organization TEXT NOT NULL DEFAULT '',
  requester_role TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'account',
  status TEXT NOT NULL DEFAULT 'new',
  requested_by_username TEXT NOT NULL DEFAULT '',
  requested_by_role TEXT NOT NULL DEFAULT '',
  reviewed_by_username TEXT NOT NULL DEFAULT '',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS access_requests_status_idx ON access_requests(status);
CREATE INDEX IF NOT EXISTS access_requests_created_at_idx ON access_requests(created_at DESC);
