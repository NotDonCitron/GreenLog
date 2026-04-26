CREATE TABLE IF NOT EXISTS scraper_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id text NOT NULL,
  line text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scraper_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY scraper_logs_read ON scraper_logs FOR SELECT USING (true);
CREATE POLICY scraper_logs_insert ON scraper_logs FOR INSERT WITH CHECK (true);

CREATE INDEX idx_scraper_logs_run_id ON scraper_logs(run_id);
CREATE INDEX idx_scraper_logs_created_at ON scraper_logs(created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE scraper_logs;
