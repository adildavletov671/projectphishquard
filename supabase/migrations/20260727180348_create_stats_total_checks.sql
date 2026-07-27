/*
# Create stats table for total checks counter

1. New Tables
- `stats`
  - `id` (int, primary key, always 1) — enforces a single-row design
  - `total_checks` (int, not null, default 0) — running count of all email analyses performed
  - `updated_at` (timestamptz) — last time the counter changed
2. Security
- Enable RLS on `stats`.
- Allow anon + authenticated to SELECT (read-only) so the frontend can display the counter if desired.
- Writes happen only via the SECURITY DEFINER RPC `increment_total_checks()`, called from the edge function with the service role key.
3. Functions
- `increment_total_checks()` — atomically increments `total_checks` by 1 and returns the new value. SECURITY DEFINER so it works regardless of the caller's RLS context.
4. Important Notes
- Single-row design: the `id` column is pinned to 1 and a seed row is inserted with ON CONFLICT DO NOTHING.
- The counter increments on every successful analysis (admin or not).
*/

CREATE TABLE IF NOT EXISTS stats (
  id int PRIMARY KEY DEFAULT 1,
  total_checks int NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO stats (id, total_checks) VALUES (1, 0)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_stats" ON stats;
CREATE POLICY "anon_read_stats" ON stats FOR SELECT
  TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION increment_total_checks()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE stats SET total_checks = total_checks + 1, updated_at = now() WHERE id = 1;
  RETURN (SELECT total_checks FROM stats WHERE id = 1);
END;
$$;