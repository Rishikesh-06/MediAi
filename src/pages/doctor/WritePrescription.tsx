import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Pill, Plus, X, AlertTriangle, Send, Loader2, CheckCircle, ArrowLeft, Video, Users } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { checkDrugInteraction } from "@/lib/ai";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

const MEDICINE_LIST = [
  "Paracetamol 500mg","Dolo 650","Crocin","Combiflam","Ibuprofen 400mg","Aspirin 75mg",
  "Metformin 500mg","Metformin 1000mg","Glimepiride 1mg","Glimepiride 2mg",
  "Atorvastatin 10mg","Atorvastatin 20mg","Rosuvastatin 10mg",
  "Amlodipine 5mg","Telmisartan 40mg","Ramipril 5mg","Atenolol 50mg","Metoprolol 25mg","Losartan 50mg",
  "Omeprazole 20mg","Pantoprazole 40mg","Pan D","Ranitidine 150mg",
  "Amoxicillin 500mg","Azithromycin 500mg","Ciprofloxacin 500mg","Cefixime 200mg","Doxycycline 100mg","Metronidazole 400mg",
  "Cetirizine 10mg","Levocetirizine 5mg","Montelukast 10mg","Fexofenadine 120mg",
  "Aceclofenac 100mg","Diclofenac 50mg","Tramadol 50mg","Gabapentin 300mg","Pregabalin 75mg",
  "Vitamin D3 60000IU","Vitamin B12","Iron + Folic Acid","Calcium + Vitamin D","Zinc 50mg",
  "Salbutamol inhaler","Budesonide inhaler","Insulin Glargine","Insulin Regular",
  "Levothyroxine 50mcg","Alprazolam 0.25mg","Clonazepam 0.5mg","Escitalopram 10mg"
];

const FREQUENCIES = [
  { label: "Once daily (1-0-0)", value: "Once daily", times: ["08:00"] },
  { label: "Twice daily (1-0-1)", value: "Twice daily", times: ["08:00", "20:00"] },
  { label: "Thrice daily (1-1-1)", value: "Thrice daily", times: ["08:00", "14:00", "20:00"] },
  { label: "Morning only (1-0-0)", value: "Morning only", times: ["08:00"] },
  { label: "Night only (0-0-1)", value: "Night only", times: ["21:00"] },
  { label: "Every 8 hours", value: "Every 8 hours", times: ["08:00", "16:00", "00:00"] },
  { label: "Every 12 hours", value: "Every 12 hours", times: ["08:00", "20:00"] },
  { label: "As needed (SOS)", value: "As needed", times: ["08:00"] },
];

interface MedRow { name: string; strength: string; form: string; frequency: string; duration: string; durationUnit: string; timing: string; instructions: string; }
const emptyMed = (): MedRow => ({ name: "", strength: "", form: "Tablet", frequency: "Twice daily", duration: "7", durationUnit: "Days", timing: "after", instructions: "" });

const WritePrescription = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const doctor = useAppStore(s => s.currentDoctor);
  const [patient, setPatient] = useState<any>(null);
  const [latestCheck, setLatestCheck] = useState<any>(null);
  const [medicines, setMedicines] = useState<MedRow[]>([emptyMed()]);
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [interaction, setInteraction] = useState<any>(null);
  const [checkingInteraction, setCheckingInteraction] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [remindersCreated, setRemindersCreated] = useState(0);

  useEffect(() => {
    if (!doctor) { navigate('/doctor/login'); return; }
    if (patientId) {
      Promise.all([
        supabase.from('patients').select('*').eq('id', patientId).single(),
        supabase.from('health_checks').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1).maybeSingle()
      ]).then(([pRes, hcRes]) => {
        if (pRes.data) setPatient(pRes.data);
        if (hcRes.data) { setLatestCheck(hcRes.data); setDiagnosis(hcRes.data.ai_condition || ''); }
      });
    }
  }, [patientId, doctor]);

  // Drug interaction check
  useEffect(() => {
    const names = medicines.map(m => m.name).filter(Boolean);
    if (names.length >= 2) {
      const timer = setTimeout(async () => {
        setCheckingInteraction(true);
        try { const r = await checkDrugInteraction(names); setInteraction(r); } catch { setInteraction(null); }
        setCheckingInteraction(false);
      }, 1500);
      return () => clearTimeout(timer);
    } else setInteraction(null);
  }, [medicines]);

  const updateMed = (i: number, field: keyof MedRow, value: string) => {
    setMedicines(p => p.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  };

  const rxNumber = `RX-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${Math.floor(1000 + Math.random() * 9000)}`;

  const sendPrescription = async () => {
    if (!patientId || !doctor) return;
    const validMeds = medicines.filter(m => m.name);
    if (!validMeds.length) { toast({ title: "Add at least one medicine", variant: "destructive" }); return; }
    setSending(true);
    try {
      // Insert prescription
      await supabase.from('prescriptions').insert({
        patient_id: patientId, doctor_id: doctor.id,
        rx_number: rxNumber, diagnosis,
        medicines: validMeds as any, doctor_notes: notes, follow_up_date: followUp
      });

      // Create reminders for each medicine
      let created = 0;
      for (const med of validMeds) {
        const freq = FREQUENCIES.find(f => f.value === med.frequency);
        const times = freq?.times || ["08:00", "20:00"];
        const durationDays = parseInt(med.duration) * (med.durationUnit === 'Weeks' ? 7 : 1);
        await supabase.from('medicine_reminders').insert({
          patient_id: patientId, medicine_name: med.name, dosage: med.strength,
          frequency: med.frequency, times,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + durationDays * 86400000).toISOString().split('T')[0],
          is_active: true
        });
        created++;
      }
      setRemindersCreated(created);

      // Notify patient
      await supabase.from('notifications').insert({
        user_id: patientId, user_type: 'patient',
        title: '💊 Prescription Received',
        message: `Dr. ${doctor.name} sent prescription for ${diagnosis}. ${validMeds.length} medicine reminders set automatically.`,
        type: 'prescription'
      });

      // Update doctor stats
      await supabase.from('appointments').update({ status: 'completed' })
        .eq('doctor_id', doctor.id).eq('patient_id', patientId).eq('status', 'waiting');

      setSuccess(true);
      toast({ title: "Prescription sent! ✅" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSending(false);
  };

  if (!doctor) return null;

  // Success screen
  if (success) return (
    <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
      </motion.div>
      <h2 className="font-display text-2xl font-bold text-foreground">Prescription Sent! ✓</h2>
      <p className="text-muted-foreground">Sent to {patient?.name}</p>
      <div className="glass-card p-4 w-full space-y-2">
        <p className="text-sm text-primary">✅ {remindersCreated} medicine reminders created</p>
        <p className="text-sm text-primary">✅ Patient notified on their app</p>
      </div>
      <div className="flex gap-3 w-full">
        <button onClick={() => navigate(`/doctor/patient/${patientId}`)}
          className="flex-1 py-3 rounded-xl bg-info/20 text-info font-bold text-sm">📋 View Report</button>
        <button onClick={() => navigate('/doctor/queue')}
          className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-bold text-sm flex items-center justify-center gap-2">
          <Users className="h-4 w-4" /> Back to Queue
        </button>
      </div>
      <button onClick={() => navigate(`/doctor/video/new`)}
        className="w-full py-3 rounded-xl bg-info/20 text-info font-bold text-sm flex items-center justify-center gap-2">
        <Video className="h-4 w-4" /> Start Video Call
      </button>
    </div>
  );

  // Get hospital info for preview
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h2 className="font-display text-2xl font-bold text-foreground">Write Prescription 💊</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-4">
          {patient && (
            <div className="glass-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center text-lg font-bold text-info">{patient.name?.charAt(0)}</div>
              <div><p className="font-bold text-foreground">{patient.name}, {patient.age} {patient.gender?.charAt(0)}</p><p className="text-xs text-muted-foreground">{patient.village}</p></div>
            </div>
          )}

          <div className="glass-card p-4">
            <label className="text-xs text-muted-foreground">Diagnosis</label>
            <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g. Acute Coronary Syndrome"
              className="w-full mt-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-info/50" />
          </div>

          {/* Drug Interaction */}
          {interaction && !interaction.safe && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 border-urgent/40" style={{ background: 'hsla(37,100%,56%,0.08)' }}>
              <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-urgent" /><span className="font-bold text-urgent text-sm">Drug Interaction Warning</span></div>
              {interaction.interactions?.map((int: any, i: number) => (
                <p key={i} className="text-xs text-muted-foreground mt-1">⚠️ {int.drug1} + {int.drug2}: {int.warning}</p>
              ))}
            </motion.div>
          )}
          {interaction?.safe && <p className="text-xs text-primary">✅ No drug interactions found</p>}
          {checkingInteraction && <p className="text-xs text-muted-foreground animate-pulse">Checking drug interactions...</p>}

          {/* Medicines */}
          {medicines.map((med, i) => (
            <div key={i} className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Medicine {i + 1}</span>
                {medicines.length > 1 && <button onClick={() => setMedicines(p => p.filter((_, idx) => idx !== i))}><X className="h-4 w-4 text-muted-foreground" /></button>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input list="med-list" value={med.name} onChange={e => updateMed(i, "name", e.target.value)} placeholder="Medicine name"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-info/50" />
                  <datalist id="med-list">{MEDICINE_LIST.map(m => <option key={m} value={m} />)}</datalist>
                </div>
                <input value={med.strength} onChange={e => updateMed(i, "strength", e.target.value)} placeholder="500mg"
                  className="bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-info/50" />
                <select value={med.form} onChange={e => updateMed(i, "form", e.target.value)}
                  className="bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none">
                  {["Tablet", "Capsule", "Syrup", "Injection", "Inhaler", "Drops"].map(f => <option key={f}>{f}</option>)}
                </select>
                <select value={med.frequency} onChange={e => updateMed(i, "frequency", e.target.value)}
                  className="bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none">
                  {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <div className="flex gap-2">
                  <input type="number" value={med.duration} onChange={e => updateMed(i, "duration", e.target.value)} placeholder="7"
                    className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none" />
                  <select value={med.durationUnit} onChange={e => updateMed(i, "durationUnit", e.target.value)}
                    className="bg-secondary/50 border border-border rounded-xl px-3 py-3 text-sm text-foreground focus:outline-none">
                    <option>Days</option><option>Weeks</option>
                  </select>
                </div>
                <input value={med.instructions} onChange={e => updateMed(i, "instructions", e.target.value)} placeholder="Special notes"
                  className="bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
              </div>
              <div className="flex gap-2">
                {["before", "with", "after"].map(t => (
                  <button key={t} onClick={() => updateMed(i, "timing", t)}
                    className={`flex-1 py-2 rounded-xl text-xs capitalize ${med.timing === t ? "bg-info/20 text-info" : "bg-secondary text-muted-foreground"}`}>{t} food</button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => setMedicines(p => [...p, emptyMed()])}
            className="w-full py-3 rounded-xl border border-dashed border-info/30 text-info text-sm font-medium flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" /> Add Medicine
          </button>

          <div className="glass-card p-4 space-y-3">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Doctor notes..." rows={3}
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-info/50" />
            <div>
              <label className="text-xs text-muted-foreground">Follow-up Date</label>
              <input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)}
                className="w-full mt-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-info/50" />
            </div>
          </div>

          <motion.button whileTap={{ scale: 0.95 }} onClick={sendPrescription} disabled={sending}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            Send to Patient
          </motion.button>
        </div>

        {/* Right: Live Preview */}
        <div className="hidden lg:block sticky top-8">
          <div className="glass-card p-6 font-mono text-sm space-y-4" style={{ background: 'hsla(156,53%,8%,0.8)' }}>
            <div className="text-center border-b border-border/30 pb-3">
              <p className="font-bold text-foreground">🏥 MediAI Health Center</p>
              <p className="text-xs text-muted-foreground">Dr. {doctor.name} | {doctor.specialty}</p>
              <p className="text-xs text-muted-foreground">Reg: {doctor.reg_number}</p>
            </div>
            <div className="border-b border-border/30 pb-3">
              <p className="text-foreground">Patient: {patient?.name || '—'}, {patient?.age || '—'}, {patient?.gender?.charAt(0) || '—'}</p>
              <p className="text-muted-foreground">Date: {dateStr}</p>
              <p className="text-muted-foreground">Rx No: {rxNumber}</p>
            </div>
            <div className="border-b border-border/30 pb-3">
              <p className="text-foreground font-bold">Diagnosis: {diagnosis || '—'}</p>
              <p className="text-foreground font-bold mt-2">Rx</p>
              {medicines.filter(m => m.name).map((m, i) => (
                <div key={i} className="mt-1">
                  <p className="text-foreground">{i + 1}. {m.name} {m.strength} ({m.form})</p>
                  <p className="text-muted-foreground ml-4">{m.frequency} {m.timing} food × {m.duration} {m.durationUnit}</p>
                  {m.instructions && <p className="text-muted-foreground ml-4 italic">{m.instructions}</p>}
                </div>
              ))}
              {medicines.filter(m => m.name).length === 0 && <p className="text-muted-foreground italic">No medicines added yet</p>}
            </div>
            {notes && <p className="text-muted-foreground">Notes: {notes}</p>}
            <p className="text-muted-foreground">Follow-up: {followUp}</p>
            <div className="border-t border-border/30 pt-3 text-center">
              <p className="text-muted-foreground">________________________</p>
              <p className="text-xs text-muted-foreground">Dr. {doctor.name}</p>
              <p className="text-xs text-primary mt-1">Verified by MediAI ✓</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WritePrescription;
