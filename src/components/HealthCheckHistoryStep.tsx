import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, Siren, Video, Pill, HeartPulse, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Props {
  patient: any;
  conditions: string[];
  selectedConditions: string[];
  toggleCondition: (c: string) => void;
}

const HistoryStep = ({ patient, conditions, selectedConditions, toggleCondition }: Props) => {
  const navigate = useNavigate();
  const [pastChecks, setPastChecks] = useState<any[]>([]);
  const [pastAppointments, setPastAppointments] = useState<any[]>([]);
  const [pastEmergencies, setPastEmergencies] = useState<any[]>([]);
  const [pastPrescriptions, setPastPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ checks: false, appointments: false, emergencies: false, prescriptions: false });

  useEffect(() => {
    if (!patient?.id) return;
    const load = async () => {
      const [checks, appts, emgs, rxs] = await Promise.all([
        supabase.from('health_checks').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('appointments').select('*, doctors(name, specialty)').eq('patient_id', patient.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('emergencies').select('*, doctors(name, specialty), hospitals(name), ambulances(vehicle_number, driver_name)').eq('patient_id', patient.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('prescriptions').select('*, doctors(name)').eq('patient_id', patient.id).order('created_at', { ascending: false }).limit(5),
      ]);
      setPastChecks(checks.data || []);
      setPastAppointments(appts.data || []);
      setPastEmergencies(emgs.data || []);
      setPastPrescriptions(rxs.data || []);
      setLoading(false);
    };
    load();
  }, [patient?.id]);

  const toggle = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  const riskBadge = (score: number | null) => {
    if (!score) return null;
    const color = score >= 70 ? "bg-destructive/15 text-destructive" : score >= 40 ? "bg-amber-500/15 text-amber-500" : "bg-primary/15 text-primary";
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{score}% risk</span>;
  };

  const statusColor = (s: string) => {
    const m: Record<string, string> = {
      pending: "bg-amber-500/15 text-amber-500", doctor_confirmed: "bg-amber-500/15 text-amber-500",
      hospital_notified: "bg-blue-500/15 text-blue-500", ambulance_dispatched: "bg-primary/15 text-primary",
      patient_reached: "bg-primary/15 text-primary", resolved: "bg-muted text-muted-foreground",
      overridden: "bg-muted text-muted-foreground",
    };
    return m[s] || "bg-secondary text-muted-foreground";
  };

  const activeStatuses = ['pending', 'doctor_confirmed', 'hospital_notified', 'ambulance_dispatched', 'patient_reached'];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold">Medical History</h2>
        <p className="text-xs text-muted-foreground">Your past records & pre-existing conditions</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Loading history...</p>
      ) : (
        <div className="space-y-3">
          {/* Past Health Checks */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button onClick={() => toggle('checks')} className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 text-sm font-semibold text-foreground">
              <span className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-primary" /> Previous Health Checks ({pastChecks.length})</span>
              {expanded.checks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expanded.checks && (
              <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                {pastChecks.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No previous health checks</p>}
                {pastChecks.map(c => (
                  <div key={c.id} className="glass-card p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), 'MMM d, yyyy h:mm a')}</span>
                      {riskBadge(c.ai_risk_score)}
                    </div>
                    {c.ai_triage && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.ai_triage === 'emergency' ? 'bg-destructive/15 text-destructive' : c.ai_triage === 'urgent' ? 'bg-amber-500/15 text-amber-500' : 'bg-primary/15 text-primary'}`}>{c.ai_triage.toUpperCase()}</span>}
                    {c.ai_condition && <p className="text-sm font-medium text-foreground">{c.ai_condition}</p>}
                    {Array.isArray(c.symptoms) && c.symptoms.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {c.symptoms.slice(0, 5).map((s: any, i: number) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{typeof s === 'string' ? s : s.name}</span>
                        ))}
                      </div>
                    )}
                    {c.vitals && typeof c.vitals === 'object' && Object.keys(c.vitals).some(k => (c.vitals as any)[k]) && (
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {(c.vitals as any).bp_sys && <span>BP {(c.vitals as any).bp_sys}/{(c.vitals as any).bp_dia}</span>}
                        {(c.vitals as any).hr && <span>HR {(c.vitals as any).hr}</span>}
                        {(c.vitals as any).temp && <span>{(c.vitals as any).temp}°F</span>}
                        {(c.vitals as any).spo2 && <span>SpO2 {(c.vitals as any).spo2}%</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Consultations */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button onClick={() => toggle('appointments')} className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 text-sm font-semibold text-foreground">
              <span className="flex items-center gap-2"><Video className="h-4 w-4 text-primary" /> Doctor Consultations ({pastAppointments.length})</span>
              {expanded.appointments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expanded.appointments && (
              <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                {pastAppointments.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No consultations yet</p>}
                {pastAppointments.map(a => {
                  const duration = a.started_at && a.ended_at ? Math.round((new Date(a.ended_at).getTime() - new Date(a.started_at).getTime()) / 60000) : null;
                  return (
                    <div key={a.id} className="glass-card p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{(a as any).doctors?.name || 'Doctor'}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{(a as any).doctors?.specialty}{duration ? ` • ${duration} min` : ''}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.status === 'completed' ? 'bg-primary/15 text-primary' : 'bg-amber-500/15 text-amber-500'}`}>{a.status?.replace(/_/g, ' ')}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Emergencies */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button onClick={() => toggle('emergencies')} className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 text-sm font-semibold text-foreground">
              <span className="flex items-center gap-2"><Siren className="h-4 w-4 text-destructive" /> Emergency History ({pastEmergencies.length})</span>
              {expanded.emergencies ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expanded.emergencies && (
              <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                {pastEmergencies.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No emergencies</p>}
                {pastEmergencies.map(e => (
                  <div key={e.id} className={`glass-card p-3 space-y-2 border-l-4 ${activeStatuses.includes(e.status) ? 'border-l-amber-500' : 'border-l-muted'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">🚨 Emergency</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(e.status)}`}>{e.status?.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(e.created_at), 'MMM d, yyyy h:mm a')}</p>
                    {/* Timeline */}
                    <div className="space-y-1 pl-2 border-l-2 border-border">
                      {e.doctor_confirmed_at && <p className="text-xs text-muted-foreground">✅ Doctor: {(e as any).doctors?.name} — {format(new Date(e.doctor_confirmed_at), 'h:mm a')}</p>}
                      {e.hospital_notified_at && <p className="text-xs text-muted-foreground">🏥 Hospital: {(e as any).hospitals?.name} — {format(new Date(e.hospital_notified_at), 'h:mm a')}</p>}
                      {e.ambulance_dispatched_at && <p className="text-xs text-muted-foreground">🚑 {(e as any).ambulances?.vehicle_number} ({(e as any).ambulances?.driver_name}) — {format(new Date(e.ambulance_dispatched_at), 'h:mm a')}</p>}
                      {e.reached_at && <p className="text-xs text-muted-foreground">✅ Arrived — {format(new Date(e.reached_at), 'h:mm a')}</p>}
                    </div>
                    {activeStatuses.includes(e.status) && (
                      <button onClick={() => navigate(`/patient/emergency-tracking/${e.id}`)} className="text-xs text-primary font-bold">🗺️ Track Live →</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prescriptions */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button onClick={() => toggle('prescriptions')} className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 text-sm font-semibold text-foreground">
              <span className="flex items-center gap-2"><Pill className="h-4 w-4 text-primary" /> Prescriptions ({pastPrescriptions.length})</span>
              {expanded.prescriptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expanded.prescriptions && (
              <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                {pastPrescriptions.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No prescriptions yet</p>}
                {pastPrescriptions.map(p => (
                  <div key={p.id} className="glass-card p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">💊 {p.rx_number || 'Prescription'}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Dr. {(p as any).doctors?.name || 'Unknown'}</p>
                    {p.doctor_notes && <p className="text-xs text-muted-foreground">{p.doctor_notes}</p>}
                    {p.follow_up_date && <p className="text-xs text-primary">Follow-up: {format(new Date(p.follow_up_date), 'MMM d, yyyy')}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pre-existing conditions selector */}
      <div className="pt-3 border-t border-border space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Pre-existing conditions</h3>
          <p className="text-xs text-muted-foreground">Select any that apply</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {conditions.map(c => (
            <button key={c} onClick={() => toggleCondition(c)}
              className={`px-4 py-2 rounded-full text-sm transition-all ${selectedConditions.includes(c) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-primary/20"}`}
            >{c}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HistoryStep;
