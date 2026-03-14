import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Users, AlertTriangle, Clock, DollarSign, Star, ArrowRight, Loader2, Power } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const doctor = useAppStore(s => s.currentDoctor);
  const setDoctor = useAppStore(s => s.setDoctor);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(doctor?.is_online ?? false);
  const [hospitalName, setHospitalName] = useState<string>("");

  const loadData = async () => {
    if (!doctor) return;
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);

    const [apptRes, emRes, docRes] = await Promise.all([
      supabase.from('appointments')
        .select('*, patients(*)')
        .eq('doctor_id', doctor.id)
        .gte('date_time', startOfToday.toISOString())
        .lte('date_time', endOfToday.toISOString())
        .order('date_time', { ascending: true }),
      supabase.from('emergencies')
        .select('*, patients!inner(*), health_checks(*)')
        .in('status', ['pending'])
        .not('patients.auth_user_id', 'is', null)
        .order('created_at', { ascending: false }),
      supabase.from('doctors')
        .select('*')
        .eq('id', doctor.id)
        .single(),
    ]);

    if (apptRes.data) setAppointments(apptRes.data);
    // Deduplicate emergencies by patient_id
    if (emRes.data) {
      const seen = new Set<string>();
      const deduped = emRes.data.filter((e: any) => {
        if (seen.has(e.patient_id)) return false;
        seen.add(e.patient_id);
        return true;
      });
      setEmergencies(deduped);
    }
    if (docRes.data) setIsOnline(docRes.data.is_online ?? false);

    // Load hospital name
    if (doctor.hospital_id) {
      const { data: h } = await supabase.from('hospitals').select('name').eq('id', doctor.hospital_id).single();
      if (h) setHospitalName(h.name);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!doctor) { navigate('/doctor/login'); return; }
    loadData();

    const ch1 = supabase.channel('doc-emergencies')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emergencies' }, () => {
        loadData();
        try { const ctx = new AudioContext(); const o = ctx.createOscillator(); o.frequency.value = 880; o.connect(ctx.destination); o.start(); setTimeout(() => o.stop(), 500); } catch {}
        toast({ title: "🚨 New Emergency Alert!" });
      }).subscribe();

    const ch2 = supabase.channel('doc-appointments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments', filter: `doctor_id=eq.${doctor.id}` }, () => {
        loadData();
        toast({ title: "New patient added to queue" });
      }).subscribe();

    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [doctor]);

  const toggleOnline = async () => {
    if (!doctor) return;
    const newStatus = !isOnline;
    await supabase.from('doctors').update({ is_online: newStatus }).eq('id', doctor.id);
    setIsOnline(newStatus);
    setDoctor({ ...doctor, is_online: newStatus });
    toast({ title: newStatus ? "You're now online ✅" : "You're now offline" });
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-info" /></div>;
  if (!doctor) return null;

  const completed = appointments.filter(a => a.status === 'completed');
  const inQueue = appointments.filter(a => a.status === 'waiting' || a.status === 'confirmed');
  const earnings = completed.length * ((doctor as any).consultation_fee || 60);

  const queueItems = appointments
    .filter(a => a.status !== 'completed' && a.patients)
    .sort((a, b) => {
      const em_a = emergencies.find(e => e.patient_id === a.patient_id);
      const em_b = emergencies.find(e => e.patient_id === b.patient_id);
      if (em_a && !em_b) return -1;
      if (!em_a && em_b) return 1;
      return new Date(a.date_time).getTime() - new Date(b.date_time).getTime();
    });

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-4xl mx-auto">
      {/* Greeting */}
      <motion.div variants={fadeUp}>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground">
          {getGreeting()}, Dr. {doctor.name} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {' · '}{doctor.specialty}
          {hospitalName ? ` · ${hospitalName}` : ' · PHC Doctor'}
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
          <span className="font-display font-bold text-foreground">
            {isOnline ? 'Online — Receiving Patients' : 'Offline'}
          </span>
        </div>
        <button onClick={toggleOnline}
          className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${isOnline ? 'bg-secondary text-muted-foreground' : 'bg-primary text-primary-foreground'}`}>
          <Power className="h-4 w-4" />
          {isOnline ? 'Go Offline' : 'Go Online'}
        </button>
      </motion.div>

      {emergencies.length > 0 && (
        <motion.div variants={fadeUp} className="glass-card p-4 border-destructive/40" style={{ background: "hsla(353, 90%, 64%, 0.08)" }}>
          {emergencies.map(em => (
            <div key={em.id} className="flex items-center gap-3 mb-2 last:mb-0">
              <AlertTriangle className="h-6 w-6 text-destructive animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-destructive">🚨 Emergency Alert</p>
                <p className="text-sm text-muted-foreground">
                  {em.patients?.name}, {em.patients?.age} — {em.health_checks?.ai_condition || 'Critical'}.
                  AI Risk: {em.health_checks?.ai_risk_score || '?'}%
                </p>
              </div>
              <button onClick={() => navigate(`/doctor/patient/${em.patient_id}`)}
                className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold whitespace-nowrap">
                Respond Now
              </button>
            </div>
          ))}
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: Users, label: "Seen Today", value: completed.length, color: "text-info" },
          { icon: Clock, label: "In Queue", value: inQueue.length, color: "text-urgent" },
          { icon: AlertTriangle, label: "Emergencies", value: emergencies.length, color: "text-destructive" },
          { icon: DollarSign, label: "Earnings", value: `₹${earnings}`, color: "text-primary" },
          { icon: Star, label: "Rating", value: `${doctor.rating || '5.0'}⭐`, color: "text-urgent" },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <s.icon className={`h-5 w-5 ${s.color} mx-auto mb-2`} />
            <p className="font-mono text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </motion.div>

      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg font-bold text-foreground">Patient Queue ({queueItems.length})</h3>
          <button onClick={() => navigate('/doctor/queue')} className="text-sm text-info font-medium">View All →</button>
        </div>
        <div className="space-y-3">
          {queueItems.slice(0, 5).map(a => {
            const p = a.patients;
            const em = emergencies.find(e => e.patient_id === a.patient_id);
            const hc = em?.health_checks;
            const timeSince = Math.round((Date.now() - new Date(a.date_time).getTime()) / 60000);
            const level = hc?.ai_triage || (em ? 'emergency' : 'routine');
            const risk = hc?.ai_risk_score || 0;

            return (
              <div key={a.id} className="glass-card p-4"
                style={level === 'emergency' ? { borderColor: 'hsla(353, 90%, 64%, 0.3)', background: 'hsla(353,90%,64%,0.05)' } : {}}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={level === 'emergency' ? 'badge-emergency' : level === 'urgent' ? 'badge-urgent' : 'badge-safe'}>
                        {level === 'emergency' ? '🔴 Emergency' : level === 'urgent' ? '🟡 Urgent' : '🟢 Routine'}
                      </span>
                      {timeSince > 0 && <span className="text-xs text-muted-foreground">Waiting {timeSince} min</span>}
                    </div>
                    <p className="font-semibold text-foreground">{p?.name}, {p?.age}</p>
                    <p className="text-xs text-muted-foreground">📍 {p?.village} — {hc?.ai_condition || a.type}</p>
                    {risk > 0 && (
                      <p className="text-xs mt-1 font-mono" style={{ color: risk > 70 ? 'hsl(353,90%,64%)' : risk > 30 ? 'hsl(37,100%,56%)' : 'hsl(152,100%,45%)' }}>
                        AI Risk: {risk}%
                      </p>
                    )}
                  </div>
                  <button onClick={() => navigate(`/doctor/patient/${a.patient_id}`)}
                    className="flex items-center gap-1 text-sm text-info font-semibold">
                    View <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {queueItems.length === 0 && (
            <div className="glass-card p-8 text-center">
              <p className="text-3xl mb-3">👥</p>
              <p className="text-foreground font-bold">No patients in queue today</p>
              <p className="text-sm text-muted-foreground mt-1">Patients will appear here when they book an appointment</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DoctorDashboard;
