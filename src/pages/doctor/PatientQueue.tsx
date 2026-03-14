import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";

const PatientQueue = () => {
  const doctor = useAppStore(s => s.currentDoctor);
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>("all");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!doctor) { navigate('/doctor/login'); return; }
    loadQueue();

    const ch = supabase.channel('queue-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `doctor_id=eq.${doctor.id}` }, () => loadQueue())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [doctor]);

  const loadQueue = async () => {
    if (!doctor) return;
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);

    const { data } = await supabase.from('appointments')
      .select('*, patients(*)')
      .eq('doctor_id', doctor.id)
      .gte('date_time', startOfToday.toISOString())
      .lte('date_time', endOfToday.toISOString())
      .order('date_time', { ascending: true });

    if (!data) { setLoading(false); return; }

    // For each patient, get latest health check
    const patientIds = [...new Set(data.map(a => a.patient_id))];
    const { data: checks } = await supabase.from('health_checks')
      .select('*')
      .in('patient_id', patientIds)
      .order('created_at', { ascending: false });

    // Get emergencies
    const { data: emergencies } = await supabase.from('emergencies')
      .select('*')
      .in('patient_id', patientIds)
      .in('status', ['pending', 'doctor_confirmed']);

    // Merge
    const merged = data.map(a => {
      const latestCheck = checks?.find(c => c.patient_id === a.patient_id);
      const emergency = emergencies?.find(e => e.patient_id === a.patient_id);
      const triage = latestCheck?.ai_triage || (emergency ? 'emergency' : 'routine');
      return { ...a, latestCheck, emergency, triage };
    });

    // Sort: emergency first, then urgent, then routine, then by time
    merged.sort((a, b) => {
      const order: Record<string, number> = { emergency: 0, urgent: 1, routine: 2 };
      const diff = (order[a.triage] ?? 2) - (order[b.triage] ?? 2);
      if (diff !== 0) return diff;
      return new Date(a.date_time).getTime() - new Date(b.date_time).getTime();
    });

    setAppointments(merged);
    setLoading(false);
  };

  const filtered = tab === 'all' ? appointments : appointments.filter(a => a.triage === tab);
  const counts = {
    all: appointments.length,
    emergency: appointments.filter(a => a.triage === 'emergency').length,
    urgent: appointments.filter(a => a.triage === 'urgent').length,
    routine: appointments.filter(a => a.triage === 'routine').length,
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-info" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="font-display text-2xl font-bold text-foreground">Patient Queue</h2>

      <div className="flex gap-2">
        {([['all', '👥', counts.all], ['emergency', '🔴', counts.emergency], ['urgent', '🟡', counts.urgent], ['routine', '🟢', counts.routine]] as const).map(([t, icon, count]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${tab === t
              ? (t === 'emergency' ? 'bg-destructive/20 text-destructive' : t === 'urgent' ? 'bg-urgent/20 text-urgent' : t === 'all' ? 'bg-info/20 text-info' : 'bg-primary/20 text-primary')
              : 'bg-secondary text-muted-foreground'
            }`}>
            {icon} {t.charAt(0).toUpperCase() + t.slice(1)} ({count})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(a => {
          const p = a.patients;
          const hc = a.latestCheck;
          const timeSince = Math.max(0, Math.round((Date.now() - new Date(a.date_time).getTime()) / 60000));
          const risk = hc?.ai_risk_score || 0;
          const symptoms = Array.isArray(hc?.symptoms) ? hc.symptoms : [];

          return (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`glass-card p-4 ${a.triage === 'emergency' ? 'border-destructive/30' : ''}`}
              style={a.triage === 'emergency' ? { background: 'hsla(353,90%,64%,0.05)' } : {}}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={a.triage === 'emergency' ? 'badge-emergency text-xs' : a.triage === 'urgent' ? 'badge-urgent text-xs' : 'badge-safe text-xs'}>
                      {a.triage === 'emergency' ? '🔴 Emergency' : a.triage === 'urgent' ? '🟡 Urgent' : '🟢 Routine'}
                    </span>
                    {a.status !== 'completed' && timeSince > 0 && (
                      <span className="text-xs text-muted-foreground">Waiting {timeSince} min</span>
                    )}
                    {a.status === 'completed' && <span className="text-xs text-primary">✅ Completed</span>}
                  </div>
                  <p className="font-semibold text-foreground">{p?.name}, {p?.age} {p?.gender?.charAt(0)}</p>
                  <p className="text-xs text-muted-foreground">📍 {p?.village} — {hc?.ai_condition || a.type}</p>
                  {symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {symptoms.slice(0, 3).map((s: any, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-secondary text-muted-foreground">
                          {typeof s === 'string' ? s : s.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {risk > 0 && (
                    <p className="text-xs mt-1 font-mono" style={{ color: risk > 70 ? 'hsl(353,90%,64%)' : risk > 30 ? 'hsl(37,100%,56%)' : 'hsl(152,100%,45%)' }}>
                      AI Risk: {risk}%
                    </p>
                  )}
                </div>
                <button onClick={() => navigate(`/doctor/patient/${a.patient_id}`)}
                  className="flex items-center gap-1 text-sm text-info font-semibold ml-4">
                  View <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No patients in this queue</p>}
      </div>
    </div>
  );
};

export default PatientQueue;
