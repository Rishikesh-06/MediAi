import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Video, VideoOff, Phone, Loader2 } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { useWebRTC } from "@/hooks/useWebRTC";

const VideoConsultation = () => {
  const patient = useAppStore(s => s.currentPatient);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appointmentId = searchParams.get('appointmentId');
  const emergencyId = searchParams.get('emergencyId');
  const doctorId = searchParams.get('doctorId');

  const [doctor, setDoctor] = useState<any>(null);
  const [status, setStatus] = useState<'calling' | 'connected' | 'declined' | 'timeout'>('calling');
  const [duration, setDuration] = useState(0);
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const timeoutRef = useRef<any>(null);

  const {
    localVideoRef,
    remoteVideoRef,
    callStatus: webrtcStatus,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    endCall: webrtcEndCall,
  } = useWebRTC(appointmentId, 'patient');

  // Sync WebRTC connection with UI
  useEffect(() => {
    if (webrtcStatus === 'connected' && status === 'calling') {
      setStatus('connected');
      clearTimeout(timeoutRef.current);
    }
  }, [webrtcStatus]);

  useEffect(() => {
    if (!patient || !appointmentId) { navigate('/patient'); return; }

    if (doctorId) {
      supabase.from('doctors').select('*').eq('id', doctorId).single().then(({ data }) => {
        if (data) setDoctor(data);
      });
    }

    const ch = supabase.channel(`patient-call-status-${appointmentId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'appointments',
        filter: `id=eq.${appointmentId}`
      }, (payload: any) => {
        const newStatus = payload.new?.status;
        if (newStatus === 'active') {
          setStatus('connected');
          clearTimeout(timeoutRef.current);
        } else if (newStatus === 'declined') {
          setStatus('declined');
          clearTimeout(timeoutRef.current);
          loadOtherDoctors();
        }
      }).subscribe();

    timeoutRef.current = setTimeout(() => {
      if (status === 'calling') {
        setStatus('timeout');
        loadOtherDoctors();
      }
    }, 120000);

    return () => {
      supabase.removeChannel(ch);
      clearTimeout(timeoutRef.current);
    };
  }, [patient, appointmentId, doctorId]);

  useEffect(() => {
    if (status !== 'connected') return;
    const timer = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  const loadOtherDoctors = async () => {
    const { data } = await supabase.from('doctors').select('*').eq('is_online', true).neq('id', doctorId || '').order('rating', { ascending: false });
    setAvailableDoctors(data || []);
  };

  const tryAnotherDoctor = async (doc: any) => {
    if (!patient) return;
    const newApptData: any = {
      patient_id: patient.id, doctor_id: doc.id,
      type: 'video_emergency', status: 'calling', date_time: new Date().toISOString(),
    };
    if (doc.hospital_id) newApptData.hospital_id = doc.hospital_id;
    const { data: appt } = await supabase.from('appointments').insert(newApptData as any).select().single();
    if (!appt) return;

    if (doc.auth_id) {
      await supabase.from('notifications').insert({
        user_id: doc.auth_id, user_type: 'doctor',
        title: '🚨 Emergency Video Call!',
        message: `${patient.name}, ${patient.age}yr — Emergency consultation requested`,
        type: 'emergency_call',
      });
    }

    navigate(`/patient/video?appointmentId=${appt.id}&doctorId=${doc.id}`, { replace: true });
    setDoctor(doc);
    setStatus('calling');
    setDuration(0);
  };

  const endCall = async () => {
    await webrtcEndCall();
    // Check if emergency was confirmed — navigate to tracking
    if (patient) {
      const { data: em } = await supabase.from('emergencies').select('id, status')
        .eq('patient_id', patient.id)
        .in('status', ['doctor_confirmed', 'hospital_notified', 'ambulance_dispatched', 'patient_reached'])
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (em) {
        navigate(`/patient/emergency-tracking/${em.id}`);
        return;
      }
    }
    navigate('/patient');
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (status === 'declined' || status === 'timeout') {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
        <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
          <Phone className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          {status === 'declined' ? `Dr. ${doctor?.name} is unavailable` : 'Doctor didn\'t respond'}
        </h2>
        <p className="text-sm text-muted-foreground">Try another doctor or call 108</p>

        {availableDoctors.length > 0 && (
          <div className="w-full space-y-3">
            <p className="text-sm font-bold text-foreground">Other available doctors:</p>
            {availableDoctors.map(doc => (
              <button key={doc.id} onClick={() => tryAnotherDoctor(doc)}
                className="w-full glass-card p-4 flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">{doc.name?.charAt(0)}</div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">{doc.specialty} • ⭐ {doc.rating}</p>
                </div>
                <span className="text-sm text-primary font-bold">📹 Call</span>
              </button>
            ))}
          </div>
        )}

        <a href="tel:108" className="w-full py-4 rounded-xl bg-destructive text-destructive-foreground font-bold text-lg text-center block">
          📞 Call 108
        </a>
        <button onClick={() => navigate('/patient')} className="text-sm text-muted-foreground">← Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 bg-card/90 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-2">
          {status === 'calling' && <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-3 h-3 rounded-full bg-destructive" />}
          {status === 'connected' && <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />}
          <span className={`text-sm font-bold ${status === 'calling' ? 'text-destructive' : 'text-primary'}`}>
            {status === 'calling' ? 'EMERGENCY CALL' : 'Connected'}
          </span>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">{doctor?.name || 'Doctor'}</p>
          <p className="text-xs text-muted-foreground">{doctor?.specialty}</p>
        </div>
        <span className="font-mono text-sm text-primary">{formatTime(duration)}</span>
      </div>

      {/* Main area */}
      <div className="flex-1 flex items-center justify-center bg-secondary/30 relative overflow-hidden">
        {/* Remote video (doctor's camera) — full area */}
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />

        {/* Overlay when not connected yet */}
        {status === 'calling' && (
          <div className="relative z-10 text-center space-y-4">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center mx-auto border-2 border-primary/30">
              <span className="text-5xl font-bold text-primary">{doctor?.name?.charAt(0) || '?'}</span>
            </motion.div>
            <p className="text-foreground font-display font-bold text-lg">Calling {doctor?.name}...</p>
            <p className="text-sm text-muted-foreground">Please wait, connecting...</p>
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
          </div>
        )}

        {/* Connected indicator */}
        {status === 'connected' && webrtcStatus !== 'connected' && (
          <div className="relative z-10 text-center">
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }}
              className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 border-2 border-primary/40">
              <span className="text-5xl font-bold text-primary">{doctor?.name?.charAt(0) || '?'}</span>
            </motion.div>
            <p className="text-foreground font-display font-bold">{doctor?.name}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-primary">Establishing video...</span>
            </div>
          </div>
        )}

        {/* Local video PiP (patient's own camera) */}
        <div className="absolute bottom-20 right-4 w-36 h-[100px] rounded-xl overflow-hidden border-2 border-primary/30 bg-secondary z-20">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-4 bg-card/90 backdrop-blur-xl">
        <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center ${!isMuted ? "bg-secondary" : "bg-destructive"}`}>
          {!isMuted ? <Mic className="h-5 w-5 text-foreground" /> : <MicOff className="h-5 w-5 text-destructive-foreground" />}
        </button>
        <button onClick={toggleCamera} className={`w-12 h-12 rounded-full flex items-center justify-center ${!isCameraOff ? "bg-secondary" : "bg-destructive"}`}>
          {!isCameraOff ? <Video className="h-5 w-5 text-foreground" /> : <VideoOff className="h-5 w-5 text-destructive-foreground" />}
        </button>
        <button onClick={endCall} className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center">
          <Phone className="h-6 w-6 text-destructive-foreground rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
};

export default VideoConsultation;
