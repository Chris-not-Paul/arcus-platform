CREATE TABLE IF NOT EXISTS usage_quotas (
  day DATE NOT NULL,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  resource TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (day, organization_id, user_id, resource)
);

CREATE INDEX IF NOT EXISTS usage_quotas_org_day_idx
  ON usage_quotas(organization_id, day DESC);
