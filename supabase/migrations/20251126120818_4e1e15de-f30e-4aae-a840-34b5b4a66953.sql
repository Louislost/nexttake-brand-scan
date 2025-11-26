-- Add raw pillars storage column
ALTER TABLE brand_scans_results 
ADD COLUMN raw_pillars_json jsonb;

-- Create internal logging table for debugging
CREATE TABLE brand_scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  input_id uuid REFERENCES brand_scans_inputs(id) ON DELETE CASCADE,
  source text NOT NULL,
  status text NOT NULL,
  duration_ms integer,
  error_message text,
  data_size integer,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS but only allow service role to write (internal use only)
ALTER TABLE brand_scan_logs ENABLE ROW LEVEL SECURITY;

-- No public policies - this table is for internal debugging only