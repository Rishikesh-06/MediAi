import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { HeartPulse, ArrowRight, ArrowLeft, Mic, Check, Loader2, AlertTriangle, Plus, Search, X, Trash2, MoreHorizontal, Menu, Siren, Video, Pill, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { analyzeSymptoms } from "@/lib/ai";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import BodyDiagram from "@/components/BodyDiagram";
import HistoryStep from "@/components/HealthCheckHistoryStep";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const formSteps = ["Body", "Symptoms", "Vitals", "History", "Review"];

const bodyParts: Record<string, string[]> = {
  Head: ["Headache", "Dizziness", "Blurred Vision", "Ear Pain"],
  Chest: ["Chest Pain", "Breathlessness", "Palpitations", "Cough"],
  Abdomen: ["Abdominal Pain", "Nausea", "Vomiting", "Diarrhea"],
  Arms: ["Joint Pain", "Numbness", "Swelling"],
  Legs: ["Joint Pain", "Numbness", "Swelling", "Cramps"],
  Back: ["Back Pain", "Stiffness"],
};

const allSymptoms = [
  "Chest Pain", "Headache", "Fever", "Dizziness", "Nausea",
  "Cough", "Breathlessness", "Fatigue", "Body Ache", "Abdominal Pain",
  "Vomiting", "Diarrhea", "Joint Pain", "Rash", "Swelling",
  "Sore Throat", "Cold", "Chills", "Loss of Appetite", "Weight Loss",
];

const conditions = ["Diabetes", "Hypertension", "Heart Disease", "Asthma", "Thyroid", "Kidney Disease"];

const vitalColor = (key: string, val: number) => {
  if (key === "bp_sys") return val < 120 ? "text-primary" : val <= 140 ? "text-urgent" : "text-destructive";
  if (key === "bp_dia") return val < 80 ? "text-primary" : val <= 90 ? "text-urgent" : "text-destructive";
  if (key === "temp") return val < 99 ? "text-primary" : val <= 101 ? "text-urgent" : "text-destructive";
  if (key === "hr") return val >= 60 && val <= 100 ? "text-primary" : "text-urgent";
  if (key === "spo2") return val > 95 ? "text-primary" : val >= 90 ? "text-urgent" : "text-destructive";
  if (key === "sugar") return val < 140 ? "text-primary" : val <= 200 ? "text-urgent" : "text-destructive";
  return "text-foreground";
};

const activeEmergencyStatuses = ['pending', 'doctor_confirmed', 'hospital_notified', 'ambulance_dispatched', 'patient_reached'];

interface PastCheck {
  id: string;
  created_at: string;
  ai_risk_score: number | null;
  ai_triage: string | null;
  ai_condition: string | null;
  ai_explanation: any;
  ai_first_aid: string | null;
  ai_recommendations: any;
  symptoms: any;
  vitals: any;
  body_parts: any;
  history: any;
}

const HealthCheck = () => {
  const navigate = useNavigate();
  const patient = useAppStore((s) => s.currentPatient);
  const isMobile = useIsMobile();

  // Form state
  const [step, setStep] = useState(0);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [severities, setSeverities] = useState<Record<string, number>>({});
  const [vitals, setVitals] = useState({ bp_sys: "", bp_dia: "", temp: "", hr: "", sugar: "", spo2: "" });
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [isListening, setIsListening] = useState(false);

  // Sidebar state
  const [pastChecks, setPastChecks] = useState<PastCheck[]>([]);
  const [pastEmergencies, setPastEmergencies] = useState<any[]>([]);
  const [pastPrescriptions, setPastPrescriptions] = useState<any[]>([]);
  const [selectedCheck, setSelectedCheck] = useState<PastCheck | null>(null);
  const [linkedEmergency, setLinkedEmergency] = useState<any>(null);
  const [linkedPrescription, setLinkedPrescription] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [mode, setMode] = useState<'form' | 'view'>('form'); // form = new check, view = past check detail

  // Load history
  useEffect(() => {
    if (!patient?.id) return;
    loadHistory();
  }, [patient?.id]);

  const loadHistory = async () => {
    if (!patient?.id) return;
    const [checks, emgs, rxs] = await Promise.all([
      supabase.from('health_checks').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false }),
      supabase.from('emergencies').select('*, doctors(name, specialty), hospitals(name, location), ambulances(vehicle_number, driver_name)').eq('patient_id', patient.id).order('created_at', { ascending: false }),
      supabase.from('prescriptions').select('*, doctors(name)').eq('patient_id', patient.id).order('created_at', { ascending: false }),
    ]);
    setPastChecks(checks.data || []);
    setPastEmergencies(emgs.data || []);
    setPastPrescriptions(rxs.data || []);
  };

  const startNewCheck = () => {
    setSelectedCheck(null);
    setLinkedEmergency(null);
    setLinkedPrescription(null);
    setMode('form');
    setStep(0);
    setSelectedParts([]);
    setSelectedSymptoms([]);
    setSeverities({});
    setVitals({ bp_sys: "", bp_dia: "", temp: "", hr: "", sugar: "", spo2: "" });
    setSelectedConditions([]);
    if (isMobile) setSidebarOpen(false);
  };

  const viewPastCheck = (check: PastCheck) => {
    setSelectedCheck(check);
    setMode('view');
    // Find linked emergency (same day)
    const checkDate = new Date(check.created_at).toDateString();
    const em = pastEmergencies.find(e => new Date(e.created_at).toDateString() === checkDate);
    setLinkedEmergency(em || null);
    const rx = pastPrescriptions.find(p => new Date(p.created_at).toDateString() === checkDate);
    setLinkedPrescription(rx || null);
    if (isMobile) setSidebarOpen(false);
  };

  const deleteCheck = async (id: string) => {
    try {
      // 1. Delete related emergencies FIRST (foreign key constraint)
      await supabase.from('emergencies').delete().eq('health_check_id', id);

      // 2. Now delete the health check
      const { error } = await supabase.from('health_checks').delete().eq('id', id);
      if (error) {
        console.error('Delete failed:', error);
        toast({ title: "Error", description: "Could not delete. Try again.", variant: "destructive" });
        return;
      }

      // 3. Update UI after successful DB delete
      setPastChecks(prev => prev.filter(c => c.id !== id));
      setPastEmergencies(prev => prev.filter(e => e.health_check_id !== id));

      // 4. If deleted check was selected, clear the view
      if (selectedCheck?.id === id) startNewCheck();
      setMenuOpenId(null);
      setConfirmDeleteId(null);
      toast({ title: "Deleted", description: "Health check removed" });
    } catch (err) {
      console.error('Delete error:', err);
      toast({ title: "Error", description: "Delete failed", variant: "destructive" });
    }
  };

  // Group checks by date
  const groupChecks = (list: PastCheck[]) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000);
    const monthStart = new Date(todayStart.getTime() - 30 * 86400000);
    const groups: { label: string; items: PastCheck[] }[] = [
      { label: "Today", items: [] }, { label: "Yesterday", items: [] },
      { label: "This Week", items: [] }, { label: "Last Month", items: [] },
      { label: "Older", items: [] },
    ];
    list.forEach(c => {
      const d = new Date(c.created_at);
      if (d >= todayStart) groups[0].items.push(c);
      else if (d >= yesterdayStart) groups[1].items.push(c);
      else if (d >= weekStart) groups[2].items.push(c);
      else if (d >= monthStart) groups[3].items.push(c);
      else groups[4].items.push(c);
    });
    return groups.filter(g => g.items.length > 0);
  };

  const filtered = searchQuery ? pastChecks.filter(c => (c.ai_condition || '').toLowerCase().includes(searchQuery.toLowerCase())) : pastChecks;
  const grouped = groupChecks(filtered);

  const triageBadge = (triage: string | null) => {
    if (!triage) return null;
    const cls = triage === 'emergency' ? 'bg-destructive/15 text-destructive' : triage === 'urgent' ? 'bg-amber-500/15 text-amber-500' : 'bg-primary/15 text-primary';
    return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${cls}`}>{triage}</span>;
  };

  // Form logic
  const toggleSymptom = (s: string) => {
    setSelectedSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
    if (!severities[s]) setSeverities((p) => ({ ...p, [s]: 5 }));
  };

  const togglePart = (partId: string, _label: string, _category: string) => {
    setSelectedParts((prev) => prev.includes(partId) ? prev.filter((x) => x !== partId) : [...prev, partId]);
  };

  const toggleCondition = (c: string) => {
    setSelectedConditions((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  const startVoice = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast({ title: "Voice not supported", description: "Your browser doesn't support voice input", variant: "destructive" });
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      const found = allSymptoms.filter(s => transcript.includes(s.toLowerCase()));
      if (found.length) {
        found.forEach(s => { if (!selectedSymptoms.includes(s)) toggleSymptom(s); });
        toast({ title: "Symptoms detected", description: found.join(", ") });
      } else {
        toast({ title: "Heard", description: `"${transcript}" — try selecting symptoms manually` });
      }
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }, [selectedSymptoms]);

  const handleAnalyze = async () => {
    if (!patient) {
      toast({ title: "Not logged in", description: "Please login as a patient first", variant: "destructive" });
      return;
    }
    setIsAnalyzing(true);
    const analysisSteps = ["Analyzing symptoms...", "Checking vitals...", "Reviewing history...", "Consulting AI model...", "Generating report..."];
    for (let i = 0; i < analysisSteps.length; i++) {
      setAnalysisStep(i);
      await new Promise(r => setTimeout(r, 800));
    }
    try {
      const result = await analyzeSymptoms({
        symptoms: selectedSymptoms.map(s => `${s} (severity: ${severities[s] || 5}/10)`),
        vitals,
        history: { conditions: selectedConditions },
        age: patient.age,
        gender: patient.gender,
      });
      const { data: hc, error } = await supabase.from('health_checks').insert({
        patient_id: patient.id,
        symptoms: selectedSymptoms.map(s => ({ name: s, severity: severities[s] || 5 })),
        vitals,
        history: { conditions: selectedConditions },
        body_parts: selectedParts,
        ai_risk_score: result.risk_score,
        ai_triage: result.triage,
        ai_condition: result.predicted_condition,
        ai_explanation: { reasons: result.reasons, specialist: result.specialist_needed },
        ai_first_aid: result.first_aid,
        ai_recommendations: result.recommendations,
      }).select().single();
      if (error) throw error;

      if (result.triage === 'emergency') {
        let patLat: number | null = null, patLng: number | null = null;
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
          patLat = pos.coords.latitude; patLng = pos.coords.longitude;
          await supabase.from('patients').update({ current_lat: patLat, current_lng: patLng } as any).eq('id', patient.id);
        } catch { }
        const { data: hospitals } = await supabase.from('hospitals').select('*').eq('is_registered', true).gt('available_beds', 0);
        const hospital = hospitals?.[0];
        const { data: doctors } = await supabase.from('doctors').select('*').eq('is_online', true).limit(1);
        const doctor = doctors?.[0];
        await supabase.from('emergencies').insert({
          patient_id: patient.id,
          doctor_id: doctor?.id || null,
          hospital_id: hospital?.id || null,
          health_check_id: hc.id,
          status: 'pending',
          patient_lat: patLat,
          patient_lng: patLng,
        } as any);
      }

      // Reload history and navigate
      await loadHistory();
      navigate('/patient/diagnosis', { state: { result, healthCheckId: hc.id } });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Analysis failed", description: e.message || "Please try again", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Sidebar content
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search checks..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* New Check Button */}
      <div className="px-3 pb-3">
        <button onClick={startNewCheck}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> New Check
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
            <HeartPulse className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">No health checks yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Start your first check</p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.label}>
              <p className="text-xs text-muted-foreground/60 font-medium px-2 py-2 uppercase tracking-wider">{group.label}</p>
              {group.items.map(check => {
                const checkDate = new Date(check.created_at).toDateString();
                const hasEmergency = pastEmergencies.some(e => new Date(e.created_at).toDateString() === checkDate);
                return (
                  <div key={check.id} onClick={() => viewPastCheck(check)}
                    className={`group relative flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm ${
                      selectedCheck?.id === check.id && mode === 'view'
                        ? "bg-primary/10 border-l-[3px] border-primary text-foreground"
                        : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                    }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {triageBadge(check.ai_triage)}
                        <span className="text-[10px] text-muted-foreground/60">{format(new Date(check.created_at), 'h:mm a')}</span>
                      </div>
                      <p className="text-sm truncate mt-0.5">{check.ai_condition || 'Health Check'}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {hasEmergency && <span className="text-[10px]">🚨</span>}
                        {check.ai_risk_score != null && <span className="text-[10px] text-muted-foreground">{check.ai_risk_score}% risk</span>}
                      </div>
                    </div>
                    {/* Three dot menu */}
                    <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === check.id ? null : check.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {menuOpenId === check.id && (
                      <div className="absolute right-2 top-10 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                        {confirmDeleteId === check.id ? (
                          <div className="flex items-center gap-1.5 px-2 py-1.5">
                            <button onClick={(e) => { e.stopPropagation(); deleteCheck(check.id); }}
                              className="px-2.5 py-1 text-xs rounded-md bg-destructive text-destructive-foreground font-medium">
                              Confirm
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                              className="px-2 py-1 text-xs rounded-md border border-border text-muted-foreground">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(check.id); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-secondary/50">
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Past check detail view
  const pastCheckDetail = selectedCheck && (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{format(new Date(selectedCheck.created_at), 'MMMM d, yyyy • h:mm a')}</p>
          <h2 className="font-display text-2xl font-bold mt-1">{selectedCheck.ai_condition || 'Health Check'}</h2>
        </div>
        {triageBadge(selectedCheck.ai_triage)}
      </div>

      {/* Risk Score */}
      {selectedCheck.ai_risk_score != null && (
        <div className="glass-card p-5 text-center">
          <div className="relative inline-flex items-center justify-center w-28 h-28">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none"
                stroke={selectedCheck.ai_risk_score >= 70 ? 'hsl(var(--destructive))' : selectedCheck.ai_risk_score >= 40 ? '#f59e0b' : 'hsl(var(--primary))'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(selectedCheck.ai_risk_score / 100) * 264} 264`} />
            </svg>
            <span className="absolute text-2xl font-bold font-mono">{selectedCheck.ai_risk_score}%</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Risk Score</p>
        </div>
      )}

      {/* Vitals */}
      {selectedCheck.vitals && typeof selectedCheck.vitals === 'object' && Object.keys(selectedCheck.vitals).some(k => (selectedCheck.vitals as any)[k]) && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold mb-3">Vitals</h3>
          <div className="grid grid-cols-3 gap-3">
            {(selectedCheck.vitals as any).bp_sys && (
              <div className="text-center">
                <p className={`text-lg font-mono font-bold ${vitalColor('bp_sys', parseFloat((selectedCheck.vitals as any).bp_sys))}`}>
                  {(selectedCheck.vitals as any).bp_sys}/{(selectedCheck.vitals as any).bp_dia}
                </p>
                <p className="text-xs text-muted-foreground">BP mmHg</p>
              </div>
            )}
            {(selectedCheck.vitals as any).hr && (
              <div className="text-center">
                <p className={`text-lg font-mono font-bold ${vitalColor('hr', parseFloat((selectedCheck.vitals as any).hr))}`}>{(selectedCheck.vitals as any).hr}</p>
                <p className="text-xs text-muted-foreground">Heart Rate</p>
              </div>
            )}
            {(selectedCheck.vitals as any).temp && (
              <div className="text-center">
                <p className={`text-lg font-mono font-bold ${vitalColor('temp', parseFloat((selectedCheck.vitals as any).temp))}`}>{(selectedCheck.vitals as any).temp}°F</p>
                <p className="text-xs text-muted-foreground">Temp</p>
              </div>
            )}
            {(selectedCheck.vitals as any).spo2 && (
              <div className="text-center">
                <p className={`text-lg font-mono font-bold ${vitalColor('spo2', parseFloat((selectedCheck.vitals as any).spo2))}`}>{(selectedCheck.vitals as any).spo2}%</p>
                <p className="text-xs text-muted-foreground">SpO2</p>
              </div>
            )}
            {(selectedCheck.vitals as any).sugar && (
              <div className="text-center">
                <p className={`text-lg font-mono font-bold ${vitalColor('sugar', parseFloat((selectedCheck.vitals as any).sugar))}`}>{(selectedCheck.vitals as any).sugar}</p>
                <p className="text-xs text-muted-foreground">Sugar mg/dL</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Symptoms */}
      {Array.isArray(selectedCheck.symptoms) && selectedCheck.symptoms.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold mb-3">Symptoms</h3>
          <div className="flex flex-wrap gap-2">
            {selectedCheck.symptoms.map((s: any, i: number) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                {typeof s === 'string' ? s : s.name} {typeof s !== 'string' && s.severity ? `(${s.severity}/10)` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Reasons */}
      {selectedCheck.ai_explanation && (selectedCheck.ai_explanation as any).reasons && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold mb-3">AI Analysis</h3>
          <ul className="space-y-1.5">
            {((selectedCheck.ai_explanation as any).reasons as string[]).map((r, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* First Aid */}
      {selectedCheck.ai_first_aid && (
        <div className="glass-card p-4 border-l-4 border-l-amber-500">
          <h3 className="text-sm font-semibold mb-2">🩹 First Aid</h3>
          <p className="text-sm text-muted-foreground">{selectedCheck.ai_first_aid}</p>
        </div>
      )}

      {/* Linked Emergency */}
      {linkedEmergency && (
        <div className={`glass-card p-4 border-l-4 ${activeEmergencyStatuses.includes(linkedEmergency.status) ? 'border-l-amber-500' : 'border-l-muted'}`}>
          <h3 className="text-sm font-semibold mb-3">🚨 What Happened Next</h3>
          <div className="space-y-2 pl-3 border-l-2 border-border">
            {linkedEmergency.doctor_confirmed_at && (
              <p className="text-xs text-muted-foreground">✅ Dr. {linkedEmergency.doctors?.name} confirmed — {format(new Date(linkedEmergency.doctor_confirmed_at), 'h:mm a')}</p>
            )}
            {linkedEmergency.hospital_notified_at && (
              <p className="text-xs text-muted-foreground">🏥 {linkedEmergency.hospitals?.name} notified — {format(new Date(linkedEmergency.hospital_notified_at), 'h:mm a')}</p>
            )}
            {linkedEmergency.ambulance_dispatched_at && (
              <p className="text-xs text-muted-foreground">🚑 {linkedEmergency.ambulances?.vehicle_number} ({linkedEmergency.ambulances?.driver_name}) — {format(new Date(linkedEmergency.ambulance_dispatched_at), 'h:mm a')}</p>
            )}
            {linkedEmergency.reached_at && (
              <p className="text-xs text-muted-foreground">✅ Arrived — {format(new Date(linkedEmergency.reached_at), 'h:mm a')}</p>
            )}
            {linkedEmergency.reached_at && linkedEmergency.doctor_confirmed_at && (
              <p className="text-xs font-medium text-primary mt-2">
                Response time: {Math.round((new Date(linkedEmergency.reached_at).getTime() - new Date(linkedEmergency.doctor_confirmed_at).getTime()) / 60000)} minutes
              </p>
            )}
          </div>
          {activeEmergencyStatuses.includes(linkedEmergency.status) && (
            <button onClick={() => navigate(`/patient/emergency-tracking/${linkedEmergency.id}`)}
              className="mt-3 w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              🗺️ Track Live →
            </button>
          )}
        </div>
      )}

      {/* Linked Prescription */}
      {linkedPrescription && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold mb-2">💊 Prescription</h3>
          <p className="text-xs text-muted-foreground">Dr. {(linkedPrescription as any).doctors?.name} • {linkedPrescription.rx_number || 'Rx'}</p>
          {linkedPrescription.doctor_notes && <p className="text-xs text-muted-foreground mt-1">{linkedPrescription.doctor_notes}</p>}
          {linkedPrescription.follow_up_date && <p className="text-xs text-primary mt-1">Follow-up: {format(new Date(linkedPrescription.follow_up_date), 'MMM d, yyyy')}</p>}
        </div>
      )}
    </div>
  );

  // Analyzing overlay
  if (isAnalyzing) {
    const analysisSteps = ["Analyzing symptoms...", "Checking vitals...", "Reviewing history...", "Consulting AI model...", "Generating report..."];
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
          <HeartPulse className="h-16 w-16 text-primary" />
        </motion.div>
        <div className="space-y-3 w-full max-w-sm">
          {analysisSteps.map((s, i) => (
            <motion.div key={s} initial={{ opacity: 0 }} animate={{ opacity: i <= analysisStep ? 1 : 0.3 }} className="flex items-center gap-3">
              {i < analysisStep ? <Check className="h-5 w-5 text-primary" /> : i === analysisStep ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : <div className="w-5 h-5 rounded-full border border-muted-foreground" />}
              <span className={`text-sm ${i <= analysisStep ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
            </motion.div>
          ))}
        </div>
        <div className="font-mono text-2xl text-primary">{Math.min(100, (analysisStep + 1) * 20)}%</div>
      </div>
    );
  }

  // Form content
  const formContent = (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {formSteps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-xs hidden md:inline ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
            {i < formSteps.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-primary" : "bg-secondary"}`} />}
          </div>
        ))}
      </div>

      <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="glass-card p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div className="text-center">
              <HeartPulse className="h-10 w-10 text-primary mx-auto mb-2" />
              <h2 className="font-display text-2xl font-bold">Where does it hurt?</h2>
              <p className="text-muted-foreground text-sm">Tap on the body diagram to select affected areas</p>
            </div>
            <BodyDiagram selectedParts={selectedParts} onTogglePart={togglePart} onSuggestSymptom={toggleSymptom} />
            <button onClick={() => setStep(1)} className="text-sm text-primary font-semibold underline block mx-auto">Skip to symptoms →</button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">Select your symptoms</h2>
            <div className="flex flex-wrap gap-2">
              {allSymptoms.map((s) => (
                <button key={s} onClick={() => toggleSymptom(s)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedSymptoms.includes(s) ? "bg-primary text-primary-foreground glow-border" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
                  {s}
                </button>
              ))}
            </div>
            {selectedSymptoms.map(s => (
              <div key={s} className="flex items-center gap-3">
                <span className="text-sm text-foreground w-32 truncate">{s}</span>
                <input type="range" min={1} max={10} value={severities[s] || 5}
                  onChange={(e) => setSeverities(p => ({ ...p, [s]: parseInt(e.target.value) }))}
                  className="flex-1 accent-primary" />
                <span className={`font-mono text-sm w-6 text-center ${(severities[s] || 5) > 7 ? "text-destructive" : (severities[s] || 5) > 4 ? "text-urgent" : "text-primary"}`}>{severities[s] || 5}</span>
              </div>
            ))}
            <button onClick={startVoice}
              className={`flex items-center gap-2 glass-card px-4 py-3 w-full justify-center text-sm font-medium ${isListening ? "text-destructive glow-border" : "text-primary"}`}>
              <Mic className={`h-4 w-4 ${isListening ? "animate-pulse" : ""}`} /> {isListening ? "Listening..." : "Speak your symptoms"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">Enter your vitals</h2>
            <p className="text-xs text-muted-foreground">Enter what you have. Skip what you don't.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "bp_sys", label: "BP Systolic", hint: "Normal: 120", unit: "mmHg" },
                { key: "bp_dia", label: "BP Diastolic", hint: "Normal: 80", unit: "mmHg" },
                { key: "temp", label: "Temperature", hint: "Normal: 98.6", unit: "°F" },
                { key: "hr", label: "Heart Rate", hint: "Normal: 72", unit: "BPM" },
                { key: "sugar", label: "Blood Sugar", hint: "Normal: 100", unit: "mg/dL" },
                { key: "spo2", label: "Oxygen Level", hint: "Normal: 98", unit: "SpO2%" },
              ].map((v) => (
                <div key={v.key} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{v.label}</label>
                  <div className="relative">
                    <input type="number" inputMode="numeric" placeholder={v.hint}
                      value={vitals[v.key as keyof typeof vitals]}
                      onChange={(e) => setVitals({ ...vitals, [v.key]: e.target.value })}
                      className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{v.unit}</span>
                  </div>
                  {vitals[v.key as keyof typeof vitals] && (
                    <span className={`text-xs font-mono ${vitalColor(v.key, parseFloat(vitals[v.key as keyof typeof vitals]))}`}>
                      {parseFloat(vitals[v.key as keyof typeof vitals]) > 0 ? (vitalColor(v.key, parseFloat(vitals[v.key as keyof typeof vitals])) === "text-primary" ? "✓ Normal" : vitalColor(v.key, parseFloat(vitals[v.key as keyof typeof vitals])) === "text-urgent" ? "⚠ Watch" : "⚠ High") : ""}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <HistoryStep patient={patient} conditions={conditions} selectedConditions={selectedConditions} toggleCondition={toggleCondition} />
        )}

        {step === 4 && (
          <div className="space-y-4 text-center">
            <h2 className="font-display text-xl font-bold">Review & Submit</h2>
            <div className="glass-card p-4 text-left space-y-3">
              <div>
                <span className="text-xs text-muted-foreground">Symptoms ({selectedSymptoms.length})</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedSymptoms.length > 0
                    ? selectedSymptoms.map((s) => <span key={s} className="badge-safe text-xs">{s} ({severities[s] || 5}/10)</span>)
                    : <span className="text-xs text-muted-foreground">None selected</span>}
                </div>
              </div>
              {Object.entries(vitals).some(([, v]) => v) && (
                <div>
                  <span className="text-xs text-muted-foreground">Vitals</span>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {Object.entries(vitals).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="text-xs"><span className="text-muted-foreground">{k}: </span><span className={`font-mono ${vitalColor(k, parseFloat(v))}`}>{v}</span></div>
                    ))}
                  </div>
                </div>
              )}
              {selectedConditions.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Conditions</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedConditions.map(c => <span key={c} className="badge-urgent text-xs">{c}</span>)}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>🔒</span> Your data is encrypted
            </div>
            {!patient && (
              <div className="flex items-center gap-2 justify-center text-xs text-urgent">
                <AlertTriangle className="h-4 w-4" /> Login first from the landing page
              </div>
            )}
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleAnalyze}
              disabled={selectedSymptoms.length === 0 || !patient}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg disabled:opacity-50 animate-pulse-glow">
              Analyze My Health
            </motion.button>
          </div>
        )}
      </motion.div>

      <div className="flex justify-between">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground disabled:opacity-30 hover:text-foreground transition-all">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {step < 4 && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setStep(step + 1)}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            Next <ArrowRight className="h-4 w-4" />
          </motion.button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Desktop sidebar */}
      {!isMobile && (
        <div className="w-[260px] flex-shrink-0 border-r border-border bg-card/50 h-full overflow-hidden">
          {sidebarContent}
        </div>
      )}

      {/* Mobile sidebar trigger + sheet */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[280px] p-0 bg-card">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Mobile header with history toggle */}
        {isMobile && (
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </button>
            <h1 className="font-display text-lg font-bold">Health Check</h1>
          </div>
        )}

        {mode === 'form' ? formContent : pastCheckDetail}
      </div>
    </div>
  );
};

export default HealthCheck;
