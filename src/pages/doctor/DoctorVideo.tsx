import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Video, VideoOff, Phone, MessageSquare, Loader2, AlertTriangle, CheckCircle, Pill, Plus, X, Send } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { useWebRTC } from "@/hooks/useWebRTC";

const FREQUENCIES = [
  { label: "Once daily (1-0-0)", value: "Once daily", times: ["08:00"] },
  { label: "Twice daily (1-0-1)", value: "Twice daily", times: ["08:00", "20:00"] },
  { label: "Thrice daily (1-1-1)", value: "Thrice daily", times: ["08:00", "14:00", "20:00"] },
];

interface MedRow { name: string; strength: string; frequency: string; duration: string; timing: string; }
const emptyMed = (): MedRow => ({ name: "", strength: "", frequency: "Twice daily", duration: "7", timing: "after" });

const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const DoctorVideo = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const doctor = useAppStore(s => s.currentDoctor);

  const [appointment, setAppointment] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [healthCheck, setHealthCheck] = useState<any>(null);
  const [emergency, setEmergency] = useState<any>(null);
  const [duration, setDuration] = useState(0);

  // WebRTC
  const {
    localVideoRef,
    remoteVideoRef,
    callStatus: webrtcStatus,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    endCall: webrtcEndCall,
  } = useWebRTC(appointmentId, 'doctor');

  // Decision states
  const [decision, setDecision] = useState<'none' | 'confirmed' | 'prescription'>('none');
  const [confirming, setConfirming] = useState(false);

  // Prescription form state
  const [medicines, setMedicines] = useState<MedRow[]>([emptyMed()]);
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [sendingRx, setSendingRx] = useState(false);

  useEffect(() => {
    if (!doctor) { navigate('/doctor/login'); return; }
    if (!appointmentId) return;

    const searchParams = new URLSearchParams(window.location.search);
    const urlPatientId = searchParams.get('patient');
    const urlEmergencyId = searchParams.get('emergency');

    const loadData = async () => {
      const { data: appt } = await supabase.from('appointments').select('*').eq('id', appointmentId).single();
      if (!appt) return;
      setAppointment(appt);

      const patientId = urlPatientId || appt.patient_id;

      const [pRes, hcRes] = await Promise.all([
        supabase.from('patients').select('*').eq('id', patientId).single(),
        supabase.from('health_checks').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (pRes.data) setPatient(pRes.data);
      if (hcRes.data) { setHealthCheck(hcRes.data); setDiagnosis(hcRes.data.ai_condition || ''); }

      if (urlEmergencyId) {
        const { data: em } = await supabase.from('emergencies').select('*').eq('id', urlEmergencyId).single();
        if (em) setEmergency(em);
      } else {
        const { data: emRes } = await supabase.from('emergencies').select('*').eq('patient_id', patientId)
          .in('status', ['pending', 'doctor_confirmed', 'hospital_notified']).order('created_at', { ascending: false }).limit(1);
        if (emRes?.length) setEmergency(emRes[0]);
      }
    };
    loadData();

    return () => {};
  }, [appointmentId, doctor]);

  // Call timer
  useEffect(() => {
    const timer = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const endCall = async () => {
    await webrtcEndCall();
    navigate('/doctor');
  };

  const confirmEmergency = async () => {
    if (!emergency || !doctor || !patient) return;
    setConfirming(true);
    try {
      console.log('=== CONFIRMING EMERGENCY ===');
      console.log('Emergency ID:', emergency.id, 'Doctor:', doctor.name, 'Patient:', patient.name);

      // Step 1: Mark doctor_confirmed
      await supabase.from('emergencies').update({
        status: 'doctor_confirmed',
        doctor_confirmed_at: new Date().toISOString(),
        doctor_id: doctor.id,
      } as any).eq('id', emergency.id);
      console.log('✅ Emergency status → doctor_confirmed');

      // Step 2: Find hospital — try doctor's hospital first, then nearest, then any
      let nearestHospital: any = null;
      if (doctor.hospital_id) {
        const { data: h } = await supabase.from('hospitals').select('*').eq('id', doctor.hospital_id).single();
        if (h) nearestHospital = h;
      }
      if (!nearestHospital) {
        const { data: hospitals } = await supabase.from('hospitals').select('*').eq('is_registered', true);
        if (hospitals?.length) {
          nearestHospital = hospitals[0];
          if (hospitals.length > 1 && emergency.patient_lat) {
            nearestHospital = hospitals.reduce((best: any, h: any) => {
              if (!h.lat || !h.lng) return best;
              const dist = haversine(emergency.patient_lat, emergency.patient_lng, h.lat, h.lng);
              const bestDist = best?.lat ? haversine(emergency.patient_lat, emergency.patient_lng, best.lat, best.lng) : Infinity;
              return dist < bestDist ? h : best;
            }, hospitals[0]);
          }
        }
      }
      console.log('Hospital found:', nearestHospital?.name, 'Admin auth:', nearestHospital?.admin_auth_id);

      // Step 3: Link hospital and set hospital_notified
      if (nearestHospital) {
        const { error: updateErr } = await supabase.from('emergencies').update({
          hospital_id: nearestHospital.id,
          status: 'hospital_notified',
          hospital_notified_at: new Date().toISOString(),
        } as any).eq('id', emergency.id);
        console.log('✅ Emergency status → hospital_notified', updateErr ? 'ERROR: ' + updateErr.message : '');

        // Step 4: Notify admin via notifications table
        if (nearestHospital.admin_auth_id) {
          const { error: notifErr } = await supabase.from('notifications').insert({
            user_id: nearestHospital.admin_auth_id, user_type: 'admin',
            title: '🚨 EMERGENCY - Dispatch Now!',
            message: `Dr. ${doctor.name} confirmed EMERGENCY: ${patient.name}, ${patient.age}yr, ${patient.gender}. Condition: ${healthCheck?.ai_condition || 'Critical'}. Risk: ${healthCheck?.ai_risk_score || '?'}%. Village: ${patient.village}. DISPATCH AMBULANCE NOW!`,
            type: 'emergency_confirmed',
          });
          console.log('✅ Admin notification inserted', notifErr ? 'ERROR: ' + notifErr.message : '');
        } else {
          console.warn('⚠️ No admin_auth_id on hospital — admin may not get notification');
        }
      } else {
        console.error('❌ No hospital found! Emergency will show via polling fallback.');
      }

      // Step 5: Notify patient
      if (patient.auth_user_id) {
        await supabase.from('notifications').insert({
          user_id: patient.auth_user_id, user_type: 'patient',
          title: '✅ Doctor Confirmed Emergency',
          message: `Dr. ${doctor.name} confirmed your emergency. Hospital is being notified. Stay calm, help is coming.`,
          type: 'emergency_confirmed',
        });
      }

      console.log('=== EMERGENCY CONFIRMATION COMPLETE ===');
      setDecision('confirmed');
      toast({ title: "Emergency confirmed! Hospital notified ✅" });
      setTimeout(() => { endCall(); }, 30000);
    } catch (e: any) {
      console.error('CONFIRM EMERGENCY FAILED:', e);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setConfirming(false);
  };

  const overrideEmergency = async () => {
    if (!emergency || !doctor || !patient) return;
    try {
      await supabase.from('emergencies').update({
        status: 'overridden',
        overridden_by_doctor: doctor.id,
        override_reason: 'Doctor assessed as non-emergency after video consult',
        overridden_at: new Date().toISOString(),
      } as any).eq('id', emergency.id);

      await supabase.from('appointments').update({ type: 'regular' }).eq('id', appointment.id);

      await supabase.from('notifications').insert({
        user_id: patient.id, user_type: 'patient',
        title: '✅ Doctor Assessment',
        message: `Dr. ${doctor.name} assessed your condition. Not an emergency. Prescription being prepared.`,
        type: 'not_emergency',
      });

      setDecision('prescription');
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const sendPrescription = async () => {
    if (!patient || !doctor) return;
    const validMeds = medicines.filter(m => m.name);
    if (!validMeds.length) { toast({ title: "Add at least one medicine", variant: "destructive" }); return; }
    setSendingRx(true);
    try {
      const rxNumber = `RX-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${Math.floor(1000 + Math.random() * 9000)}`;
      await supabase.from('prescriptions').insert({
        patient_id: patient.id, doctor_id: doctor.id, rx_number: rxNumber, diagnosis,
        medicines: validMeds as any, doctor_notes: notes, follow_up_date: followUp,
        health_check_id: healthCheck?.id,
      } as any);

      for (const med of validMeds) {
        const freq = FREQUENCIES.find(f => f.value === med.frequency);
        await supabase.from('medicine_reminders').insert({
          patient_id: patient.id, medicine_name: med.name, dosage: med.strength,
          frequency: med.frequency, times: freq?.times || ["08:00", "20:00"],
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + parseInt(med.duration) * 86400000).toISOString().split('T')[0],
          is_active: true,
        });
      }

      await supabase.from('notifications').insert({
        user_id: patient.id, user_type: 'patient',
        title: '💊 Prescription Received',
        message: `Dr. ${doctor.name} sent prescription for ${diagnosis}. ${validMeds.length} medicine reminders set.`,
        type: 'prescription',
      });

      toast({ title: "Prescription sent! ✅" });
      setTimeout(() => endCall(), 3000);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSendingRx(false);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const vitals = healthCheck?.vitals || {};
  const symptoms = healthCheck?.symptoms || [];
  const riskScore = healthCheck?.ai_risk_score || 0;

  if (!doctor) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col lg:flex-row">
      {/* LEFT: Video Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-3 bg-card/90 backdrop-blur-xl border-b border-border/30">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-xs font-bold text-destructive">LIVE</span>
          </div>
          <p className="text-sm font-bold text-foreground">{patient?.name || 'Patient'}</p>
          <span className="font-mono text-xs text-primary">{formatTime(duration)}</span>
        </div>

        <div className="flex-1 flex items-center justify-center bg-secondary/30 relative overflow-hidden">
          {/* Remote video (patient's camera) — full area */}
          <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />

          {/* Overlay when video not yet streaming */}
          {webrtcStatus !== 'connected' && (
            <div className="relative z-10 text-center">
              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                className="w-28 h-28 rounded-full bg-info/10 flex items-center justify-center mx-auto mb-3 border-2 border-info/30">
                <span className="text-4xl font-bold text-info">{patient?.name?.charAt(0) || '?'}</span>
              </motion.div>
              <p className="text-foreground font-display font-bold">{patient?.name}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span className="text-xs text-primary">Connecting video...</span>
              </div>
            </div>
          )}

          {/* Connected badge */}
          {webrtcStatus === 'connected' && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-primary font-bold">LIVE</span>
            </div>
          )}

          {/* Local video PiP (doctor's own camera) */}
          <div className="absolute bottom-4 right-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-primary/30 bg-secondary z-20">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 p-3 bg-card/90 backdrop-blur-xl">
          <button onClick={toggleMute} className={`w-11 h-11 rounded-full flex items-center justify-center ${!isMuted ? "bg-secondary" : "bg-destructive"}`}>
            {!isMuted ? <Mic className="h-4 w-4 text-foreground" /> : <MicOff className="h-4 w-4 text-destructive-foreground" />}
          </button>
          <button onClick={toggleCamera} className={`w-11 h-11 rounded-full flex items-center justify-center ${!isCameraOff ? "bg-secondary" : "bg-destructive"}`}>
            {!isCameraOff ? <Video className="h-4 w-4 text-foreground" /> : <VideoOff className="h-4 w-4 text-destructive-foreground" />}
          </button>
          <button onClick={endCall} className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center">
            <Phone className="h-5 w-5 text-destructive-foreground rotate-[135deg]" />
          </button>
        </div>
      </div>

      {/* RIGHT: Patient Report + Decision */}
      <div className="w-full lg:w-[400px] border-l border-border/30 bg-card/50 overflow-y-auto flex flex-col max-h-screen">
        <div className="p-4 space-y-4 flex-1">
          {/* Decision: Confirmed */}
          {decision === 'confirmed' && (
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="glass-card p-6 text-center border-primary/30">
              <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3" />
              <h3 className="font-display text-xl font-bold text-primary">Emergency Confirmed ✓</h3>
              <p className="text-sm text-muted-foreground mt-2">Hospital admin has been notified</p>
              <p className="text-sm text-muted-foreground">Ambulance being dispatched</p>
              <p className="text-xs text-muted-foreground mt-4">Call will end automatically in 30 seconds</p>
            </motion.div>
          )}

          {/* Decision: Prescription Form */}
          {decision === 'prescription' && (
            <div className="space-y-3">
              <div className="glass-card p-3 border-primary/30 text-center">
                <p className="text-primary font-bold text-sm">✅ Override: Not Emergency</p>
                <p className="text-xs text-muted-foreground">Write prescription for patient</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Diagnosis</label>
                <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Diagnosis"
                  className="w-full mt-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none" />
              </div>
              {medicines.map((med, i) => (
                <div key={i} className="glass-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Medicine {i + 1}</span>
                    {medicines.length > 1 && <button onClick={() => setMedicines(p => p.filter((_, idx) => idx !== i))}><X className="h-3 w-3 text-muted-foreground" /></button>}
                  </div>
                  <input value={med.name} onChange={e => setMedicines(p => p.map((m, idx) => idx === i ? { ...m, name: e.target.value } : m))} placeholder="Medicine name"
                    className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={med.strength} onChange={e => setMedicines(p => p.map((m, idx) => idx === i ? { ...m, strength: e.target.value } : m))} placeholder="500mg"
                      className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none" />
                    <input value={med.duration} onChange={e => setMedicines(p => p.map((m, idx) => idx === i ? { ...m, duration: e.target.value } : m))} placeholder="7 days"
                      className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none" />
                  </div>
                </div>
              ))}
              <button onClick={() => setMedicines(p => [...p, emptyMed()])}
                className="w-full py-2 rounded-lg border border-dashed border-info/30 text-info text-xs flex items-center justify-center gap-1">
                <Plus className="h-3 w-3" /> Add Medicine
              </button>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Doctor notes..." rows={2}
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none" />
              <input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none" />
              <motion.button whileTap={{ scale: 0.95 }} onClick={sendPrescription} disabled={sendingRx}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {sendingRx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Prescription to Patient
              </motion.button>
            </div>
          )}

          {/* Default: Patient Report + Decision Buttons */}
          {decision === 'none' && (
            <>
              {/* Risk Badge */}
              <div className={`glass-card p-3 text-center ${riskScore > 70 ? 'border-destructive/40' : riskScore > 30 ? 'border-urgent/40' : 'border-primary/40'}`}
                style={{ background: riskScore > 70 ? 'hsla(353,90%,64%,0.08)' : riskScore > 30 ? 'hsla(37,100%,56%,0.08)' : 'hsla(152,100%,45%,0.08)' }}>
                <span className={`font-mono text-2xl font-bold ${riskScore > 70 ? 'text-destructive' : riskScore > 30 ? 'text-urgent' : 'text-primary'}`}>
                  {riskScore > 70 ? '🔴' : riskScore > 30 ? '🟡' : '🟢'} {riskScore}%
                </span>
                <p className="text-xs text-muted-foreground mt-1">{healthCheck?.ai_triage?.toUpperCase() || 'ASSESSMENT'}</p>
                <p className="text-sm text-foreground font-medium">{healthCheck?.ai_condition}</p>
              </div>

              {/* Vitals */}
              <div className="glass-card p-3">
                <p className="text-xs font-bold text-foreground mb-2">Vitals</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {vitals.bp_sys && <div className="glass-card p-2"><span className="text-muted-foreground">BP</span><p className="font-mono text-foreground">{vitals.bp_sys}/{vitals.bp_dia}</p></div>}
                  {vitals.hr && <div className="glass-card p-2"><span className="text-muted-foreground">Heart Rate</span><p className="font-mono text-foreground">{vitals.hr} bpm</p></div>}
                  {vitals.temp && <div className="glass-card p-2"><span className="text-muted-foreground">Temperature</span><p className="font-mono text-foreground">{vitals.temp}°F</p></div>}
                  {vitals.spo2 && <div className="glass-card p-2"><span className="text-muted-foreground">SpO2</span><p className="font-mono text-foreground">{vitals.spo2}%</p></div>}
                  {vitals.sugar && <div className="glass-card p-2"><span className="text-muted-foreground">Blood Sugar</span><p className="font-mono text-foreground">{vitals.sugar}</p></div>}
                </div>
              </div>

              {/* AI Reasons */}
              {healthCheck?.ai_explanation?.reasons && (
                <div className="glass-card p-3">
                  <p className="text-xs font-bold text-foreground mb-1">Why emergency?</p>
                  {healthCheck.ai_explanation.reasons.map((r: string, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">• {r}</p>
                  ))}
                </div>
              )}

              {/* Patient Info */}
              <div className="glass-card p-3 space-y-1">
                <p className="text-xs font-bold text-foreground">Patient Info</p>
                <p className="text-xs text-muted-foreground">{patient?.name}, {patient?.age}, {patient?.gender}</p>
                <p className="text-xs text-muted-foreground">📍 {patient?.village} {patient?.district && `• ${patient.district}`}</p>
                {patient?.phone && <p className="text-xs text-muted-foreground">📞 {patient.phone}</p>}
                {patient?.blood_group && <p className="text-xs text-muted-foreground">🩸 {patient.blood_group}</p>}
              </div>

              {/* Symptoms */}
              {Array.isArray(symptoms) && symptoms.length > 0 && (
                <div className="glass-card p-3">
                  <p className="text-xs font-bold text-foreground mb-1">Symptoms</p>
                  <div className="flex flex-wrap gap-1">
                    {symptoms.map((s: any, i: number) => (
                      <span key={i} className="px-2 py-1 rounded-full bg-secondary text-xs text-foreground">
                        {typeof s === 'string' ? s : `${s.name} (${s.severity}/10)`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Decision Buttons - sticky bottom */}
        {decision === 'none' && emergency && (
          <div className="p-4 border-t border-border/30 space-y-2 bg-card">
            <p className="text-xs font-bold text-foreground text-center mb-2">DOCTOR'S DECISION</p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={confirmEmergency} disabled={confirming}
              className="w-full py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              🚨 CONFIRM EMERGENCY
            </motion.button>
            <p className="text-[10px] text-muted-foreground text-center">Patient needs immediate hospital care</p>

            <motion.button whileTap={{ scale: 0.95 }} onClick={overrideEmergency}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" /> ✅ NOT EMERGENCY
            </motion.button>
            <p className="text-[10px] text-muted-foreground text-center">Override AI — Write prescription instead</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorVideo;
