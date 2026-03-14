-- Add email and auth columns to doctors
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS auth_id uuid;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS qualification text;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS consultation_fee integer DEFAULT 60;

-- Add auth columns to hospitals
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS admin_auth_id uuid;
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS admin_email text;
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS admin_name text;

-- Add auth_id to asha_workers
ALTER TABLE public.asha_workers ADD COLUMN IF NOT EXISTS auth_id uuid;
ALTER TABLE public.asha_workers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.asha_workers ADD COLUMN IF NOT EXISTS phone text;

-- Add email to patients
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS email text;