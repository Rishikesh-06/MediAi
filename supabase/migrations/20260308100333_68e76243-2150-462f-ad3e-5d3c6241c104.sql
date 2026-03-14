
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS blood_group text,
  ADD COLUMN IF NOT EXISTS medical_history jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS emergency_contacts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"medicine": true, "appointment": true, "emergency": true, "tips": false, "village": false}'::jsonb;

-- Make aadhaar_last4 nullable since new users won't have it
ALTER TABLE public.patients ALTER COLUMN aadhaar_last4 DROP NOT NULL;
ALTER TABLE public.patients ALTER COLUMN aadhaar_last4 SET DEFAULT '';
