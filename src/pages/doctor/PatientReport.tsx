import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Phone, Heart, Loader2, Pill, Video, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const VitalGauge = ({ label, value, unit, status }: { label: string; value: string; unit?: string; status: 'normal' | 'high' | 'critical' }) => {
  const color = status === 'critical' ? 'hsl(353,90%,64%)' : status === 'high' ? 'hsl(37,100%,56%)' : 'hsl(152,100%,45%)';
  const pct = status === 'critical' ? 90 : status === 'high' ? 65 : 40;
  return (
    <div className="glass-card p-3 text-center">
      <div className="relative w-16 h-16 mx-auto mb-2">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="38" fill="none" stroke="hsl(156,35%,17%)" strokeWidth="6" />
          <circle cx="50" cy="50" r="38" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 239} 239`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-xs font-bold text-foreground">{value}</span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${status === 'critical' ? 'bg-destructive/20 text-destructive' : status === 'high' ? 'bg-urgent/20 text-urgent' : 'bg-primary/20 text-primary'}`}>
        {status === 'critical' ? 'Critical' : status === 'high' ? 'High' : 'Normal'}
      </span>
    </div>
  );
};

const PatientReport = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const doctor = useAppStore(s => s.currentDoctor);
  const [patient, setPatient] = useState<any>(null);
  const [latestCheck, setLatestCheck] = useState<any>(null);
  const [allChecks, setAllChecks] = useState<any[]>([]);
  const [emergency, setEmergency] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<any>(null);
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [newTriage, setNewTriage] = useState('');
  const [triageReason, setTriageReason] = useState('');
  const [noHospitalModal, setNoHospitalModal] = useState(false);

  useEffect(() => {
    if (!patientId || !doctor) { if (!doctor) navigate('/doctor/login'); return; }
    loadAll();
  }, [patientId, doctor]);

  const loadAll = async () => {
    if (!patientId) return;
    const [pRes, lcRes, acRes, emRes, rxRes] = await Promise.all([
      supabase.from('patients').select('*').eq('id', patientId).single(),
      supabase.from('health_checks').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('health_checks').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
      supabase.from('emergencies').select('*').eq('patient_id', patientId).in('status', ['pending', 'doctor_confirmed']).maybeSingle(),
      supabase.from('prescriptions').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
    ]);
    if (pRes.data) setPatient(pRes.data);
    if (lcRes.data) setLatestCheck(lcRes.data);
    if (acRes.data) setAllChecks(acRes.data);
    if (emRes.data) setEmergency(emRes.data);
    if (rxRes.data) setPrescriptions(rxRes.data);
    setLoading(false);
  };

  const confirmEmergency = async () => {
    if (!latestCheck || !doctor || !patient || !emergency) return;
    setDispatching(true);
    try {
      // Step 1: Update emergency
      await supabase.from('emergencies').update({
        status: 'doctor_confirmed', doctor_id: doctor.id, confirmed_at: new Date().toISOString()
      }).eq('id', emergency.id);

      // Step 2: Get own hospital
      let dispatchHospital: any = null;
      let dist = 999;
      if (doctor.hospital_id) {
        const { data: ownHosp } = await supabase.from('hospitals').select('*').eq('id', doctor.hospital_id).single();
        if (ownHosp) {
          // Step 3: Get patient coords
          const { data: vill } = await supabase.from('village_health').select('lat, lng')
            .ilike('village_name', `%${patient.village}%`).maybeSingle();
          const patLat = vill?.lat || 26.9124;
          const patLng = vill?.lng || 75.7873;

          if (ownHosp.lat && ownHosp.lng) {
            dist = haversine(ownHosp.lat, ownHosp.lng, patLat, patLng);
            if (dist <= 15 && (ownHosp.available_beds || 0) > 0 && (ownHosp.ambulances_available || 0) > 0) {
              dispatchHospital = ownHosp;
            }
          }
        }
      }

      // Step 6: Find nearest if own doesn't qualify
      if (!dispatchHospital) {
        const { data: hospitals } = await supabase.from('hospitals').select('*')
          .eq('is_registered', true).gt('available_beds', 0).gt('ambulances_available', 0);
        if (hospitals && hospitals.length > 0) {
          const { data: vill } = await supabase.from('village_health').select('lat, lng')
            .ilike('village_name', `%${patient.village}%`).maybeSingle();
          const patLat = vill?.lat || 26.9124;
          const patLng = vill?.lng || 75.7873;

          const sorted = hospitals.filter(h => h.lat && h.lng)
            .map(h => ({ ...h, dist: haversine(h.lat!, h.lng!, patLat, patLng) }))
            .sort((a, b) => a.dist - b.dist);
          if (sorted.length > 0) { dispatchHospital = sorted[0]; dist = sorted[0].dist; }
        }
      }

      if (!dispatchHospital) {
        setNoHospitalModal(true);
        setDispatching(false);
        // Still update status
        await supabase.from('emergencies').update({ status: 'hospital_notified' }).eq('id', emergency.id);
        setDispatched(true);
        return;
      }

      // Step 8: Update emergency with hospital
      await supabase.from('emergencies').update({
        hospital_id: dispatchHospital.id, status: 'hospital_notified',
        estimated_distance_km: Math.round(dist * 10) / 10
      }).eq('id', emergency.id);

      // Step 9: Notifications
      await supabase.from('notifications').insert([
        {
          user_id: dispatchHospital.id, user_type: 'admin',
          title: '🚨 Emergency Incoming!',
          message: `${patient.name}, ${patient.age}yr — ${latestCheck.ai_condition} — Risk: ${latestCheck.ai_risk_score}%`,
          type: 'emergency'
        },
        {
          user_id: patient.id, user_type: 'patient',
          title: '✅ Doctor Confirmed',
          message: `Dr. ${doctor.name} confirmed your emergency. ${dispatchHospital.name} has been notified.`,
          type: 'emergency_update'
        }
      ]);

      setDispatchResult({ hospital: dispatchHospital, distance: Math.round(dist * 10) / 10 });
      setDispatched(true);
      setEmergency({ ...emergency, status: 'hospital_notified' });
      toast({ title: "Emergency confirmed! Hospital notified. ✅" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setDispatching(false);
  };

  const changeTriage = async () => {
    if (!latestCheck || !doctor || !newTriage || triageReason.length < 20) {
      toast({ title: "Provide reason (min 20 chars)", variant: "destructive" }); return;
    }
    await supabase.from('health_checks').update({
      ai_triage: newTriage,
      triage_change_reason: triageReason,
      triage_changed_by: doctor.id,
      triage_changed_at: new Date().toISOString()
    }).eq('id', latestCheck.id);
    setLatestCheck({ ...latestCheck, ai_triage: newTriage });
    setShowTriageModal(false);
    setTriageReason('');
    toast({ title: "Triage updated ✅" });
  };

  const startVideoCall = async () => {
    if (!doctor || !patientId) return;
    const { data: appt } = await supabase.from('appointments').insert({
      patient_id: patientId, doctor_id: doctor.id, type: 'video', status: 'active', date_time: new Date().toISOString()
    }).select('id').single();
    await supabase.from('notifications').insert({
      user_id: patientId, user_type: 'patient',
      title: '📹 Incoming Video Call',
      message: `Dr. ${doctor.name} is calling you now!`,
      type: 'video_call'
    });
    navigate(`/doctor/video/${appt?.id || 'new'}`);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-info" /></div>;
  if (!patient) return <p className="text-center text-muted-foreground py-16">Patient not found</p>;

  const vitals = (latestCheck?.vitals || {}) as Record<string, string>;
  const explanation = (latestCheck?.ai_explanation || {}) as any;
  const isEmergency = latestCheck?.ai_triage === 'emergency';
  const medHistory = (patient.medical_history || {}) as any;

  const getVitalStatus = (key: string, val: string): 'normal' | 'high' | 'critical' => {
    const n = parseFloat(val);
    if (key === 'bp_systolic') return n > 140 ? 'critical' : n > 120 ? 'high' : 'normal';
    if (key === 'heart_rate') return n > 100 || n < 60 ? 'high' : 'normal';
    if (key === 'spo2') return n < 90 ? 'critical' : n < 95 ? 'high' : 'normal';
    if (key === 'temperature') return parseFloat(val) > 101 ? 'critical' : parseFloat(val) > 99 ? 'high' : 'normal';
    if (key === 'blood_sugar') return n > 180 ? 'critical' : n > 140 ? 'high' : 'normal';
    return 'normal';
  };

  const vitalLabels: Record<string, string> = {
    bp_systolic: 'BP Sys', bp_diastolic: 'BP Dia', heart_rate: 'Heart Rate',
    spo2: 'SpO2', temperature: 'Temp', blood_sugar: 'Sugar'
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-32">
      <button onClick={() => navigate('/doctor/queue')} className="text-sm text-muted-foreground">← Back to Queue</button>

      {/* Patient Header */}
      <div className="glass-card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-info/10 flex items-center justify-center text-2xl font-bold text-info">
          {patient.name?.charAt(0)}
        </div>
        <div className="flex-1">
          <h2 className="font-display text-xl font-bold text-foreground">{patient.name}</h2>
          <p className="text-sm text-muted-foreground">{patient.age}y, {patient.gender} • {patient.blood_group || '?'} • {patient.village}</p>
          {patient.phone && (
            <a href={`tel:${patient.phone}`} className="text-xs text-info flex items-center gap-1 mt-1">
              <Phone className="h-3 w-3" /> {patient.phone}
            </a>
          )}
        </div>
      </div>

      {/* Medical conditions */}
      {medHistory.chronic?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {medHistory.chronic.map((c: string) => (
            <span key={c} className="px-3 py-1 rounded-full text-xs bg-destructive/20 text-destructive font-medium">⚠️ {c}</span>
          ))}
          {medHistory.allergies?.map((a: string) => (
            <span key={a} className="px-3 py-1 rounded-full text-xs bg-urgent/20 text-urgent font-medium">🚫 Allergy: {a}</span>
          ))}
        </div>
      )}

      {/* AI Risk Card */}
      {latestCheck && (
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
          className={`glass-card p-6 text-center ${isEmergency ? 'border-destructive/40' : ''}`}
          style={isEmergency ? { background: 'hsla(353,90%,64%,0.06)' } : {}}>
          <div className="relative w-28 h-28 mx-auto mb-4">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(156,35%,17%)" strokeWidth="8" />
              <motion.circle cx="50" cy="50" r="42" fill="none"
                stroke={isEmergency ? 'hsl(353,90%,64%)' : latestCheck.ai_triage === 'urgent' ? 'hsl(37,100%,56%)' : 'hsl(152,100%,45%)'}
                strokeWidth="8" strokeLinecap="round"
                initial={{ strokeDasharray: '0 264' }} animate={{ strokeDasharray: `${((latestCheck.ai_risk_score || 0) / 100) * 264} 264` }}
                transition={{ duration: 1.5 }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`font-mono text-2xl font-bold ${isEmergency ? 'text-destructive' : 'text-primary'}`}>{latestCheck.ai_risk_score}%</span>
            </div>
          </div>
          <span className={isEmergency ? 'badge-emergency' : latestCheck.ai_triage === 'urgent' ? 'badge-urgent' : 'badge-safe'}>
            {latestCheck.ai_triage?.toUpperCase()}
          </span>
          <p className="text-foreground font-bold mt-2 text-lg">{latestCheck.ai_condition}</p>
        </motion.div>
      )}

      {/* Explainable AI */}
      {explanation?.reasons && (
        <div className="glass-card p-5">
          <h3 className="font-display font-bold text-foreground mb-3">Why this risk score?</h3>
          <div className="space-y-3">
            {explanation.reasons.map((r: string, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-urgent mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-sm text-foreground">{r}</span>
                  <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${100 / explanation.reasons.length}%` }}
                      transition={{ delay: i * 0.2, duration: 0.5 }}
                      className="h-full rounded-full bg-urgent/60" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vitals Dashboard */}
      {Object.keys(vitals).length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-display font-bold text-foreground mb-3">Vitals Dashboard</h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(vitals).filter(([, v]) => v).map(([k, v]) => (
              <VitalGauge key={k} label={vitalLabels[k] || k.replace('_', ' ')} value={v} status={getVitalStatus(k, v)} />
            ))}
          </div>
        </div>
      )}

      {/* Symptoms */}
      {latestCheck?.symptoms && Array.isArray(latestCheck.symptoms) && latestCheck.symptoms.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-display font-bold text-foreground mb-3">Symptoms</h3>
          <div className="flex flex-wrap gap-2">
            {latestCheck.symptoms.map((s: any, i: number) => (
              <span key={i} className={`px-3 py-1.5 rounded-full text-xs font-medium ${(s.severity || 5) > 7 ? 'bg-destructive/20 text-destructive' : (s.severity || 5) > 4 ? 'bg-urgent/20 text-urgent' : 'bg-primary/20 text-primary'}`}>
                {typeof s === 'string' ? s : s.name} {s.severity ? `(${s.severity}/10)` : ''} {s.duration ? `· ${s.duration}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* First Aid */}
      {latestCheck?.ai_first_aid && (
        <div className="glass-card p-5 border-urgent/30" style={{ background: 'hsla(37,100%,56%,0.05)' }}>
          <h3 className="font-display font-bold text-urgent mb-3">🩹 First Aid Steps</h3>
          <div className="space-y-2">
            {latestCheck.ai_first_aid.split('. ').filter(Boolean).map((step: string, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-urgent/20 text-urgent text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-sm text-foreground">{step.trim()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visit History */}
      {allChecks.length > 1 && (
        <div className="glass-card p-5">
          <h3 className="font-display font-bold text-foreground mb-3">Visit History ({allChecks.length})</h3>
          <Accordion type="single" collapsible>
            {allChecks.slice(1).map((hc, i) => (
              <AccordionItem key={hc.id} value={hc.id}>
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{new Date(hc.created_at).toLocaleDateString()}</span>
                    <span className={hc.ai_triage === 'emergency' ? 'badge-emergency text-[10px]' : hc.ai_triage === 'urgent' ? 'badge-urgent text-[10px]' : 'badge-safe text-[10px]'}>{hc.ai_triage}</span>
                    <span className="text-foreground">{hc.ai_condition}</span>
                    <span className="font-mono text-xs">{hc.ai_risk_score}%</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    {hc.vitals && <p className="text-muted-foreground">Vitals: {JSON.stringify(hc.vitals)}</p>}
                    {Array.isArray(hc.symptoms) && <p className="text-muted-foreground">Symptoms: {hc.symptoms.map((s: any) => typeof s === 'string' ? s : s.name).join(', ')}</p>}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {/* Past Prescriptions */}
      {prescriptions.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-display font-bold text-foreground mb-3">Past Prescriptions ({prescriptions.length})</h3>
          <Accordion type="single" collapsible>
            {prescriptions.map(rx => {
              const meds = Array.isArray(rx.medicines) ? rx.medicines : [];
              return (
                <AccordionItem key={rx.id} value={rx.id}>
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{new Date(rx.created_at).toLocaleDateString()}</span>
                      <span className="text-foreground">{rx.diagnosis || 'Prescription'}</span>
                      <span className="text-xs text-info">{meds.length} meds</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1 text-sm">
                      {meds.map((m: any, i: number) => (
                        <p key={i} className="text-muted-foreground">{i + 1}. {m.name} {m.strength} — {m.frequency} × {m.duration}d {m.timing} food</p>
                      ))}
                      {rx.doctor_notes && <p className="text-muted-foreground mt-2">Notes: {rx.doctor_notes}</p>}
                      {rx.follow_up_date && <p className="text-info text-xs">Follow-up: {rx.follow_up_date}</p>}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}

      {/* Dispatched success */}
      {dispatched && dispatchResult && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 border-primary/30 text-center">
          <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3" />
          <p className="font-display font-bold text-primary text-lg">Emergency Confirmed!</p>
          <p className="text-sm text-muted-foreground">{dispatchResult.hospital.name} has been notified</p>
          <p className="text-xs text-muted-foreground mt-1">Distance: {dispatchResult.distance} km</p>
          <div className="mt-4 space-y-2 text-left">
            {['✅ You confirmed emergency', `✅ ${dispatchResult.hospital.name} notified`, '⏳ Waiting for ambulance dispatch', '⏳ Patient transport'].map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={i < 2 ? 'text-primary' : 'text-muted-foreground'}>{step}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* No hospital modal */}
      {noHospitalModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setNoHospitalModal(false)}>
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-destructive/90 rounded-2xl p-8 max-w-sm text-center" onClick={e => e.stopPropagation()}>
            <AlertTriangle className="h-16 w-16 text-white mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">🚨 No Hospital Available!</h2>
            <p className="text-white/80 mb-6">No registered hospital with beds & ambulance found nearby.</p>
            <a href="tel:108" className="block w-full py-4 rounded-xl bg-white text-destructive font-bold text-lg text-center">
              📞 Call 108 Now
            </a>
            <button onClick={() => setNoHospitalModal(false)} className="mt-3 text-white/60 text-sm">Close</button>
          </motion.div>
        </div>
      )}

      {/* Triage change modal */}
      {showTriageModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center" onClick={() => setShowTriageModal(false)}>
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="bg-card rounded-t-2xl md:rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-display font-bold text-foreground mb-4">Change Triage</h3>
            <p className="text-sm text-muted-foreground mb-3">Current: <span className={latestCheck?.ai_triage === 'emergency' ? 'text-destructive' : latestCheck?.ai_triage === 'urgent' ? 'text-urgent' : 'text-primary'}>{latestCheck?.ai_triage}</span></p>
            <div className="flex gap-2 mb-4">
              {['emergency', 'urgent', 'routine'].map(t => (
                <button key={t} onClick={() => setNewTriage(t)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold capitalize ${newTriage === t
                    ? (t === 'emergency' ? 'bg-destructive text-destructive-foreground' : t === 'urgent' ? 'bg-urgent text-white' : 'bg-primary text-primary-foreground')
                    : 'bg-secondary text-muted-foreground'
                  }`}>
                  {t === 'emergency' ? '🔴' : t === 'urgent' ? '🟡' : '🟢'} {t}
                </button>
              ))}
            </div>
            <textarea value={triageReason} onChange={e => setTriageReason(e.target.value)} placeholder="Reason for change (min 20 characters)..."
              rows={3} className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none mb-3" />
            <button onClick={changeTriage} disabled={!newTriage || triageReason.length < 20}
              className="w-full py-3 rounded-xl bg-info text-info-foreground font-bold disabled:opacity-50">Confirm Change</button>
          </motion.div>
        </div>
      )}

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-card/95 backdrop-blur-xl border-t border-border/50 p-3 z-30">
        <div className="max-w-3xl mx-auto flex gap-2">
          {emergency && emergency.status === 'pending' && !dispatched && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={confirmEmergency} disabled={dispatching}
              className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm flex items-center justify-center gap-2 animate-pulse">
              {dispatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              {dispatching ? 'Dispatching...' : '✅ Confirm Emergency'}
            </motion.button>
          )}
          <button onClick={() => setShowTriageModal(true)}
            className="flex-1 py-3 rounded-xl bg-urgent/20 text-urgent text-sm font-bold flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4" /> Change Triage
          </button>
          <button onClick={startVideoCall}
            className="flex-1 py-3 rounded-xl bg-info/20 text-info text-sm font-bold flex items-center justify-center gap-2">
            <Video className="h-4 w-4" /> Video Call
          </button>
          <button onClick={() => navigate(`/doctor/prescription/${patientId}`)}
            className="flex-1 py-3 rounded-xl bg-primary/20 text-primary text-sm font-bold flex items-center justify-center gap-2">
            <Pill className="h-4 w-4" /> Prescription
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientReport;
