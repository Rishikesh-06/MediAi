import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Phone, Heart, CheckCircle, Loader2, Stethoscope, Video } from "lucide-react";
import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import EmergencyTracker from "./EmergencyTracker";

const DiagnosisResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const patient = useAppStore(s => s.currentPatient);
  const { result, healthCheckId } = location.state || {};
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [callingDoctor, setCallingDoctor] = useState<string | null>(null);

  useEffect(() => {
    if (!result) navigate('/patient/health-check');
  }, [result, navigate]);

  // Load available doctors for emergency/urgent
  useEffect(() => {
    if (result?.triage === 'emergency' || result?.triage === 'urgent') {
      setLoadingDoctors(true);
      supabase.from('doctors').select('*').eq('is_online', true).order('rating', { ascending: false })
        .then(({ data }) => { setAvailableDoctors(data || []); setLoadingDoctors(false); });
    }
  }, [result]);

  const initiateEmergencyCall = async (doctor: any) => {
    if (!patient || !healthCheckId) return;
    setCallingDoctor(doctor.id);
    try {
      // Get patient GPS
      let patientLat: number | null = null;
      let patientLng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        patientLat = pos.coords.latitude;
        patientLng = pos.coords.longitude;
      } catch {}

      // Create appointment (date_time is required)
      const appointmentData: any = {
        patient_id: patient.id,
        doctor_id: doctor.id,
        date_time: new Date().toISOString(),
        type: 'video_emergency',
        status: 'calling',
      };
      if (doctor.hospital_id) appointmentData.hospital_id = doctor.hospital_id;

      const { data: appt, error: apptErr } = await supabase.from('appointments')
        .insert(appointmentData as any).select().single();
      if (apptErr) throw apptErr;

      // Check for existing pending emergency for this patient (prevent duplicates)
      const { data: existingEm } = await supabase.from('emergencies')
        .select('id').eq('patient_id', patient.id)
        .in('status', ['pending', 'doctor_confirmed', 'hospital_notified'])
        .order('created_at', { ascending: false }).limit(1);

      let emergencyId: string | null = null;
      if (existingEm?.length) {
        // Update existing emergency with new doctor
        await supabase.from('emergencies').update({
          doctor_id: doctor.id,
          health_check_id: healthCheckId,
          ...(doctor.hospital_id ? { hospital_id: doctor.hospital_id } : {}),
          ...(patientLat ? { patient_lat: patientLat, patient_lng: patientLng } : {}),
        } as any).eq('id', existingEm[0].id);
        emergencyId = existingEm[0].id;
      } else {
        const emergencyData: any = {
          patient_id: patient.id,
          doctor_id: doctor.id,
          health_check_id: healthCheckId,
          status: 'pending',
        };
        if (doctor.hospital_id) emergencyData.hospital_id = doctor.hospital_id;
        if (patientLat) { emergencyData.patient_lat = patientLat; emergencyData.patient_lng = patientLng; }
        const { data: em } = await supabase.from('emergencies').insert(emergencyData as any).select().single();
        emergencyId = em?.id || null;
      }

      // Notify doctor
      if (doctor.auth_id) {
        await supabase.from('notifications').insert({
          user_id: doctor.auth_id,
          user_type: 'doctor',
          title: '🚨 Emergency Video Call!',
          message: `${patient.name}, ${patient.age}yr — ${result.predicted_condition} — Risk: ${result.risk_score}%`,
          type: 'emergency_call',
        });
      }

      navigate(`/patient/video?appointmentId=${appt.id}&doctorId=${doctor.id}&emergencyId=${emergencyId || ''}`);
    } catch (e: any) {
      console.error('Call initiation error:', e);
      toast({ title: "Failed to initiate call", description: e.message, variant: "destructive" });
      setCallingDoctor(null);
    }
  };

  if (!result) return null;

  const isEmergency = result.triage === 'emergency';
  const isUrgent = result.triage === 'urgent';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Triage reveal */}
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.8 }}
        className={`glass-card p-6 text-center ${isEmergency ? "border-destructive/50" : isUrgent ? "border-urgent/50" : "border-primary/50"}`}
        style={{ background: isEmergency ? "hsla(353, 90%, 64%, 0.08)" : isUrgent ? "hsla(37, 100%, 56%, 0.08)" : "hsla(152, 100%, 45%, 0.08)" }}>
        
        {isEmergency && (
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          </motion.div>
        )}
        {!isEmergency && !isUrgent && <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />}
        {isUrgent && <Stethoscope className="h-16 w-16 text-urgent mx-auto mb-4" />}

        <h1 className={`font-display text-3xl font-extrabold mb-2 ${isEmergency ? "text-destructive" : isUrgent ? "text-urgent" : "text-primary"}`}>
          {isEmergency ? "EMERGENCY DETECTED" : isUrgent ? "URGENT CARE NEEDED" : "You're Doing Well! 🎉"}
        </h1>
        <p className="text-muted-foreground text-sm mb-4">{result.predicted_condition}</p>

        {/* Risk gauge */}
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(156, 35%, 17%)" strokeWidth="8" />
            <motion.circle cx="50" cy="50" r="42" fill="none"
              stroke={isEmergency ? "hsl(353, 90%, 64%)" : isUrgent ? "hsl(37, 100%, 56%)" : "hsl(152, 100%, 45%)"}
              strokeWidth="8" strokeLinecap="round"
              initial={{ strokeDasharray: "0 264" }}
              animate={{ strokeDasharray: `${(result.risk_score / 100) * 264} 264` }}
              transition={{ duration: 1.5, delay: 0.3 }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-mono text-3xl font-bold ${isEmergency ? "text-destructive" : isUrgent ? "text-urgent" : "text-primary"}`}>{result.risk_score}%</span>
          </div>
        </div>
      </motion.div>

      {/* Reasons */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-5">
        <h3 className="font-display font-bold text-foreground mb-3">Why this result?</h3>
        <div className="space-y-2">
          {(result.reasons || []).map((r: string, i: number) => (
            <div key={i} className="flex items-start gap-2">
              <Heart className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-sm text-foreground">{r}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Emergency: Available Doctors for Immediate Call */}
      {(isEmergency || isUrgent) && patient && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          className="glass-card p-5 border-destructive/30" style={{ background: 'hsla(353,90%,64%,0.06)' }}>
          <h3 className="font-display font-bold text-destructive text-lg mb-1">🚨 IMMEDIATE ACTION REQUIRED</h3>
          <p className="text-sm text-muted-foreground mb-4">Available Doctors Right Now — Connect immediately for emergency consultation</p>

          {loadingDoctors && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Finding available doctors...</span>
            </div>
          )}

          {!loadingDoctors && availableDoctors.length > 0 && (
            <div className="space-y-3">
              {availableDoctors.map(doc => (
                <motion.div key={doc.id} 
                  className="glass-card p-4 flex items-center gap-3 border-primary/30"
                  style={{ boxShadow: '0 0 15px hsla(152,100%,45%,0.1)' }}
                  animate={{ borderColor: ['hsla(152,100%,45%,0.3)', 'hsla(152,100%,45%,0.6)', 'hsla(152,100%,45%,0.3)'] }}
                  transition={{ repeat: Infinity, duration: 2 }}>
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
                    {doc.name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <p className="font-bold text-foreground">{doc.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{doc.specialty} • ⭐ {doc.rating} • Available now</p>
                  </div>
                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={() => initiateEmergencyCall(doc)}
                    disabled={callingDoctor !== null}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 disabled:opacity-50">
                    {callingDoctor === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                    {callingDoctor === doc.id ? "Calling..." : "Call Now"}
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}

          {!loadingDoctors && availableDoctors.length === 0 && (
            <div className="text-center py-6 glass-card border-destructive/30" style={{ background: 'hsla(353,90%,64%,0.08)' }}>
              <p className="text-destructive font-bold mb-2">No doctors available right now</p>
              <p className="text-sm text-muted-foreground mb-4">Please call emergency services directly</p>
              <a href="tel:108" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-lg">
                <Phone className="h-5 w-5" /> Call 108
              </a>
            </div>
          )}
        </motion.div>
      )}

      {/* Emergency flow tracker */}
      {isEmergency && patient && <EmergencyTracker patientId={patient.id} />}

      {/* First Aid */}
      {isEmergency && result.first_aid && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          className="glass-card p-5 border-urgent/30" style={{ background: "hsla(37, 100%, 56%, 0.06)" }}>
          <h3 className="font-display font-bold text-urgent mb-2">🩹 First Aid</h3>
          <p className="text-sm text-foreground">{result.first_aid}</p>
        </motion.div>
      )}

      {/* Call 108 always visible for emergency */}
      {isEmergency && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>
          <a href="tel:108" className="flex items-center gap-3 glass-card p-4 border-destructive/30 w-full">
            <Phone className="h-6 w-6 text-destructive" />
            <div>
              <p className="font-bold text-destructive text-lg">Call 108</p>
              <p className="text-xs text-muted-foreground">Emergency Ambulance Service</p>
            </div>
          </a>
        </motion.div>
      )}

      {/* Recommendations */}
      {result.recommendations?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: isEmergency ? 4 : 1 }} className="glass-card p-5">
          <h3 className="font-display font-bold text-foreground mb-3">💡 Recommendations</h3>
          <div className="space-y-2">
            {result.recommendations.map((r: string, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{r}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {isUrgent && (
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigate('/patient/book-doctor')}
          className="w-full py-4 rounded-xl bg-urgent text-urgent-foreground font-display font-bold text-lg">
          🩺 Book Doctor Appointment
        </motion.button>
      )}

      <button onClick={() => navigate('/patient')} className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium">
        ← Back to Dashboard
      </button>
    </div>
  );
};

export default DiagnosisResult;
