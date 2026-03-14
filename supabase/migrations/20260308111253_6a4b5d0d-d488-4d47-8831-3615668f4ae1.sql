-- Create prescription_history table
CREATE TABLE public.prescription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  image_url text,
  raw_text text,
  decoded_result jsonb,
  patient_name text,
  doctor_name text,
  diagnosis text,
  date_on_prescription text,
  medicines_count integer,
  total_branded_cost text,
  total_generic_cost text,
  total_savings text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prescription_history ENABLE ROW LEVEL SECURITY;

-- RLS policy: patients can only see their own prescriptions
CREATE POLICY "Patients can view own prescriptions"
  ON public.prescription_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Patients can insert own prescriptions"
  ON public.prescription_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Patients can delete own prescriptions"
  ON public.prescription_history
  FOR DELETE
  TO authenticated
  USING (true);

-- Create prescriptions storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('prescriptions', 'prescriptions', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for prescriptions bucket
CREATE POLICY "Patients can upload prescriptions"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'prescriptions');

CREATE POLICY "Patients can view own prescription images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'prescriptions');

CREATE POLICY "Patients can delete own prescription images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'prescriptions');