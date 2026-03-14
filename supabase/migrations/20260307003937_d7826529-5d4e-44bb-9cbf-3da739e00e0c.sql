
-- Create patients table
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aadhaar_last4 TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  village TEXT NOT NULL,
  district TEXT DEFAULT 'Rajasthan',
  language TEXT DEFAULT 'en',
  health_score INTEGER DEFAULT 75,
  is_pregnant BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create hospitals table
CREATE TABLE public.hospitals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  reg_number TEXT UNIQUE,
  password TEXT DEFAULT 'admin123',
  total_beds INTEGER DEFAULT 100,
  available_beds INTEGER DEFAULT 34,
  icu_available INTEGER DEFAULT 3,
  ambulances_total INTEGER DEFAULT 3,
  ambulances_available INTEGER DEFAULT 1,
  oxygen_count INTEGER DEFAULT 45,
  blood_bank JSONB DEFAULT '{"A+": 10, "B+": 2, "O+": 8, "AB+": 5}'::jsonb,
  ventilators INTEGER DEFAULT 4,
  medicine_stock JSONB DEFAULT '{}'::jsonb,
  is_registered BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create doctors table
CREATE TABLE public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  reg_number TEXT UNIQUE NOT NULL,
  password TEXT DEFAULT 'doctor123',
  specialty TEXT NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id),
  rating NUMERIC(2,1) DEFAULT 4.8,
  languages TEXT[] DEFAULT ARRAY['English', 'Hindi'],
  is_online BOOLEAN DEFAULT false,
  earnings_today NUMERIC DEFAULT 0,
  patients_today INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create health_checks table
CREATE TABLE public.health_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
  vitals JSONB DEFAULT '{}'::jsonb,
  history JSONB DEFAULT '{}'::jsonb,
  body_parts JSONB DEFAULT '[]'::jsonb,
  ai_risk_score INTEGER,
  ai_triage TEXT,
  ai_condition TEXT,
  ai_explanation JSONB DEFAULT '{}'::jsonb,
  ai_first_aid TEXT,
  ai_recommendations JSONB DEFAULT '[]'::jsonb,
  assigned_doctor_id UUID REFERENCES public.doctors(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emergencies table
CREATE TABLE public.emergencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  doctor_id UUID REFERENCES public.doctors(id),
  hospital_id UUID REFERENCES public.hospitals(id),
  health_check_id UUID REFERENCES public.health_checks(id),
  status TEXT DEFAULT 'pending',
  ambulance_eta INTEGER,
  bed_assigned TEXT,
  dispatch_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  doctor_id UUID REFERENCES public.doctors(id),
  health_check_id UUID REFERENCES public.health_checks(id),
  medicines JSONB NOT NULL DEFAULT '[]'::jsonb,
  doctor_notes TEXT,
  follow_up_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medicine_reminders table
CREATE TABLE public.medicine_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  medicine_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  times JSONB DEFAULT '["08:00", "20:00"]'::jsonb,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) NOT NULL,
  doctor_id UUID REFERENCES public.doctors(id) NOT NULL,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'confirmed',
  payment_amount NUMERIC DEFAULT 60,
  payment_status TEXT DEFAULT 'pending',
  type TEXT DEFAULT 'video',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create village_health table
CREATE TABLE public.village_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  village_name TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  symptom_counts JSONB DEFAULT '{}'::jsonb,
  total_cases INTEGER DEFAULT 0,
  zone_color TEXT DEFAULT 'green',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mental_health_logs table
CREATE TABLE public.mental_health_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  mood_score INTEGER,
  answers JSONB DEFAULT '{}'::jsonb,
  stress_level TEXT,
  risk_level TEXT,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create asha_workers table
CREATE TABLE public.asha_workers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  asha_id TEXT UNIQUE NOT NULL,
  village TEXT NOT NULL,
  district TEXT DEFAULT 'Rajasthan',
  families_count INTEGER DEFAULT 47,
  password TEXT DEFAULT 'asha123',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create families table
CREATE TABLE public.families (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asha_id UUID REFERENCES public.asha_workers(id) ON DELETE CASCADE NOT NULL,
  family_name TEXT NOT NULL,
  members JSONB DEFAULT '[]'::jsonb,
  last_visit DATE,
  health_status TEXT DEFAULT 'healthy',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create beds table
CREATE TABLE public.beds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE NOT NULL,
  bed_number TEXT NOT NULL,
  ward TEXT NOT NULL DEFAULT 'General',
  status TEXT DEFAULT 'available',
  patient_name TEXT,
  condition TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ambulances table
CREATE TABLE public.ambulances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE NOT NULL,
  vehicle_number TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  status TEXT DEFAULT 'free',
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  destination TEXT,
  patient_id UUID REFERENCES public.patients(id),
  eta_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.village_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mental_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asha_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for demo (hackathon - no auth needed)
CREATE POLICY "Allow all access to patients" ON public.patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to hospitals" ON public.hospitals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to doctors" ON public.doctors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to health_checks" ON public.health_checks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to emergencies" ON public.emergencies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to prescriptions" ON public.prescriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to medicine_reminders" ON public.medicine_reminders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to village_health" ON public.village_health FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to mental_health_logs" ON public.mental_health_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to asha_workers" ON public.asha_workers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to families" ON public.families FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to beds" ON public.beds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to ambulances" ON public.ambulances FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE emergencies;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE village_health;
ALTER PUBLICATION supabase_realtime ADD TABLE medicine_reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
