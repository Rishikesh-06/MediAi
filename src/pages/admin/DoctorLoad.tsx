import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Users, Loader2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

const DoctorLoad = () => {
  const hospital = useAppStore(s => s.currentHospital);
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDoctors(); }, [hospital]);

  const loadDoctors = async () => {
    if (!hospital) return;
    const { data } = await supabase.from('doctors').select('*').eq('hospital_id', hospital.id);
    if (data) {
      // Get today's appointment counts
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
      const docIds = data.map(d => d.id);
      
      let appointmentCounts: Record<string, number> = {};
      if (docIds.length > 0) {
        const { data: appts } = await supabase.from('appointments').select('doctor_id')
          .in('doctor_id', docIds)
          .gte('date_time', startOfToday.toISOString())
          .lte('date_time', endOfToday.toISOString());
        if (appts) {
          appts.forEach(a => { appointmentCounts[a.doctor_id] = (appointmentCounts[a.doctor_id] || 0) + 1; });
        }
      }

      const enriched = data.map(d => ({ ...d, real_patients_today: appointmentCounts[d.id] || 0 }));
      const sorted = enriched.sort((a, b) => b.real_patients_today - a.real_patients_today);
      setDoctors(sorted);
    }
    setLoading(false);
  };

  const toggleOnline = async (doc: any) => {
    await supabase.from('doctors').update({ is_online: !doc.is_online }).eq('id', doc.id);
    toast({ title: `${doc.name} is now ${doc.is_online ? 'offline' : 'online'}` });
    loadDoctors();
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-urgent" /></div>;

  if (doctors.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Doctor Load Management 👨‍⚕️</h2>
        <div className="glass-card p-12 text-center">
          <p className="text-4xl mb-4">👨‍⚕️</p>
          <p className="text-foreground font-bold text-lg">No doctors registered yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Register doctors to manage their workload</p>
          <button onClick={() => navigate('/admin/register-doctor')} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 mx-auto">
            <Plus className="h-4 w-4" /> Register Doctor
          </button>
        </div>
      </div>
    );
  }

  const lowestLoad = doctors[doctors.length - 1];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="font-display text-2xl font-bold text-foreground">Doctor Load Management 👨‍⚕️</h2>

      {lowestLoad && doctors.length > 1 && (
        <div className="glass-card p-4 border-primary/30 flex items-center gap-3" style={{ background: "hsla(152,100%,45%,0.05)" }}>
          <span className="text-lg">💡</span>
          <p className="text-sm text-primary font-medium">Recommend: {lowestLoad.name} — Lowest load with {lowestLoad.real_patients_today} patients today</p>
        </div>
      )}

      <div className="space-y-3">
        {doctors.map(d => {
          const load = d.real_patients_today;
          const loadPct = Math.min(100, load * 10);
          const loadColor = load < 5 ? "hsl(152,100%,45%)" : load < 9 ? "hsl(37,100%,56%)" : "hsl(353,90%,64%)";
          const loadLabel = load < 5 ? "Low Load" : load < 9 ? "Medium Load" : "High Load";

          return (
            <div key={d.id} className="glass-card p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-info/10 flex items-center justify-center text-xl">👨‍⚕️</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground">{d.name}</p>
                    <span className="text-xs text-muted-foreground">• {d.specialty}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${loadPct}%` }} transition={{ duration: 1 }}
                        className="h-full rounded-full" style={{ background: loadColor }} />
                    </div>
                    <span className="text-xs font-mono font-bold" style={{ color: loadColor }}>{load} pts</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: loadColor }}>{loadLabel}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button onClick={() => toggleOnline(d)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold ${d.is_online ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {d.is_online ? "🟢 On Duty" : "⚫ Off Duty"}
                  </button>
                  <span className="text-xs text-muted-foreground">⭐ {d.rating}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DoctorLoad;
