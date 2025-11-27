-- Allow public to read from brand_scans_inputs table
CREATE POLICY "Allow public select on inputs"
ON public.brand_scans_inputs
FOR SELECT
TO public
USING (true);