import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Truck, Clock, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

const EmergencyAlerts = () => {
  const hospital = useAppStore(s => s.currentHospital);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [patients, setPatients] = useState<Record<string, any>>({});
  const [doctors, setDoctors] = useState<Record<string, any>>({});
  const [ambulanceMap, setAmbulanceMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmergencies();
    const channel = supabase.channel('admin-emergencies-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergencies' }, () => loadEmergencies())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hospital]);

  const loadEmergencies = async () => {
    if (!hospital) return;
    // Get emergencies for this hospital OR unassigned ones
    const { data } = await supabase.from('emergencies').select('*')
      .or(`hospital_id.eq.${hospital.id},and(status.in.(hospital_notified,doctor_confirmed),hospital_id.is.null)`)
      .order('created_at', { ascending: false });

    if (data) {
      setEmergencies(data);
      const pIds = [...new Set(data.map(e => e.patient_id))];
      const dIds = [...new Set(data.map(e => e.doctor_id).filter(Boolean))];
      const aIds = [...new Set(data.map(e => e.ambulance_id).filter(Boolean))];

      const [ptsRes, drsRes, ambRes] = await Promise.all([
        pIds.length ? supabase.from('patients').select('*').in('id', pIds) : { data: [] },
        dIds.length ? supabase.from('doctors').select('*').in('id', dIds) : { data: [] },
        aIds.length ? supabase.from('ambulances').select('*').in('id', aIds) : { data: [] },
      ]);

      const pm: Record<string, any> = {}; (ptsRes.data || []).forEach(p => pm[p.id] = p); setPatients(pm);
      const dm: Record<string, any> = {}; (drsRes.data || []).forEach(d => dm[d.id] = d); setDoctors(dm);
      const am: Record<string, any> = {}; (ambRes.data || []).forEach(a => am[a.id] = a); setAmbulanceMap(am);
    }
    setLoading(false);
  };

  const active = emergencies.filter(e => ['pending', 'doctor_confirmed', 'hospital_notified'].includes(e.status));
  const inProgress = emergencies.filter(e => e.status === 'ambulance_dispatched');
  const resolved = emergencies.filter(e => ['patient_reached', 'resolved', 'overridden'].includes(e.status));

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
        <AlertTriangle className="h-6 w-6 text-destructive" /> Emergency Alerts
      </h2>

      {emergencies.length === 0 && (
        <div className="glass-card p-12 text-center">
          <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-foreground font-bold">No emergencies</p>
          <p className="text-sm text-muted-foreground">All clear! The system will alert you when needed.</p>
        </div>
      )}

      {/* ACTIVE — Needs Action */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-destructive flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            🔴 ACTION REQUIRED ({active.length})
          </h3>
          {active.map(em => {
            const p = patients[em.patient_id];
            const d = doctors[em.doctor_id];
            return (
              <motion.div key={em.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5 border-destructive/40" style={{ background: 'hsla(353,90%,64%,0.06)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
                  <span className="font-bold text-sm text-destructive">🚨 {em.status?.toUpperCase().replace('_', ' ')}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(em.created_at).toLocaleTimeString()}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-foreground font-bold">{p?.name || 'Unknown'}, {p?.age}yr, {p?.gender}</p>
                  <p className="text-muted-foreground">📍 {p?.village}</p>
                  {d && <p className="text-muted-foreground">👨‍⚕️ Confirmed by Dr. {d.name}</p>}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  The dispatch overlay will appear automatically. If not, the emergency is pending hospital assignment.
                </p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* IN PROGRESS */}
      {inProgress.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-urgent flex items-center gap-2">
            <Truck className="h-4 w-4" />
            🟡 IN PROGRESS ({inProgress.length})
          </h3>
          {inProgress.map(em => {
            const p = patients[em.patient_id];
            const amb = ambulanceMap[em.ambulance_id];
            return (
              <motion.div key={em.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass-card p-5 border-urgent/30">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-5 w-5 text-urgent" />
                  <span className="font-bold text-sm text-urgent">🚑 Ambulance Dispatched</span>
                  <span className="text-xs text-muted-foreground ml-auto">ETA: {em.ambulance_eta || '?'} min</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-foreground">{p?.name || 'Unknown'}, {p?.age}yr</p>
                  {amb && <p className="text-muted-foreground">🚑 {amb.vehicle_number} — Driver: {amb.driver_name}</p>}
                  {em.bed_assigned && <p className="text-muted-foreground">🛏️ Bed: {em.bed_assigned}</p>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* RESOLVED */}
      {resolved.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            ✅ RESOLVED ({resolved.length})
          </h3>
          {resolved.map(em => {
            const p = patients[em.patient_id];
            return (
              <div key={em.id} className="glass-card p-4 border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span className="font-bold text-xs text-primary">{em.status?.toUpperCase()}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(em.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-foreground">{p?.name || 'Unknown'}, {p?.age}yr</p>
                {em.reached_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Response time: {Math.round((new Date(em.reached_at).getTime() - new Date(em.created_at).getTime()) / 60000)} min
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmergencyAlerts;
