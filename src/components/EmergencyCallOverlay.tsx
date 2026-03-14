import { motion } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";

interface IncomingCall {
  appointmentId: string;
  patientId: string;
  emergencyId?: string;
  patient: any;
  healthCheck: any;
  emergency: any;
}

const EmergencyCallOverlay = () => {
  const doctor = useAppStore(s => s.currentDoctor);
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [accepting, setAccepting] = useState(false);
  const alertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playAlertSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      const playBeep = (time: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.value = 0.3;
        osc.start(time);
        osc.stop(time + 0.2);
      };

      playBeep(audioCtx.currentTime);
      playBeep(audioCtx.currentTime + 0.4);
      playBeep(audioCtx.currentTime + 0.8);

      alertIntervalRef.current = setInterval(() => {
        try {
          const ctx = audioCtxRef.current;
          if (!ctx) return;
          const playB = (t: number) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.frequency.value = 880; o.type = 'sine'; g.gain.value = 0.3;
            o.start(t); o.stop(t + 0.2);
          };
          playB(ctx.currentTime);
          playB(ctx.currentTime + 0.4);
          playB(ctx.currentTime + 0.8);
        } catch {}
      }, 2000);
    } catch (e) {
      console.log('Audio error:', e);
    }
  }, []);

  const stopAlertSound = useCallback(() => {
    if (alertIntervalRef.current) {
      clearInterval(alertIntervalRef.current);
      alertIntervalRef.current = null;
    }
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
  }, []);

  useEffect(() => {
    if (!doctor?.id) return;

    console.log('Doctor listening for calls. Doctor ID:', doctor.id, 'Auth ID:', doctor.auth_id);

    // PRIMARY: Listen on appointments table for new emergency calls
    const callChannel = supabase
      .channel('incoming-calls-' + doctor.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'appointments',
        filter: 'doctor_id=eq.' + doctor.id
      }, async (payload: any) => {
        console.log('New appointment detected:', payload.new);
        const appt = payload.new;
        if (appt.type !== 'video_emergency' && appt.type !== 'video') return;
        if (appt.status !== 'calling') return;

        // Load patient data
        const [patientRes, hcRes, emRes] = await Promise.all([
          supabase.from('patients').select('*').eq('id', appt.patient_id).single(),
          supabase.from('health_checks').select('*').eq('patient_id', appt.patient_id)
            .order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('emergencies').select('*').eq('patient_id', appt.patient_id)
            .in('status', ['pending']).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ]);

        console.log('Loaded patient:', patientRes.data?.name, 'HC:', hcRes.data?.id, 'Emergency:', emRes.data?.id);

        setIncomingCall({
          appointmentId: appt.id,
          patientId: appt.patient_id,
          emergencyId: emRes.data?.id,
          patient: patientRes.data,
          healthCheck: hcRes.data,
          emergency: emRes.data,
        });
        playAlertSound();
      })
      .subscribe((status) => {
        console.log('Call channel subscription status:', status);
      });

    // BACKUP: Also listen on notifications table
    let notifChannel: any = null;
    if (doctor.auth_id) {
      notifChannel = supabase
        .channel('doctor-notifs-' + doctor.id)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'user_id=eq.' + doctor.auth_id
        }, async (payload: any) => {
          console.log('Doctor notification:', payload.new);
          if (payload.new.type !== 'emergency_call') return;

          // Find the latest calling appointment for this doctor
          const { data: appts } = await supabase.from('appointments')
            .select('*')
            .eq('doctor_id', doctor.id)
            .eq('status', 'calling')
            .order('created_at', { ascending: false })
            .limit(1);

          if (!appts?.length) return;
          const appt = appts[0];

          const [patientRes, hcRes, emRes] = await Promise.all([
            supabase.from('patients').select('*').eq('id', appt.patient_id).single(),
            supabase.from('health_checks').select('*').eq('patient_id', appt.patient_id)
              .order('created_at', { ascending: false }).limit(1).maybeSingle(),
            supabase.from('emergencies').select('*').eq('patient_id', appt.patient_id)
              .in('status', ['pending']).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          ]);

          setIncomingCall(prev => {
            if (prev) return prev; // Don't overwrite existing call
            playAlertSound();
            return {
              appointmentId: appt.id,
              patientId: appt.patient_id,
              emergencyId: emRes.data?.id,
              patient: patientRes.data,
              healthCheck: hcRes.data,
              emergency: emRes.data,
            };
          });
        })
        .subscribe();
    }

    return () => {
      supabase.removeChannel(callChannel);
      if (notifChannel) supabase.removeChannel(notifChannel);
      stopAlertSound();
    };
  }, [doctor?.id, doctor?.auth_id, playAlertSound, stopAlertSound]);

  const acceptCall = async () => {
    if (!incomingCall) return;
    setAccepting(true);
    stopAlertSound();

    await supabase.from('appointments').update({
      status: 'active',
      started_at: new Date().toISOString(),
    } as any).eq('id', incomingCall.appointmentId);

    const apptId = incomingCall.appointmentId;
    const patId = incomingCall.patientId;
    const emgId = incomingCall.emergencyId;
    setIncomingCall(null);
    setAccepting(false);
    navigate(`/doctor/video/${apptId}?patient=${patId}&emergency=${emgId || ''}`);
  };

  const declineCall = async () => {
    if (!incomingCall) return;
    stopAlertSound();

    await supabase.from('appointments').update({ status: 'declined' }).eq('id', incomingCall.appointmentId);

    // Notify patient
    if (incomingCall.patient?.auth_user_id) {
      await supabase.from('notifications').insert({
        user_id: incomingCall.patient.auth_user_id,
        user_type: 'patient',
        title: `Dr. ${doctor?.name} is unavailable`,
        message: 'Please try another doctor or call 108.',
        type: 'call_declined',
      });
    }

    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  const vitals: any = incomingCall.healthCheck?.vitals || {};
  const symptoms = incomingCall.healthCheck?.symptoms || [];
  const riskScore = incomingCall.healthCheck?.ai_risk_score;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <motion.div
        animate={{ borderColor: ['hsla(353,90%,64%,0.3)', 'hsla(353,90%,64%,0.8)', 'hsla(353,90%,64%,0.3)'] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="glass-card p-6 max-w-md w-full space-y-4 border-2 border-destructive/50"
        style={{ background: 'hsla(156,53%,5%,0.95)' }}>

        <div className="text-center">
          <motion.p animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }}
            className="text-destructive font-display text-xl font-extrabold">🚨 EMERGENCY INCOMING CALL 🚨</motion.p>
          <p className="text-sm text-muted-foreground mt-1">Patient needs immediate help</p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-foreground"><strong>Patient:</strong> {incomingCall.patient?.name}, {incomingCall.patient?.age}yr, {incomingCall.patient?.gender}</p>
          <p className="text-muted-foreground"><strong>Condition:</strong> {incomingCall.healthCheck?.ai_condition || 'Pending'}</p>
          {riskScore != null && <p className="font-mono text-destructive"><strong>Risk:</strong> {riskScore}% 🔴</p>}
          <p className="text-muted-foreground"><strong>Village:</strong> {incomingCall.patient?.village}</p>
        </div>

        {Array.isArray(symptoms) && symptoms.length > 0 && (
          <div>
            <p className="text-xs font-bold text-foreground mb-1">Symptoms:</p>
            <div className="flex flex-wrap gap-1">
              {symptoms.slice(0, 5).map((s: any, i: number) => (
                <span key={i} className="px-2 py-1 rounded-full bg-destructive/20 text-destructive text-xs">
                  {typeof s === 'string' ? s : s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {(vitals.bp_sys || vitals.bp_systolic || vitals.temp || vitals.temperature || vitals.hr || vitals.heart_rate || vitals.spo2) && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(vitals.bp_sys || vitals.bp_systolic) && (
              <p className="text-muted-foreground">BP: <span className="font-mono text-foreground">{vitals.bp_sys || vitals.bp_systolic}/{vitals.bp_dia || vitals.bp_diastolic}</span></p>
            )}
            {(vitals.temp || vitals.temperature) && (
              <p className="text-muted-foreground">Temp: <span className="font-mono text-foreground">{vitals.temp || vitals.temperature}°F</span></p>
            )}
            {(vitals.hr || vitals.heart_rate) && (
              <p className="text-muted-foreground">HR: <span className="font-mono text-foreground">{vitals.hr || vitals.heart_rate} bpm</span></p>
            )}
            {vitals.spo2 && <p className="text-muted-foreground">SpO2: <span className="font-mono text-foreground">{vitals.spo2}%</span></p>}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={declineCall}
            className="flex-1 py-3 rounded-xl bg-secondary text-muted-foreground font-bold text-sm flex items-center justify-center gap-2">
            <X className="h-4 w-4" /> Decline
          </button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={acceptCall} disabled={accepting}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
            {accepting ? 'Connecting...' : 'Accept Call'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EmergencyCallOverlay;
