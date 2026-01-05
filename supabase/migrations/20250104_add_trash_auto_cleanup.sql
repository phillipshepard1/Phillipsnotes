-- Migration: Add auto-cleanup for trash (delete notes older than 30 days)
-- Run this in your Supabase SQL Editor

-- First, enable the pg_cron extension if not already enabled
-- Note: This requires the cron extension to be enabled in your Supabase project
-- Go to Database -> Extensions and enable "pg_cron"

-- Create a function to clean up old trash
CREATE OR REPLACE FUNCTION cleanup_old_trash()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete notes that have been in trash for more than 30 days
  DELETE FROM notes
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days';

  -- Log the cleanup (optional - for debugging)
  RAISE NOTICE 'Trash cleanup completed at %', NOW();
END;
$$;

-- Schedule the cleanup to run daily at 3:00 AM UTC
-- Uncomment and run this after enabling pg_cron extension:
-- SELECT cron.schedule(
--   'cleanup-old-trash',           -- job name
--   '0 3 * * *',                   -- cron schedule (daily at 3 AM UTC)
--   'SELECT cleanup_old_trash()'   -- SQL to execute
-- );

-- Alternative: If you prefer to use Supabase Edge Functions for scheduling,
-- you can create a scheduled function that calls the cleanup_old_trash() function
-- via the Supabase Management API or use Supabase's built-in cron jobs feature.

-- Grant execute permission on the cleanup function
GRANT EXECUTE ON FUNCTION cleanup_old_trash TO service_role;
