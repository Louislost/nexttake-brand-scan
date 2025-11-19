import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xxwmgpeqnqmwrvwnkuyv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4d21ncGVxbnFtd3J2d25rdXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NjE0MjIsImV4cCI6MjA3OTAzNzQyMn0.iuj0rw9UzocTmTezjlGrXXUIotWYtl-3yCnJ2-Hewjw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
