-- Create edge_function_logs table for debugging Edge Functions
CREATE TABLE IF NOT EXISTS public.edge_function_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  function_name text NOT NULL,
  level text NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message text NOT NULL,
  data jsonb,
  error_details jsonb,
  user_id uuid REFERENCES auth.users(id),
  dealer_id bigint REFERENCES dealerships(id)
);

-- Index for querying logs
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_function_name ON public.edge_function_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_level ON public.edge_function_logs(level);
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_created_at ON public.edge_function_logs(created_at DESC);

-- RLS policies
ALTER TABLE public.edge_function_logs ENABLE ROW LEVEL SECURITY;

-- System admins can view all logs
CREATE POLICY "System admins can view all logs"
  ON public.edge_function_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_system_admin = true
    )
  );

-- Service role can insert logs (Edge Functions use service role)
CREATE POLICY "Service role can insert logs"
  ON public.edge_function_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Cleanup old logs (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_edge_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.edge_function_logs
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Schedule cleanup (requires pg_cron extension)
COMMENT ON FUNCTION cleanup_old_edge_logs() IS 'Cleanup edge function logs older than 7 days. Run via pg_cron or manually.';
