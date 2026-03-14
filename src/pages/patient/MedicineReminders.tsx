import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Bell, Check, Clock, Pill, AlertTriangle, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

interface Reminder {
  id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  times: string[];
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

const MedicineReminders = () => {
  const patient = useAppStore((s) => s.currentPatient);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [takenToday, setTakenToday] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [newMed, setNewMed] = useState({ name: "", dosage: "", frequency: "twice daily", time1: "08:00", time2: "20:00", days: "30" });

  useEffect(() => {
    if (!patient) return;
    const load = async () => {
      const { data } = await supabase.from('medicine_reminders')
        .select('*').eq('patient_id', patient.id).eq('is_active', true);
      if (data) setReminders(data.map(d => ({ ...d, times: Array.isArray(d.times) ? d.times as string[] : JSON.parse(d.times as any) })));
    };
    load();
  }, [patient]);

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const markTaken = (id: string, time: string) => {
    setTakenToday(prev => new Set(prev).add(`${id}-${time}`));
    toast({ title: "Marked as taken ✅" });
  };

  const addMedicine = async () => {
    if (!patient || !newMed.name) return;
    try {
      const times = newMed.frequency === "once daily" ? [newMed.time1] : [newMed.time1, newMed.time2];
      await supabase.from('medicine_reminders').insert({
        patient_id: patient.id,
        medicine_name: newMed.name,
        dosage: newMed.dosage,
        frequency: newMed.frequency,
        times,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + parseInt(newMed.days) * 86400000).toISOString().split('T')[0],
        is_active: true,
      });
      toast({ title: "Medicine added! 💊" });
      setShowAdd(false);
      // Reload
      const { data } = await supabase.from('medicine_reminders').select('*').eq('patient_id', patient.id).eq('is_active', true);
      if (data) setReminders(data.map(d => ({ ...d, times: Array.isArray(d.times) ? d.times as string[] : JSON.parse(d.times as any) })));
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const getDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null;
    const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
    return diff;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Medicine Reminders 💊</h2>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="p-2 rounded-xl bg-primary text-primary-foreground">
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Today's Schedule */}
      <div className="glass-card p-5">
        <h3 className="font-display font-bold text-foreground mb-4">Today's Schedule</h3>
        <div className="space-y-4">
          {reminders.flatMap(r => r.times.map(t => ({ reminder: r, time: t as string }))).sort((a, b) => a.time.localeCompare(b.time)).map(({ reminder, time }, i) => {
            const taken = takenToday.has(`${reminder.id}-${time}`);
            const isPast = time < currentTime;
            const isMissed = isPast && !taken;
            
            return (
              <motion.div key={`${reminder.id}-${time}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground w-14">{time}</span>
                {taken ? <Check className="h-5 w-5 text-primary" /> : isMissed ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <Clock className="h-5 w-5 text-urgent" />}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${taken ? "text-primary line-through" : isMissed ? "text-destructive" : "text-foreground"}`}>
                    {reminder.medicine_name} — {reminder.dosage}
                  </p>
                  <p className="text-xs text-muted-foreground">{taken ? "Taken ✓" : isMissed ? "Missed!" : "Upcoming"}</p>
                </div>
                {!taken && (
                  <button onClick={() => markTaken(reminder.id, time)}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                    Take
                  </button>
                )}
              </motion.div>
            );
          })}
          {reminders.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No medicine reminders set. Add one below!</p>
          )}
        </div>
      </div>

      {/* Active Medicines */}
      {reminders.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-bold text-foreground">Active Medicines</h3>
          {reminders.map(r => {
            const daysLeft = getDaysRemaining(r.end_date);
            return (
              <div key={r.id} className={`glass-card p-4 ${daysLeft !== null && daysLeft <= 3 ? "border-destructive/30" : ""}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground text-sm">{r.medicine_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{r.dosage}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: daysLeft !== null ? `${Math.max(0, 100 - (daysLeft / 30) * 100)}%` : "50%" }} />
                  </div>
                  {daysLeft !== null && (
                    <span className={`text-xs font-mono ${daysLeft <= 3 ? "text-destructive" : "text-muted-foreground"}`}>
                      {daysLeft <= 0 ? "Course complete" : `${daysLeft}d left`}
                    </span>
                  )}
                </div>
                {daysLeft !== null && daysLeft <= 3 && daysLeft > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3" /> Refill needed soon!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Medicine Modal */}
      {showAdd && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-foreground">Add Medicine</h3>
            <button onClick={() => setShowAdd(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
          <div className="space-y-3">
            <input placeholder="Medicine name" value={newMed.name} onChange={e => setNewMed({ ...newMed, name: e.target.value })}
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input placeholder="Dosage (e.g., 500mg)" value={newMed.dosage} onChange={e => setNewMed({ ...newMed, dosage: e.target.value })}
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <select value={newMed.frequency} onChange={e => setNewMed({ ...newMed, frequency: e.target.value })}
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="once daily">Once daily</option>
              <option value="twice daily">Twice daily</option>
              <option value="thrice daily">Thrice daily</option>
            </select>
            <input type="number" placeholder="Duration (days)" value={newMed.days} onChange={e => setNewMed({ ...newMed, days: e.target.value })}
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <motion.button whileTap={{ scale: 0.98 }} onClick={addMedicine}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
              Add Medicine
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MedicineReminders;
