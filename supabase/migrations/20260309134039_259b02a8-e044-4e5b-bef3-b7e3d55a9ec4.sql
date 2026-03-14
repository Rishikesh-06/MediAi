
-- Permissive policy: allow anyone to delete health_checks (matches existing ALL policy intent)
CREATE POLICY "Allow delete health_checks"
ON public.health_checks
FOR DELETE
USING (true);

-- Permissive policy: allow anyone to delete emergencies (matches existing ALL policy intent)
CREATE POLICY "Allow delete emergencies"
ON public.emergencies
FOR DELETE
USING (true);
