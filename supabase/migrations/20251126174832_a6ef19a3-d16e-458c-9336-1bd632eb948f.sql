-- Security Fix: Remove public access from tables that don't need it

-- 1. Remove public access from brand_scan_cache
-- Edge functions use service role which bypasses RLS, so no public policy needed
DROP POLICY IF EXISTS "Allow public operations on cache" ON brand_scan_cache;

-- 2. Remove public SELECT from brand_scans_inputs
-- Frontend never reads from this table - only edge functions do (with service role)
-- This protects user IP addresses and user-agent data from public access
DROP POLICY IF EXISTS "Allow public select on inputs" ON brand_scans_inputs;

-- Note: Keeping brand_scans_results policies unchanged
-- The UUID-based access (via input_id) provides sufficient security for a public sales tool
-- Users can only view results if they have the UUID from their scan