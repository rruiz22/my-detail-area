-- ============================================================
-- Setup Auto-Close Cron Job using pg_cron + pg_net
-- ============================================================
-- This cron job runs every 15 minutes to automatically close
-- forgotten punch-out entries for employees who forgot to clock out.
-- ============================================================

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Remove existing job if it exists (to avoid duplicates)
SELECT cron.unschedule('auto-close-forgotten-punches') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-close-forgotten-punches'
);

-- Create the cron job to call the edge function every 15 minutes
SELECT cron.schedule(
  'auto-close-forgotten-punches',  -- Job name
  '*/15 * * * *',                   -- Every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://swfnnrpzpkdypbrzmgnr.supabase.co/functions/v1/auto-close-forgotten-punches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Verify the job was created
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'auto-close-forgotten-punches';

-- ============================================================
-- NOTES:
-- ============================================================
-- 1. The cron job runs every 15 minutes (*/15 * * * *)
-- 2. It calls the auto-close-forgotten-punches edge function
-- 3. The edge function handles:
--    - Finding employees with overdue punches
--    - Sending SMS reminders at configured intervals
--    - Auto-closing punches after the configured window
--
-- To check job history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- To manually run the job:
-- SELECT cron.run_job('auto-close-forgotten-punches');
--
-- To disable the job:
-- SELECT cron.unschedule('auto-close-forgotten-punches');
-- ============================================================
