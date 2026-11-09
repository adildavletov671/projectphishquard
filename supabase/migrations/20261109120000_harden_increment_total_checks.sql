/*
# Harden increment_total_checks()

1. Problem
   - By default Postgres grants EXECUTE on new functions to PUBLIC, so anyone with the
     anon key could call `rpc('increment_total_checks')` and inflate the counter.
   - SECURITY DEFINER functions without a fixed search_path can be hijacked by objects
     created in another schema earlier on the search_path.

2. Changes
   - Pin search_path to `public`.
   - Revoke EXECUTE from PUBLIC, anon and authenticated.
   - Grant EXECUTE only to service_role (used by the analyze-email edge function).
*/

ALTER FUNCTION public.increment_total_checks() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.increment_total_checks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_total_checks() TO service_role;
