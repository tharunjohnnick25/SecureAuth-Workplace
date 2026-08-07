-- Migration 014: SQL Editor RPC Function

-- Create a secure Postgres function to execute arbitrary SQL.
-- SECURITY DEFINER allows it to run with the privileges of the user that created it (postgres superuser).
CREATE OR REPLACE FUNCTION admin_exec_sql(query text) RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- Attempt to execute the query as a SELECT and aggregate results into JSON.
  -- The COALESCE ensures we return '[]' instead of NULL if the table is empty.
  EXECUTE 'SELECT COALESCE(json_agg(row_to_json(t)), ''[]'') FROM (' || query || ') t' INTO result;
  RETURN result;
EXCEPTION WHEN others THEN
  -- If the query was not a SELECT (e.g. UPDATE, INSERT, DELETE, CREATE),
  -- the above EXECUTE will fail because it doesn't return rows.
  -- In that case, we catch the exception and run it directly.
  EXECUTE query;
  RETURN '{"status": "success", "message": "Query executed successfully. No data returned."}'::json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Extremely strict permissions:
-- 1. Revoke execution from everyone by default.
REVOKE EXECUTE ON FUNCTION admin_exec_sql(text) FROM public;
REVOKE EXECUTE ON FUNCTION admin_exec_sql(text) FROM anon;
REVOKE EXECUTE ON FUNCTION admin_exec_sql(text) FROM authenticated;

-- 2. Grant execution ONLY to the service_role.
-- This ensures it can only be invoked from backend APIs with the SUPABASE_SERVICE_ROLE_KEY.
GRANT EXECUTE ON FUNCTION admin_exec_sql(text) TO service_role;
