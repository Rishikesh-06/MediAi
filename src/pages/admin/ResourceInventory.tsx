import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Wind, HeartPulse, Droplets, Package, AlertTriangle, Loader2, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

const ResourceInventory = () => {
  const hospital = useAppStore(s => s.currentHospital);
  const setHospital = useAppStore(s => s.setHospital);
  const [hospitalData, setHospitalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [editBloodType, setEditBloodType] = useState<string | null>(null);
  const [editBloodValue, setEditBloodValue] = useState<number>(0);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [medName, setMedName] = useState("");
  const [medQty, setMedQty] = useState(0);
  const [medMin, setMedMin] = useState(50);

  useEffect(() => { loadHospital(); }, [hospital]);

  const loadHospital = async () => {
    if (!hospital) return;
    const { data } = await supabase.from('hospitals').select('*').eq('id', hospital.id).single();
    if (data) setHospitalData(data);
    setLoading(false);
  };

  const updateField = async (field: string, value: number) => {
    if (!hospital) return;
    await supabase.from('hospitals').update({ [field]: value }).eq('id', hospital.id);
    toast({ title: "Updated ✅" });
    setEditField(null);
    loadHospital();
  };

  const updateBlood = async (type: string, units: number) => {
    if (!hospital || !hospitalData) return;
    const bloodBank = typeof hospitalData.blood_bank === 'object' && hospitalData.blood_bank ? { ...hospitalData.blood_bank } : {};
    bloodBank[type] = units;
    await supabase.from('hospitals').update({ blood_bank: bloodBank }).eq('id', hospital.id);
    toast({ title: `${type} updated ✅` });
    setEditBloodType(null);
    loadHospital();
  };

  const addMedicine = async () => {
    if (!hospital || !hospitalData || !medName) return;
    const stock = Array.isArray(hospitalData.medicine_stock) ? [...hospitalData.medicine_stock] : [];
    stock.push({ name: medName, quantity: medQty, min: medMin });
    await supabase.from('hospitals').update({ medicine_stock: stock }).eq('id', hospital.id);
    toast({ title: "Medicine added ✅" });
    setShowAddMedicine(false);
    setMedName(""); setMedQty(0); setMedMin(50);
    loadHospital();
  };

  const updateMedicineQty = async (idx: number, qty: number) => {
    if (!hospital || !hospitalData) return;
    const stock = Array.isArray(hospitalData.medicine_stock) ? [...hospitalData.medicine_stock] : [];
    stock[idx] = { ...stock[idx], quantity: qty };
    await supabase.from('hospitals').update({ medicine_stock: stock }).eq('id', hospital.id);
    toast({ title: "Quantity updated ✅" });
    loadHospital();
  };

  const removeMedicine = async (idx: number) => {
    if (!hospital || !hospitalData) return;
    const stock = Array.isArray(hospitalData.medicine_stock) ? [...hospitalData.medicine_stock] : [];
    stock.splice(idx, 1);
    await supabase.from('hospitals').update({ medicine_stock: stock }).eq('id', hospital.id);
    toast({ title: "Medicine removed" });
    loadHospital();
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const h = hospitalData || hospital;
  const oxygenCurrent = h?.oxygen_count ?? 0;
  const ventFree = h?.ventilators ?? 0;
  const icuAvail = h?.icu_available ?? 0;
  const bloodBank: Record<string, number> = typeof h?.blood_bank === 'object' && h?.blood_bank ? h.blood_bank : {};
  const medicines: any[] = Array.isArray(h?.medicine_stock) ? h.medicine_stock : [];
  const lowMeds = medicines.filter(m => m.quantity < (m.min || 50));

  const getColor = (pct: number) => pct > 50 ? "hsl(152,100%,45%)" : pct > 20 ? "hsl(37,100%,56%)" : "hsl(353,90%,64%)";
  const getStatus = (pct: number) => pct > 50 ? "OK" : pct > 20 ? "Low" : "Critical";

  const resources = [
    { icon: Wind, name: "Oxygen Cylinders", current: oxygenCurrent, total: 100, unit: "cylinders", field: "oxygen_count" },
    { icon: HeartPulse, name: "Ventilators", current: ventFree, total: 10, unit: "units", field: "ventilators" },
    { icon: Package, name: "ICU Available", current: icuAvail, total: 10, unit: "beds", field: "icu_available" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="font-display text-2xl font-bold text-foreground">Resource Inventory 📦</h2>

      {lowMeds.length > 0 && (
        <div className="glass-card p-4 border-destructive/30 flex items-center gap-3" style={{ background: "hsla(353,90%,64%,0.06)" }}>
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive font-medium">{lowMeds.length} medicine(s) need reordering</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {resources.map(r => {
          const pct = r.total > 0 ? (r.current / r.total) * 100 : 0;
          return (
            <div key={r.name} className="glass-card p-5">
              <r.icon className="h-6 w-6 mb-3" style={{ color: getColor(pct) }} />
              <p className="font-bold text-foreground">{r.name}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: getColor(pct) }} />
                </div>
                <span className="font-mono text-sm font-bold" style={{ color: getColor(pct) }}>{r.current}</span>
              </div>
              <p className="text-xs mt-1" style={{ color: getColor(pct) }}>{r.current === 0 ? "Not set" : getStatus(pct)}</p>
              <button onClick={() => { setEditField(r.field); setEditValue(r.current); }}
                className="mt-2 px-3 py-1 rounded-lg bg-secondary text-foreground text-xs font-medium">Update</button>
            </div>
          );
        })}
      </div>

      {/* Blood Bank */}
      <div className="glass-card p-5">
        <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2"><Droplets className="h-5 w-5 text-destructive" /> Blood Bank</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["A+", "B+", "O+", "AB+", "A-", "B-", "O-", "AB-"].map(type => {
            const units = (bloodBank[type] as number) || 0;
            const pct = (units / 15) * 100;
            return (
              <div key={type} className="glass-card p-3 text-center cursor-pointer hover:bg-accent/30 transition-colors"
                style={{ borderColor: units < 3 ? "hsla(353,90%,64%,0.3)" : "transparent" }}
                onClick={() => { setEditBloodType(type); setEditBloodValue(units); }}>
                <p className="font-mono text-2xl font-bold" style={{ color: getColor(pct) }}>{units}</p>
                <p className="text-sm font-bold text-foreground">{type}</p>
                <p className="text-xs text-muted-foreground">units</p>
                {units < 3 && <span className="text-xs text-destructive">⚠️ Critical</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Medicines */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2"><Package className="h-5 w-5 text-urgent" /> Medicine Stock</h3>
          <button onClick={() => setShowAddMedicine(true)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1">
            <Plus className="h-3 w-3" /> Add Medicine
          </button>
        </div>
        {medicines.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No medicines added yet</p>
            <p className="text-xs text-muted-foreground mt-1">Update your inventory to see real stock levels</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border/50">
                  <th className="text-left py-2">Medicine</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Min</th>
                  <th className="text-right py-2">Status</th>
                  <th className="text-right py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m: any, idx: number) => {
                  const status = m.quantity >= (m.min || 50) ? "OK" : m.quantity >= (m.min || 50) * 0.5 ? "Low" : "Critical";
                  const color = status === "OK" ? "text-primary" : status === "Low" ? "text-urgent" : "text-destructive";
                  return (
                    <tr key={idx} className="border-b border-border/20">
                      <td className="py-3 text-foreground">{m.name}</td>
                      <td className="py-3 text-right font-mono text-foreground">{m.quantity}</td>
                      <td className="py-3 text-right font-mono text-muted-foreground">{m.min || 50}</td>
                      <td className={`py-3 text-right font-bold ${color}`}>{status}</td>
                      <td className="py-3 text-right">
                        <button onClick={() => { const qty = prompt("New quantity:", String(m.quantity)); if (qty) updateMedicineQty(idx, parseInt(qty)); }}
                          className="text-xs text-info mr-2">Edit</button>
                        <button onClick={() => removeMedicine(idx)} className="text-xs text-destructive">Remove</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Resource Modal */}
      {editField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setEditField(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={e => e.stopPropagation()} className="glass-card p-6 w-full max-w-sm space-y-4">
            <h3 className="font-display font-bold text-foreground">Update Value</h3>
            <input type="number" value={editValue} onChange={e => setEditValue(parseInt(e.target.value) || 0)}
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground" />
            <button onClick={() => updateField(editField, editValue)} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm">Save</button>
          </motion.div>
        </div>
      )}

      {/* Edit Blood Modal */}
      {editBloodType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setEditBloodType(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={e => e.stopPropagation()} className="glass-card p-6 w-full max-w-sm space-y-4">
            <h3 className="font-display font-bold text-foreground">Update {editBloodType} Units</h3>
            <input type="number" value={editBloodValue} onChange={e => setEditBloodValue(parseInt(e.target.value) || 0)}
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground" />
            <button onClick={() => updateBlood(editBloodType!, editBloodValue)} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm">Save</button>
          </motion.div>
        </div>
      )}

      {/* Add Medicine Modal */}
      {showAddMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setShowAddMedicine(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={e => e.stopPropagation()} className="glass-card p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-foreground">Add Medicine</h3>
              <button onClick={() => setShowAddMedicine(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <input value={medName} onChange={e => setMedName(e.target.value)} placeholder="Medicine Name *"
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground" />
            <input type="number" value={medQty} onChange={e => setMedQty(parseInt(e.target.value) || 0)} placeholder="Current Quantity"
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground" />
            <input type="number" value={medMin} onChange={e => setMedMin(parseInt(e.target.value) || 50)} placeholder="Minimum Required"
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground" />
            <button onClick={addMedicine} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm">Add Medicine</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ResourceInventory;
