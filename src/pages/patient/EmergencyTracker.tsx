import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { CheckCircle, Loader2, Phone, Siren } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";

const STEPS = [
  { key: 'pending', icon: '🔍', title: 'Finding Doctor', desc: 'AI is finding the nearest available doctor' },
  { key: 'doctor_confirmed', icon: '✅', title: 'Doctor Confirmed', desc: '' },
  { key: 'hospital_notified', icon: '🏥', title: 'Hospital Notified', desc: '' },
  { key: 'ambulance_dispatched', icon: '🚑', title: 'Ambulance Dispatched', desc: '' },
  { key: 'patient_reached', icon: '🏁', title: 'Ambulance Arrived', desc: 'Ambulance has reached your location' },
];

const EmergencyTracker = ({ emergencyId, patientId }: { emergencyId?: string; patientId: string }) => {
  const [emergency, setEmergency] = useState<any>(null);
  const [ambulance, setAmbulance] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [hospital, setHospital] = useState<any>(null);
  const [eta, setEta] = useState<number>(0);
  const patient = useAppStore(s => s.currentPatient);

  const loadEmergency = async () => {
    const { data } = await supabase.from('emergencies').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1);
    const em = data?.[0];
    if (!em) return;
    setEmergency(em);

    if (em.doctor_id) {
      const { data: d } = await supabase.from('doctors').select('name, specialty').eq('id', em.doctor_id).single();
      if (d) setDoctor(d);
    }
    if (em.hospital_id) {
      const { data: h } = await supabase.from('hospitals').select('name, location').eq('id', em.hospital_id).single();
      if (h) setHospital(h);
    }
    if ((em as any).ambulance_id) {
      const { data: a } = await supabase.from('ambulances').select('*').eq('id', (em as any).ambulance_id).single();
      if (a) { setAmbulance(a); setEta(a.eta_minutes || em.ambulance_eta || 0); }
    }
  };

  useEffect(() => {
    loadEmergency();
    const ch = supabase.channel('patient-emergency-' + patientId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'emergencies', filter: `patient_id=eq.${patientId}` }, () => {
        loadEmergency();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [patientId]);

  // ETA countdown
  useEffect(() => {
    if (eta <= 0) return;
    const timer = setInterval(() => setEta(p => Math.max(0, p - 1)), 60000);
    return () => clearInterval(timer);
  }, [eta]);

  // GPS watching during emergency
  useEffect(() => {
    if (!emergency || emergency.status === 'patient_reached' || emergency.status === 'overridden') return;
    const watchId = navigator.geolocation?.watchPosition(
      async (pos) => {
        await supabase.from('patients').update({
          current_lat: pos.coords.latitude, current_lng: pos.coords.longitude
        } as any).eq('id', patientId);
      },
      () => {}, { enableHighAccuracy: true }
    );
    return () => { if (watchId !== undefined) navigator.geolocation.clearWatch(watchId); };
  }, [emergency, patientId]);

  // 108 Fallback
  useEffect(() => {
    if (!emergency) return;
    const checkFallback = async () => {
      const created = new Date(emergency.created_at).getTime();
      const elapsed = (Date.now() - created) / 60000;
      if (emergency.status === 'pending' && elapsed > 10) {
        await supabase.from('emergencies').update({
          status: 'fallback_108', fallback_triggered_at: new Date().toISOString(),
          fallback_reason: 'No doctor responded in 10 minutes',
        } as any).eq('id', emergency.id);
      } else if (emergency.status === 'hospital_notified') {
        const notifiedAt = (emergency as any).hospital_notified_at;
        const notified = notifiedAt ? new Date(notifiedAt).getTime() : created;
        if ((Date.now() - notified) / 60000 > 15) {
          await supabase.from('emergencies').update({
            status: 'fallback_108', fallback_triggered_at: new Date().toISOString(),
            fallback_reason: 'Hospital did not dispatch within 15 minutes',
          } as any).eq('id', emergency.id);
        }
      }
    };
    const interval = setInterval(checkFallback, 30000);
    checkFallback();
    return () => clearInterval(interval);
  }, [emergency]);

  if (!emergency) return null;

  // Overridden — not emergency
  if (emergency.status === 'overridden') return null;

  // Patient reached
  if (emergency.status === 'patient_reached') {
    return (
      <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="glass-card p-6 text-center border-primary/40" style={{ background: 'hsla(152,100%,45%,0.08)' }}>
        <p className="text-4xl mb-3">🎉</p>
        <h2 className="font-display text-2xl font-bold text-primary">Ambulance Has Arrived!</h2>
        <p className="text-sm text-muted-foreground mt-2">Go with the ambulance driver</p>
        {hospital && <p className="text-sm text-foreground mt-1">You're going to {hospital.name}</p>}
      </motion.div>
    );
  }

  // 108 Fallback
  if (emergency.status === 'fallback_108') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 border-destructive/50 text-center" style={{ background: 'hsla(353,90%,64%,0.1)' }}>
        <Siren className="h-16 w-16 text-destructive mx-auto mb-4 animate-pulse" />
        <h2 className="font-display text-2xl font-bold text-destructive mb-2">Connecting to 108 Emergency</h2>
        <p className="text-sm text-muted-foreground mb-4">{(emergency as any).fallback_reason}</p>
        <div className="glass-card p-4 text-left space-y-2 mb-4">
          <p className="text-sm text-foreground"><strong>Name:</strong> {patient?.name}</p>
          <p className="text-sm text-foreground"><strong>Age:</strong> {patient?.age}</p>
          <p className="text-sm text-foreground"><strong>Village:</strong> {patient?.village}</p>
        </div>
        <a href="tel:108" className="block w-full py-4 rounded-xl bg-destructive text-destructive-foreground font-bold text-lg mb-3">📞 Call 108 Now</a>
        <p className="text-xs text-muted-foreground">Tell them: "I am calling from MediAI. Case ID: {emergency.id.slice(0, 8)}"</p>
      </motion.div>
    );
  }

  const currentStepIdx = STEPS.findIndex(s => s.key === emergency.status);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-4">
      <h3 className="font-display font-bold text-foreground text-lg">🚨 Emergency Status</h3>

      <div className="space-y-4">
        {STEPS.map((step, i) => {
          const isDone = i < currentStepIdx || (i === currentStepIdx && emergency.status === 'patient_reached');
          const isCurrent = i === currentStepIdx && emergency.status !== 'patient_reached';
          let desc = step.desc;
          if (step.key === 'doctor_confirmed' && doctor) desc = `Dr. ${doctor.name} has reviewed your case`;
          if (step.key === 'hospital_notified' && hospital) desc = `${hospital.name} is preparing for your arrival`;
          if (step.key === 'ambulance_dispatched' && ambulance) desc = `${ambulance.vehicle_number} on the way. ETA: ${eta || emergency.ambulance_eta || '?'} min. Driver: ${ambulance.driver_name}`;

          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${isDone ? 'bg-primary/20' : isCurrent ? 'bg-urgent/20' : 'bg-secondary'}`}>
                {isDone ? <CheckCircle className="h-4 w-4 text-primary" /> : isCurrent ? <Loader2 className="h-4 w-4 text-urgent animate-spin" /> : <span className="text-muted-foreground">○</span>}
              </div>
              <div>
                <p className={`text-sm font-medium ${isDone ? 'text-primary' : isCurrent ? 'text-urgent' : 'text-muted-foreground'}`}>{step.icon} {step.title}</p>
                {desc && (isDone || isCurrent) && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ambulance details */}
      {ambulance && emergency.status === 'ambulance_dispatched' && (
        <div className="glass-card p-4 border-primary/30" style={{ background: 'hsla(152,100%,45%,0.05)' }}>
          <p className="text-sm font-bold text-foreground mb-2">🚑 Ambulance Details</p>
          <p className="text-xs text-muted-foreground">Vehicle: {ambulance.vehicle_number}</p>
          <p className="text-xs text-muted-foreground">Driver: {ambulance.driver_name}</p>
          {ambulance.driver_phone && (
            <a href={`tel:${ambulance.driver_phone}`} className="inline-flex items-center gap-1 mt-2 px-4 py-2 rounded-xl bg-info/20 text-info text-sm font-bold">
              <Phone className="h-4 w-4" /> Call Driver: {ambulance.driver_phone}
            </a>
          )}
          <p className="text-lg font-mono text-primary mt-2">ETA: {eta || emergency.ambulance_eta} minutes</p>

          {/* Map link */}
          {emergency.patient_lat && (
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${emergency.patient_lat},${emergency.patient_lng}`}
              target="_blank" rel="noopener noreferrer"
              className="block mt-2 text-xs text-info underline">
              📍 View on Google Maps
            </a>
          )}
        </div>
      )}

      {/* Call 108 always available */}
      <a href="tel:108" className="flex items-center gap-3 glass-card p-3 border-destructive/30 w-full text-sm">
        <Phone className="h-5 w-5 text-destructive" />
        <span className="font-bold text-destructive">Call 108</span>
        <span className="text-xs text-muted-foreground">Emergency Ambulance</span>
      </a>
    </motion.div>
  );
};

export default EmergencyTracker;
