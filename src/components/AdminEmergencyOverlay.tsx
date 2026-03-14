import { motion } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Siren, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

const AdminEmergencyOverlay = () => {
  const hospital = useAppStore(s => s.currentHospital);
  const [emergencyData, setEmergencyData] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [healthCheck, setHealthCheck] = useState<any>(null);
  const [beds, setBeds] = useState<any[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [selectedBed, setSelectedBed] = useState('');
  const [selectedAmbulance, setSelectedAmbulance] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const alertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const overlayShownForRef = useRef<string | null>(null);

  const playAlertSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const playBeep = (time: number, freq: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.value = freq; osc.type = 'sawtooth'; gain.gain.value = 0.3;
        osc.start(time); osc.stop(time + 0.25);
      };
      for (let i = 0; i < 6; i++) {
        playBeep(audioCtx.currentTime + i * 0.3, i % 2 === 0 ? 1040 : 880);
      }
      alertIntervalRef.current = setInterval(() => {
        try {
          const ctx = audioCtxRef.current;
          if (!ctx) return;
          for (let i = 0; i < 4; i++) {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = i % 2 === 0 ? 1040 : 880; osc.type = 'sawtooth'; gain.gain.value = 0.3;
            osc.start(ctx.currentTime + i * 0.3); osc.stop(ctx.currentTime + i * 0.3 + 0.25);
          }
        } catch {}
      }, 3000);
    } catch {}
  }, []);

  const stopSound = useCallback(() => {
    if (alertIntervalRef.current) { clearInterval(alertIntervalRef.current); alertIntervalRef.current = null; }
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
  }, []);

  const loadEmergencyData = useCallback(async (em: any) => {
    if (overlayShownForRef.current === em.id) return; // Already showing this one
    overlayShownForRef.current = em.id;
    console.log('🚨 Loading emergency dispatch data for:', em.id);

    const [pRes, hcRes, bedRes, ambRes] = await Promise.all([
      supabase.from('patients').select('*').eq('id', em.patient_id).single(),
      em.health_check_id
        ? supabase.from('health_checks').select('*').eq('id', em.health_check_id).single()
        : supabase.from('health_checks').select('*').eq('patient_id', em.patient_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('beds').select('*').eq('hospital_id', hospital!.id).eq('status', 'available'),
      supabase.from('ambulances').select('*').eq('hospital_id', hospital!.id).eq('status', 'free'),
    ]);

    setEmergencyData(em);
    if (pRes.data) setPatient(pRes.data);
    if (hcRes.data) setHealthCheck(hcRes.data);
    setBeds(bedRes.data || []);
    setAmbulances(ambRes.data || []);
    if (bedRes.data?.length) setSelectedBed(bedRes.data[0].id);
    if (ambRes.data?.length) setSelectedAmbulance(ambRes.data[0].id);
    playAlertSound();
  }, [hospital, playAlertSound]);

  useEffect(() => {
    if (!hospital?.id) return;

    console.log('Admin overlay listening. Hospital:', hospital.id, 'Auth:', hospital.admin_auth_id);

    // CHANNEL 1: Listen on emergencies table for this hospital
    const emergencyChannel = supabase
      .channel('admin-emergency-watch-' + hospital.id)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'emergencies',
      }, async (payload: any) => {
        const em = payload.new;
        console.log('Emergency UPDATE received:', em.id, 'status:', em.status, 'hospital_id:', em.hospital_id);
        if (em.hospital_id !== hospital.id) return;
        if (em.status !== 'hospital_notified') return;
        if (emergencyData) return; // Already showing one
        await loadEmergencyData(em);
      })
      .subscribe((status) => console.log('EmergencyChannel:', status));

    // CHANNEL 2: Listen on notifications for admin
    let notifChannel: any = null;
    if (hospital.admin_auth_id) {
      notifChannel = supabase
        .channel('admin-notifs-' + hospital.id)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: 'user_id=eq.' + hospital.admin_auth_id,
        }, async (payload: any) => {
          console.log('Admin notification received:', payload.new.type);
          if (payload.new.type !== 'emergency_confirmed') return;
          if (emergencyData) return;

          // Find the pending emergency
          const { data: ems } = await supabase.from('emergencies')
            .select('*')
            .eq('hospital_id', hospital.id)
            .eq('status', 'hospital_notified')
            .order('created_at', { ascending: false }).limit(1);
          if (ems?.length) await loadEmergencyData(ems[0]);
        })
        .subscribe((status) => console.log('NotifChannel:', status));
    }

    // CHANNEL 3: Polling fallback every 10 seconds
    const pollInterval = setInterval(async () => {
      if (emergencyData) return; // Already showing
      
      const { data: pending } = await supabase.from('emergencies')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('status', 'hospital_notified')
        .is('ambulance_id', null)
        .order('created_at', { ascending: false }).limit(1);

      if (pending?.length) {
        console.log('📊 Poll found pending emergency:', pending[0].id);
        await loadEmergencyData(pending[0]);
      }
    }, 10000);

    // Also check immediately on mount
    (async () => {
      const { data: pending } = await supabase.from('emergencies')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('status', 'hospital_notified')
        .is('ambulance_id', null)
        .order('created_at', { ascending: false }).limit(1);
      if (pending?.length) {
        console.log('📊 Initial check found pending emergency:', pending[0].id);
        await loadEmergencyData(pending[0]);
      }
    })();

    return () => {
      supabase.removeChannel(emergencyChannel);
      if (notifChannel) supabase.removeChannel(notifChannel);
      clearInterval(pollInterval);
      stopSound();
    };
  }, [hospital?.id, hospital?.admin_auth_id]);

  const startAmbulanceSimulation = (ambulanceId: string, destLat: number, destLng: number, emergencyId: string) => {
    let currentLat = hospital?.lat || destLat - 0.04;
    let currentLng = hospital?.lng || destLng - 0.04;
    let stepCount = 0;

    const interval = setInterval(async () => {
      stepCount++;
      currentLat += (destLat - currentLat) * 0.12;
      currentLng += (destLng - currentLng) * 0.12;

      const distance = Math.sqrt(Math.pow(destLat - currentLat, 2) + Math.pow(destLng - currentLng, 2));
      const etaRemaining = Math.max(0, Math.round(distance * 800));

      await supabase.from('ambulances').update({
        current_lat: currentLat, current_lng: currentLng, eta_minutes: etaRemaining,
      } as any).eq('id', ambulanceId);

      if (distance < 0.001 || stepCount > 15) {
        clearInterval(interval);
        await Promise.all([
          supabase.from('emergencies').update({
            status: 'patient_reached', reached_at: new Date().toISOString(),
          } as any).eq('id', emergencyId),
          supabase.from('ambulances').update({
            status: 'at_patient', eta_minutes: 0,
          } as any).eq('id', ambulanceId),
        ]);
        console.log('🚑 Ambulance simulation: arrived!');
      }
    }, 8000);
  };

  const dispatch = async () => {
    if (!emergencyData || !hospital) return;
    setDispatching(true);
    stopSound();

    try {
      const bed = beds.find(b => b.id === selectedBed);
      const amb = ambulances.find(a => a.id === selectedAmbulance);

      let eta = 15;
      if (emergencyData.patient_lat && hospital.lat) {
        const R = 6371;
        const dLat = (emergencyData.patient_lat - hospital.lat) * Math.PI / 180;
        const dLng = (emergencyData.patient_lng - (hospital.lng || 0)) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos((hospital.lat || 0) * Math.PI / 180) * Math.cos(emergencyData.patient_lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        eta = Math.max(5, Math.round(dist / 40 * 60));
      }

      if (amb) {
        await supabase.from('ambulances').update({
          status: 'active', destination: patient?.village || 'Patient location',
          eta_minutes: eta, patient_id: emergencyData.patient_id,
          current_lat: hospital.lat, current_lng: hospital.lng,
          destination_lat: emergencyData.patient_lat, destination_lng: emergencyData.patient_lng,
          current_emergency_id: emergencyData.id,
        } as any).eq('id', amb.id);
      }

      if (bed) {
        await supabase.from('beds').update({
          status: 'reserved', patient_name: patient?.name || 'Emergency',
        }).eq('id', bed.id);
      }

      await supabase.from('emergencies').update({
        status: 'ambulance_dispatched',
        ambulance_id: amb?.id || null,
        ambulance_eta: eta,
        bed_assigned: bed?.bed_number || null,
        ambulance_dispatched_at: new Date().toISOString(),
      } as any).eq('id', emergencyData.id);

      console.log('✅ Dispatch complete. ETA:', eta, 'min');

      // Notify patient
      if (patient?.auth_user_id) {
        await supabase.from('notifications').insert({
          user_id: patient.auth_user_id, user_type: 'patient',
          title: '🚑 Ambulance Dispatched!',
          message: `${amb?.vehicle_number || 'Ambulance'} is on the way! Driver: ${amb?.driver_name || 'Driver'}. ETA: ${eta} minutes. Stay where you are!`,
          type: 'ambulance_dispatched',
        });
      }

      // Decrement available beds
      if (bed) {
        const { data: hosp } = await supabase.from('hospitals').select('available_beds').eq('id', hospital.id).single();
        if (hosp && (hosp.available_beds || 0) > 0) {
          await supabase.from('hospitals').update({ available_beds: (hosp.available_beds || 1) - 1 }).eq('id', hospital.id);
        }
      }

      toast({ title: `✅ Ambulance dispatched! ETA: ${eta} min` });
      overlayShownForRef.current = null;
      setEmergencyData(null);

      // Start ambulance simulation
      if (amb && emergencyData.patient_lat) {
        startAmbulanceSimulation(amb.id, emergencyData.patient_lat, emergencyData.patient_lng, emergencyData.id);
      }
    } catch (e: any) {
      console.error('Dispatch failed:', e);
      toast({ title: "Dispatch failed", description: e.message, variant: "destructive" });
    }
    setDispatching(false);
  };

  const dismiss = () => {
    stopSound();
    overlayShownForRef.current = null;
    setEmergencyData(null);
  };

  if (!emergencyData) return null;

  const riskScore = healthCheck?.ai_risk_score;
  const condition = healthCheck?.ai_condition;
  const vitals = healthCheck?.vitals || {};

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <motion.div
        animate={{ borderColor: ['hsla(353,90%,64%,0.3)', 'hsla(353,90%,64%,0.8)', 'hsla(353,90%,64%,0.3)'] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="glass-card p-6 max-w-lg w-full space-y-4 border-2 max-h-[90vh] overflow-y-auto"
        style={{ background: 'hsla(156,53%,5%,0.95)' }}>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Siren className="h-6 w-6 text-destructive animate-pulse" />
            <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }}
              className="font-display text-lg font-extrabold text-destructive">🚨 EMERGENCY DISPATCH</motion.span>
          </div>
          <button onClick={dismiss}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        {/* Patient Info */}
        <div className="space-y-2 text-sm">
          <p className="text-foreground text-lg font-bold">{patient?.name}, {patient?.age}yr, {patient?.gender}</p>
          <p className="text-muted-foreground">📍 {patient?.village} {patient?.district ? `• ${patient.district}` : ''}</p>
          {patient?.blood_group && <p className="text-muted-foreground">🩸 {patient.blood_group}</p>}
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="px-3 py-1 rounded-full bg-destructive/20 text-destructive font-bold text-sm">
              🔴 Risk: {riskScore ?? '?'}%
            </span>
            {condition && (
              <span className="px-3 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/30 text-sm">
                {condition}
              </span>
            )}
          </div>
        </div>

        {/* Vitals */}
        <div className="grid grid-cols-3 gap-2">
          {[
            ['BP', vitals.bp_sys ? `${vitals.bp_sys}/${vitals.bp_dia}` : null],
            ['HR', vitals.hr ? `${vitals.hr} bpm` : null],
            ['SpO2', vitals.spo2 ? `${vitals.spo2}%` : null],
          ].map(([label, val]) => val && (
            <div key={label as string} className="glass-card p-2 text-center">
              <div className="text-[10px] text-primary">{label}</div>
              <div className="text-sm font-bold text-foreground">{val}</div>
            </div>
          ))}
        </div>

        {/* AI Recommendation */}
        <div className="glass-card p-3 space-y-1 text-xs">
          <p className="text-muted-foreground font-bold">🤖 AI Recommends:</p>
          <p className="text-foreground">🛏️ {beds[0]?.bed_number || 'No bed available'} ({beds[0]?.ward || 'N/A'})</p>
          <p className="text-foreground">🚑 {ambulances[0]?.vehicle_number || 'No ambulance free'} — {ambulances[0]?.driver_name || ''}</p>
        </div>

        {/* Select Bed */}
        <div>
          <label className="text-xs text-primary font-bold">🛏️ Select Bed ({beds.length} available)</label>
          {beds.length === 0 ? (
            <p className="text-xs text-destructive mt-1">⚠️ No beds available — patient will be admitted on arrival</p>
          ) : (
            <select value={selectedBed} onChange={e => setSelectedBed(e.target.value)}
              className="w-full mt-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none">
              {beds.map(b => <option key={b.id} value={b.id}>{b.bed_number} — {b.ward}</option>)}
            </select>
          )}
        </div>

        {/* Select Ambulance */}
        <div>
          <label className="text-xs text-primary font-bold">🚑 Select Ambulance ({ambulances.length} available)</label>
          {ambulances.length === 0 ? (
            <p className="text-xs text-destructive mt-1">⚠️ No ambulances free — call 108 as backup</p>
          ) : (
            <select value={selectedAmbulance} onChange={e => setSelectedAmbulance(e.target.value)}
              className="w-full mt-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none">
              {ambulances.map(a => <option key={a.id} value={a.id}>{a.vehicle_number} — {a.driver_name}</option>)}
            </select>
          )}
        </div>

        {/* Dispatch Button */}
        <motion.button whileTap={{ scale: 0.95 }} onClick={dispatch}
          disabled={dispatching}
          className="w-full py-4 rounded-xl bg-destructive text-destructive-foreground font-display font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50">
          {dispatching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Siren className="h-5 w-5" />}
          {dispatching ? 'Dispatching...' : '🚑 DISPATCH NOW'}
        </motion.button>

        {/* Fallback 108 */}
        <a href="tel:108"
          className="w-full py-3 rounded-xl border border-border text-sm text-muted-foreground flex items-center justify-center gap-2">
          📞 Call 108 Instead
        </a>
      </motion.div>
    </motion.div>
  );
};

export default AdminEmergencyOverlay;
