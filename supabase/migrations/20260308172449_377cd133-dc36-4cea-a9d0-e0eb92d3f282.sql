
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS hospital_id uuid REFERENCES hospitals(id),
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;

ALTER TABLE emergencies
  ADD COLUMN IF NOT EXISTS doctor_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS ambulance_dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS patient_lat double precision,
  ADD COLUMN IF NOT EXISTS patient_lng double precision,
  ADD COLUMN IF NOT EXISTS overridden_by_doctor uuid,
  ADD COLUMN IF NOT EXISTS override_reason text,
  ADD COLUMN IF NOT EXISTS overridden_at timestamptz,
  ADD COLUMN IF NOT EXISTS reached_at timestamptz,
  ADD COLUMN IF NOT EXISTS hospital_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS ambulance_id uuid REFERENCES ambulances(id);

ALTER TABLE ambulances
  ADD COLUMN IF NOT EXISTS current_emergency_id uuid,
  ADD COLUMN IF NOT EXISTS destination_lat double precision,
  ADD COLUMN IF NOT EXISTS destination_lng double precision;

ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS rx_number text;
