-- Add thread_id and run_id columns to brand_scans_results for async OpenAI processing
ALTER TABLE public.brand_scans_results 
ADD COLUMN IF NOT EXISTS thread_id text,
ADD COLUMN IF NOT EXISTS run_id text;