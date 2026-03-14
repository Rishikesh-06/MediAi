import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { BedDouble, X, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

const wards = ["All","General","ICU","Emergency","Maternity","Pediatric"];
const statusColors: Record<string,string> = { available:"hsl(152,100%,45%)", occupied:"hsl(353,90%,64%)", cleaning:"hsl(37,100%,56%)", reserved:"hsl(190,90%,59%)" };
const statusBg: Record<string,string> = { available:"hsla(152,100%,45%,0.1)", occupied:"hsla(353,90%,64%,0.1)", cleaning:"hsla(37,100%,56%,0.1)", reserved:"hsla(190,90%,59%,0.1)" };

const BedManagement = () => {
  const hospital = useAppStore(s => s.currentHospital);
  const [beds, setBeds] = useState<any[]>([]);
  const [ward, setWard] = useState("All");
  const [loading, setLoading] = useState(true);
  const [editBed, setEditBed] = useState<any>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editPatient, setEditPatient] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addCount, setAddCount] = useState(1);
  const [addWard, setAddWard] = useState("General");

  useEffect(() => { loadBeds(); }, [hospital]);

  const loadBeds = async () => {
    if (!hospital) return;
    const {data} = await supabase.from('beds').select('*').eq('hospital_id', hospital.id);
    setBeds(data || []);
    setLoading(false);
  };

  const filtered = ward === "All" ? beds : beds.filter(b => b.ward === ward);
  const counts = { available: beds.filter(b => b.status === 'available').length, occupied: beds.filter(b => b.status === 'occupied').length, cleaning: beds.filter(b => b.status === 'cleaning').length, reserved: beds.filter(b => b.status === 'reserved').length };

  const saveBedEdit = async () => {
    if (!editBed) return;
    await supabase.from('beds').update({status: editStatus, patient_name: editPatient || null}).eq('id', editBed.id);
    toast({title:"Bed updated ✅"});
    setEditBed(null);
    loadBeds();
  };

  const addBeds = async () => {
    if (!hospital) return;
    const existing = beds.filter(b => b.ward === addWard).length;
    const prefix = addWard === "General" ? "G" : addWard === "ICU" ? "ICU" : addWard === "Emergency" ? "EM" : addWard === "Maternity" ? "MAT" : "PED";
    const newBeds = Array.from({length: addCount}, (_, i) => ({
      hospital_id: hospital.id,
      bed_number: `${prefix}-${existing + i + 1}`,
      ward: addWard,
      status: "available",
    }));
    await supabase.from('beds').insert(newBeds);
    toast({title: `${addCount} beds added to ${addWard} ✅`});
    setShowAddModal(false);
    setAddCount(1);
    loadBeds();
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-urgent" /></div>;

  if (beds.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Bed Management 🛏️</h2>
        <div className="glass-card p-12 text-center">
          <p className="text-4xl mb-4">🛏️</p>
          <p className="text-foreground font-bold text-lg">No beds added yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Add beds to start managing your hospital's bed inventory</p>
          <button onClick={() => setShowAddModal(true)} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 mx-auto">
            <Plus className="h-4 w-4" /> Add Beds
          </button>
        </div>
        {showAddModal && renderAddModal()}
      </div>
    );
  }

  function renderAddModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setShowAddModal(false)}>
        <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} onClick={e => e.stopPropagation()} className="glass-card p-6 w-full max-w-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-foreground">Add Beds</h3>
            <button onClick={() => setShowAddModal(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
          <select value={addWard} onChange={e => setAddWard(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground">
            {wards.filter(w => w !== "All").map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          <input type="number" min={1} max={50} value={addCount} onChange={e => setAddCount(parseInt(e.target.value) || 1)}
            placeholder="Number of beds"
            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground" />
          <button onClick={addBeds} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm">Add {addCount} Bed(s)</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">Bed Management 🛏️</h2>
        <button onClick={() => setShowAddModal(true)} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Beds
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {Object.entries(counts).map(([k,v]) => (
          <div key={k} className="glass-card p-3 text-center" style={{borderColor:`${statusColors[k]}30`}}>
            <p className="font-mono text-xl font-bold" style={{color:statusColors[k]}}>{v}</p>
            <p className="text-xs text-muted-foreground capitalize">{k}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {wards.map(w => (
          <button key={w} onClick={() => setWard(w)}
            className={`px-4 py-2 rounded-full text-xs font-medium flex-shrink-0 ${ward === w ? "bg-urgent text-urgent-foreground" : "bg-secondary text-muted-foreground"}`}>
            {w} ({w === "All" ? beds.length : beds.filter(b => b.ward === w).length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filtered.map(b => (
          <motion.button key={b.id} whileHover={{scale:1.03}} onClick={() => { setEditBed(b); setEditStatus(b.status); setEditPatient(b.patient_name || ""); }}
            className="glass-card p-4 text-left transition-all" style={{background:statusBg[b.status], borderColor:`${statusColors[b.status]}30`}}>
            <p className="font-mono text-lg font-bold" style={{color:statusColors[b.status]}}>{b.bed_number}</p>
            <p className="text-xs text-muted-foreground">{b.ward}</p>
            <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium capitalize" style={{background:`${statusColors[b.status]}20`, color:statusColors[b.status]}}>
              {b.status}
            </span>
            {b.patient_name && <p className="text-xs text-foreground mt-1 truncate">{b.patient_name}</p>}
          </motion.button>
        ))}
      </div>

      {editBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setEditBed(null)}>
          <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} onClick={e => e.stopPropagation()} className="glass-card p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-foreground">Bed {editBed.bed_number}</h3>
              <button onClick={() => setEditBed(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground">
              {["available","occupied","cleaning","reserved"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {(editStatus === "occupied" || editStatus === "reserved") && (
              <input value={editPatient} onChange={e => setEditPatient(e.target.value)} placeholder="Patient name"
                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground" />
            )}
            <button onClick={saveBedEdit} className="w-full py-3 rounded-xl bg-urgent text-urgent-foreground font-bold text-sm">Save Changes</button>
          </motion.div>
        </div>
      )}

      {showAddModal && renderAddModal()}
    </div>
  );
};

export default BedManagement;
