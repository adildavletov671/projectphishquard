/*
# Create rate_limits table for IP-based daily check limiting

1. Purpose
   - Tracks how many phishing-check requests each IP address has made in the current UTC day.
   - Used by the analyze-email edge function to enforce a 5-checks-per-day-per-IP limit.
   - No sign-in / accounts in this app, so the table is keyed by IP address + the calendar day.

2. New Tables
   - `rate_limits`
     - `id` (uuid, primary key)
     - `ip` (inet, not null) — the client IP address
     - `check_date` (date, not null) — the UTC calendar day this row counts
     - `count` (integer, not null, default 0) — number of checks performed that day
     - `created_at` (timestamptz, default now())
     - `updated_at` (timestamptz, default now())
   - Unique constraint on (ip, check_date) so each IP has exactly one row per day.

3. Indexes
   - `rate_limits_ip_check_date_key` — unique index on (ip, check_date) for fast lookups and upserts.

4. Security
   - Enable RLS on `rate_limits`.
   - The table is written and read ONLY by the edge function (which uses the service role key and bypasses RLS).
   - The anon-key frontend never touches this table directly, so no anon policies are needed.
   - No policies are created: the table is locked to all anon/authenticated direct access by default, and only the service-role edge function can read/write it.
*/

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip inet NOT NULL,
  check_date date NOT NULL DEFAULT CURRENT_DATE,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rate_limits_ip_check_date_key
  ON rate_limits (ip, check_date);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
