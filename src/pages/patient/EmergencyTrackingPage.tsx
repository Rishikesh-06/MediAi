import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, Loader2, Phone, MapPin, Siren, Clock, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

const STATUS_ORDER = ['doctor_confirmed', 'hospital_notified', 'ambulance_dispatched', 'patient_reached'];

const STEPS = [
  { key: 'doctor_confirmed', icon: '👨‍⚕️', title: 'Doctor Confirmed' },
  { key: 'hospital_notified', icon: '🏥', title: 'Hospital Notified' },
  { key: 'ambulance_dispatched', icon: '🚑', title: 'Ambulance Dispatched' },
  { key: 'patient_reached', icon: '✅', title: 'Ambulance Arrived' },
];

const EmergencyTrackingPage = () => {
  const { emergencyId } = useParams();
  const navigate = useNavigate();
  const patient = useAppStore(s => s.currentPatient);

  const [emergency, setEmergency] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [hospital, setHospital] = useState<any>(null);
  const [ambulance, setAmbulance] = useState<any>(null);
  const [etaSeconds, setEtaSeconds] = useState(0);
  const [showArrived, setShowArrived] = useState(false);
  const [loading, setLoading] = useState(true);
  const wakeLockRef = useRef<any>(null);

  const loadData = async () => {
    if (!emergencyId) return;
    const { data: em } = await supabase.from('emergencies').select('*').eq('id', emergencyId).single();
    if (!em) { setLoading(false); return; }
    setEmergency(em);

    const [docRes, hospRes, ambRes] = await Promise.all([
      em.doctor_id ? supabase.from('doctors').select('name, specialty').eq('id', em.doctor_id).single() : { data: null },
      em.hospital_id ? supabase.from('hospitals').select('name, location, lat, lng').eq('id', em.hospital_id).single() : { data: null },
      (em as any).ambulance_id ? supabase.from('ambulances').select('*').eq('id', (em as any).ambulance_id).single() : { data: null },
    ] as any[]);
    if (docRes?.data) setDoctor(docRes.data);
    if (hospRes?.data) setHospital(hospRes.data);
    if (ambRes?.data) {
      setAmbulance(ambRes.data);
      setEtaSeconds((ambRes.data.eta_minutes || em.ambulance_eta || 0) * 60);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [emergencyId]);

  // Keep screen awake
  useEffect(() => {
    navigator.wakeLock?.request('screen').then(wl => { wakeLockRef.current = wl; }).catch(() => {});
    return () => { wakeLockRef.current?.release(); };
  }, []);

  // Realtime emergency updates
  useEffect(() => {
    if (!emergencyId) return;
    const ch = supabase.channel(`track-em-${emergencyId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'emergencies', filter: `id=eq.${emergencyId}` }, (payload: any) => {
        setEmergency((prev: any) => ({ ...prev, ...payload.new }));
        if (payload.new.status === 'hospital_notified') toast.success('🏥 Hospital notified!');
        if (payload.new.status === 'ambulance_dispatched') {
          toast.success('🚑 Ambulance dispatched!');
          setEtaSeconds((payload.new.ambulance_eta || 15) * 60);
          if (payload.new.ambulance_id) {
            supabase.from('ambulances').select('*').eq('id', payload.new.ambulance_id).single().then(({ data }) => {
              if (data) setAmbulance(data);
            });
          }
        }
        if (payload.new.status === 'patient_reached') {
          toast.success('✅ Ambulance arrived!');
          setShowArrived(true);
        }
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [emergencyId]);

  // Realtime ambulance tracking
  useEffect(() => {
    const ambId = (emergency as any)?.ambulance_id;
    if (!ambId) return;
    const ch = supabase.channel(`track-amb-${ambId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ambulances', filter: `id=eq.${ambId}` }, (payload: any) => {
        setAmbulance((prev: any) => ({ ...prev, ...payload.new }));
        if (payload.new.eta_minutes) setEtaSeconds(payload.new.eta_minutes * 60);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [(emergency as any)?.ambulance_id]);

  // ETA countdown
  useEffect(() => {
    if (etaSeconds <= 0) return;
    const timer = setInterval(() => setEtaSeconds(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(timer);
  }, [etaSeconds > 0]);

  const updateLocation = async () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      await Promise.all([
        supabase.from('emergencies').update({ patient_lat: lat, patient_lng: lng }).eq('id', emergencyId!),
      ]);
      toast.success('📍 Location updated!');
    }, () => toast.error('Could not get location'));
  };

  const handleResolved = async () => {
    await supabase.from('emergencies').update({ status: 'resolved' } as any).eq('id', emergencyId!);
    navigate('/patient');
  };

  const formatEta = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!emergency) return <div className="text-center p-8 text-muted-foreground">Emergency not found</div>;

  const currentIdx = STATUS_ORDER.indexOf(emergency.status);
  const patLat = emergency.patient_lat || 17.385;
  const patLng = emergency.patient_lng || 78.4867;

  // Arrived modal
  if (showArrived) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="min-h-[80vh] flex flex-col items-center justify-center text-center space-y-6 p-6">
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
          <CheckCircle className="h-12 w-12 text-primary" />
        </motion.div>
        <h1 className="font-display text-3xl font-bold text-primary">Ambulance Has Arrived!</h1>
        <p className="text-muted-foreground">Go with the ambulance driver</p>
        {hospital && <p className="text-foreground font-semibold">You're being taken to: {hospital.name}</p>}
        <p className="text-xs text-muted-foreground font-mono">Case ID: {emergency.id.slice(0, 8).toUpperCase()}</p>
        <p className="text-sm text-muted-foreground">Show this to hospital staff</p>
        <button onClick={handleResolved} className="w-full max-w-xs py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg">
          ✓ I'm with the driver
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-8">
      {/* Status Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className={`glass-card p-5 text-center border-l-4 ${
          emergency.status === 'ambulance_dispatched' ? 'border-l-primary' :
          emergency.status === 'patient_reached' ? 'border-l-primary' : 'border-l-amber-500'
        }`}>
        <p className="text-3xl mb-2">
          {emergency.status === 'doctor_confirmed' && '🏥'}
          {emergency.status === 'hospital_notified' && '📋'}
          {emergency.status === 'ambulance_dispatched' && '🚑'}
          {emergency.status === 'patient_reached' && '✅'}
          {emergency.status === 'pending' && '⏳'}
        </p>
        <h1 className="font-display text-xl font-bold text-foreground">
          {emergency.status === 'doctor_confirmed' && 'Notifying Hospital...'}
          {emergency.status === 'hospital_notified' && 'Hospital Preparing...'}
          {emergency.status === 'ambulance_dispatched' && 'Ambulance On The Way!'}
          {emergency.status === 'patient_reached' && 'Ambulance Arrived!'}
          {emergency.status === 'pending' && 'Finding Help...'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Stay calm. Help is on the way.</p>
      </motion.div>

      {/* Progress Steps */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="font-display font-bold text-foreground text-sm">Live Progress</h3>
        {STEPS.map((step, i) => {
          const isDone = i < currentIdx || emergency.status === 'patient_reached';
          const isCurrent = i === currentIdx && emergency.status !== 'patient_reached';
          let desc = '';
          if (step.key === 'doctor_confirmed' && doctor) desc = `Dr. ${doctor.name} confirmed`;
          if (step.key === 'hospital_notified' && hospital) desc = `${hospital.name} alerted`;
          if (step.key === 'ambulance_dispatched' && ambulance) desc = `${ambulance.vehicle_number} — ETA ${Math.ceil(etaSeconds / 60)} min`;
          if (step.key === 'patient_reached') desc = 'Help has reached you';

          const time = step.key === 'doctor_confirmed' ? emergency.doctor_confirmed_at :
            step.key === 'hospital_notified' ? emergency.hospital_notified_at :
            step.key === 'ambulance_dispatched' ? emergency.ambulance_dispatched_at :
            step.key === 'patient_reached' ? emergency.reached_at : null;

          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                isDone ? 'bg-primary/20' : isCurrent ? 'bg-amber-500/20 animate-pulse' : 'bg-secondary'
              }`}>
                {isDone ? <CheckCircle className="h-4 w-4 text-primary" /> :
                  isCurrent ? <Loader2 className="h-4 w-4 text-amber-500 animate-spin" /> :
                  <span className="text-muted-foreground text-xs">○</span>}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${isDone ? 'text-primary' : isCurrent ? 'text-amber-500' : 'text-muted-foreground'}`}>
                  {step.icon} {step.title}
                </p>
                {desc && (isDone || isCurrent) && <p className="text-xs text-muted-foreground">{desc}</p>}
                {time && isDone && <p className="text-xs text-muted-foreground/60">{new Date(time).toLocaleTimeString()}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ambulance Info */}
      {ambulance && (emergency.status === 'ambulance_dispatched' || emergency.status === 'patient_reached') && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5 border border-primary/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🚑</span>
            <span className="font-display font-bold text-foreground text-lg">{ambulance.vehicle_number}</span>
          </div>
          <p className="text-sm text-muted-foreground">Driver: <span className="text-foreground font-medium">{ambulance.driver_name}</span></p>
          {ambulance.driver_phone && (
            <a href={`tel:${ambulance.driver_phone}`} className="mt-2 inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/10 text-primary font-bold text-sm">
              <Phone className="h-4 w-4" /> Call Driver: {ambulance.driver_phone}
            </a>
          )}
          {emergency.status === 'ambulance_dispatched' && etaSeconds > 0 && (
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">Estimated arrival</p>
              <p className="font-mono text-4xl font-bold text-primary">{formatEta(etaSeconds)}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Map */}
      {emergency.status === 'ambulance_dispatched' && (
        <div className="glass-card p-3 overflow-hidden">
          <iframe
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${patLng - 0.05},${patLat - 0.05},${patLng + 0.05},${patLat + 0.05}&layer=mapnik&marker=${patLat},${patLng}`}
            className="w-full h-[200px] rounded-lg border-0"
            loading="lazy"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={updateLocation} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium">
              <MapPin className="h-4 w-4" /> Update Location
            </button>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${patLat},${patLng}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium">
              <Navigation className="h-4 w-4" /> Open Maps
            </a>
          </div>
        </div>
      )}

      {/* Hospital Info */}
      {hospital && currentIdx >= 1 && (
        <div className="glass-card p-4">
          <p className="text-sm font-bold text-foreground mb-1">🏥 {hospital.name}</p>
          <p className="text-xs text-muted-foreground">📍 {hospital.location}</p>
          {hospital.phone && (
            <a href={`tel:${hospital.phone}`} className="mt-2 inline-flex items-center gap-1 text-sm text-primary font-medium">
              <Phone className="h-3 w-3" /> {hospital.phone}
            </a>
          )}
        </div>
      )}

      {/* Emergency Contacts */}
      <div className="glass-card p-4 space-y-2">
        <p className="text-sm font-bold text-foreground">Emergency Contacts</p>
        {patient?.emergency_contacts?.length > 0 && patient.emergency_contacts.map((c: any, i: number) => (
          <a key={i} href={`tel:${c.phone}`} className="flex items-center gap-2 py-2 text-sm text-foreground">
            <Phone className="h-4 w-4 text-primary" /> {c.name}: {c.phone}
          </a>
        ))
        }
        <a href="tel:108" className="flex items-center gap-2 py-3 px-4 rounded-xl bg-destructive/10 text-destructive font-bold text-sm">
          <Siren className="h-5 w-5" /> Call 108 — National Emergency
        </a>
      </div>

      {/* Waiting tip */}
      {currentIdx < 2 && (
        <div className="glass-card p-4 border border-amber-500/20">
          <p className="text-sm font-bold text-amber-500 mb-1">⏳ While you wait</p>
          <p className="text-xs text-muted-foreground">Stay calm and stay where you are. Average response time: 5-10 minutes.</p>
          <p className="text-xs text-muted-foreground mt-1">Keep your phone screen on and volume up.</p>
        </div>
      )}
    </div>
  );
};

export default EmergencyTrackingPage;
