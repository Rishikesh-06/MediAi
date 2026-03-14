CREATE TABLE IF NOT EXISTS public.women_health (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  last_period_date date,
  cycle_length integer DEFAULT 28,
  period_duration integer DEFAULT 5,
  flow_intensity text,
  symptoms text[],
  lmp_date date,
  due_date date,
  week_number integer,
  notes text,
  mood text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.women_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to women_health" ON public.women_health FOR ALL USING (true) WITH CHECK (true);