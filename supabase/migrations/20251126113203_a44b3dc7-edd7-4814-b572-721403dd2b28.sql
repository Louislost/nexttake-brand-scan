-- Create table for brand scan inputs
CREATE TABLE public.brand_scans_inputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_name TEXT NOT NULL,
  brand_website_url TEXT NOT NULL,
  instagram TEXT,
  x TEXT,
  linkedin TEXT,
  tiktok TEXT,
  industry TEXT,
  market TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for brand scan results
CREATE TABLE public.brand_scans_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  input_id UUID NOT NULL REFERENCES public.brand_scans_inputs(id) ON DELETE CASCADE,
  result_json JSONB,
  pillar_scores JSONB,
  overall_score INTEGER,
  status TEXT DEFAULT 'processing',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.brand_scans_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_scans_results ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required)
CREATE POLICY "Allow public insert on inputs" 
ON public.brand_scans_inputs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public select on inputs" 
ON public.brand_scans_inputs 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public select on results" 
ON public.brand_scans_results 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert on results" 
ON public.brand_scans_results 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update on results" 
ON public.brand_scans_results 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_results_updated_at
BEFORE UPDATE ON public.brand_scans_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_brand_scans_inputs_created_at ON public.brand_scans_inputs(created_at DESC);
CREATE INDEX idx_brand_scans_results_input_id ON public.brand_scans_results(input_id);
CREATE INDEX idx_brand_scans_results_status ON public.brand_scans_results(status);