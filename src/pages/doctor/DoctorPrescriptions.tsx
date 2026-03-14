import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Pill, Loader2, Eye, Copy, Search, Printer, Share2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";

const DoctorPrescriptions = () => {
  const doctor = useAppStore(s => s.currentDoctor);
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [patients, setPatients] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [viewRx, setViewRx] = useState<any>(null);

  useEffect(() => {
    if (!doctor) { navigate('/doctor/login'); return; }
    loadPrescriptions();
  }, [doctor, period]);

  const loadPrescriptions = async () => {
    if (!doctor) return;
    let query = supabase.from('prescriptions').select('*').eq('doctor_id', doctor.id).order('created_at', { ascending: false });

    if (period === 'week') {
      const d = new Date(); d.setDate(d.getDate() - 7);
      query = query.gte('created_at', d.toISOString());
    } else if (period === 'month') {
      const d = new Date(); d.setMonth(d.getMonth() - 1);
      query = query.gte('created_at', d.toISOString());
    }

    const { data } = await query;
    if (data) {
      setPrescriptions(data);
      const pIds = [...new Set(data.map(r => r.patient_id))];
      if (pIds.length) {
        const { data: pts } = await supabase.from('patients').select('*').in('id', pIds);
        if (pts) {
          const map: Record<string, any> = {};
          pts.forEach(p => map[p.id] = p);
          setPatients(map);
        }
      }
    }
    setLoading(false);
  };

  const filtered = prescriptions.filter(rx => {
    if (!search) return true;
    const p = patients[rx.patient_id];
    const s = search.toLowerCase();
    return p?.name?.toLowerCase().includes(s) || rx.diagnosis?.toLowerCase().includes(s);
  });

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-info" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="font-display text-2xl font-bold text-foreground">Prescriptions 💊</h2>

      <div className="flex gap-3">
        <div className="flex-1 glass-card p-1 flex items-center gap-2 px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient or diagnosis..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none py-2" />
        </div>
        <div className="flex gap-1">
          {["week", "month", "all"].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-2 rounded-xl text-xs capitalize ${period === p ? "bg-info text-info-foreground" : "bg-secondary text-muted-foreground"}`}>{p}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(rx => {
          const p = patients[rx.patient_id];
          const meds = Array.isArray(rx.medicines) ? rx.medicines : [];
          const isOverdue = rx.follow_up_date && new Date(rx.follow_up_date) < new Date();

          return (
            <motion.div key={rx.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{p?.name || 'Patient'}, {p?.age || '?'}</p>
                  {rx.diagnosis && <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-info/20 text-info mt-1">{rx.diagnosis}</span>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{meds.length} medicines</span>
                    <span className="text-xs text-muted-foreground">· {new Date(rx.created_at).toLocaleDateString()}</span>
                  </div>
                  {rx.follow_up_date && (
                    <p className={`text-xs mt-1 ${isOverdue ? 'text-destructive' : 'text-primary'}`}>
                      Follow-up: {rx.follow_up_date} {isOverdue ? '⚠️ Overdue' : ''}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setViewRx(rx)} className="p-2 rounded-lg bg-info/10 text-info"><Eye className="h-4 w-4" /></button>
                  <button onClick={() => navigate(`/doctor/prescription/${rx.patient_id}`)} className="p-2 rounded-lg bg-primary/10 text-primary"><Copy className="h-4 w-4" /></button>
                </div>
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No prescriptions found</p>}
      </div>

      {/* View modal */}
      {viewRx && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setViewRx(null)}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-card p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">Prescription</h3>
              <button onClick={() => setViewRx(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="font-mono text-sm space-y-3">
              <div className="text-center border-b border-border/30 pb-2">
                <p className="font-bold text-foreground">🏥 MediAI Health Center</p>
                <p className="text-xs text-muted-foreground">Dr. {doctor?.name} | {doctor?.reg_number}</p>
              </div>
              <div className="border-b border-border/30 pb-2">
                <p className="text-foreground">Patient: {patients[viewRx.patient_id]?.name}, {patients[viewRx.patient_id]?.age}</p>
                <p className="text-muted-foreground">Date: {new Date(viewRx.created_at).toLocaleDateString()}</p>
                {viewRx.rx_number && <p className="text-muted-foreground">Rx: {viewRx.rx_number}</p>}
              </div>
              {viewRx.diagnosis && <p className="text-foreground font-bold">Diagnosis: {viewRx.diagnosis}</p>}
              <div>
                <p className="font-bold text-foreground">Rx</p>
                {(Array.isArray(viewRx.medicines) ? viewRx.medicines : []).map((m: any, i: number) => (
                  <p key={i} className="text-foreground">{i + 1}. {m.name} {m.strength} — {m.frequency} {m.timing} food × {m.duration}{m.durationUnit || 'd'}</p>
                ))}
              </div>
              {viewRx.doctor_notes && <p className="text-muted-foreground">Notes: {viewRx.doctor_notes}</p>}
              {viewRx.follow_up_date && <p className="text-muted-foreground">Follow-up: {viewRx.follow_up_date}</p>}
              <div className="text-center text-xs text-primary pt-2 border-t border-border/30">Verified by MediAI ✓</div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => window.print()} className="flex-1 py-2 rounded-xl bg-secondary text-foreground text-sm font-medium flex items-center justify-center gap-1">
                <Printer className="h-4 w-4" /> Print
              </button>
              <button onClick={() => navigator.share?.({ title: 'Prescription', text: `Prescription from Dr. ${doctor?.name}` }).catch(() => {})}
                className="flex-1 py-2 rounded-xl bg-secondary text-foreground text-sm font-medium flex items-center justify-center gap-1">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DoctorPrescriptions;
