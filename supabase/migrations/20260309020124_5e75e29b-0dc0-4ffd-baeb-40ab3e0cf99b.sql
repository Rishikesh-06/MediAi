ALTER TABLE women_health 
  ADD COLUMN IF NOT EXISTS period_end_date date,
  ADD COLUMN IF NOT EXISTS cycle_number integer;