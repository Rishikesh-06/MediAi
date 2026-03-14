import { useState, useEffect } from "react";
import { Loader2, ExternalLink, MapPin, Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

const AmbulanceTracking = () => {
  const hospital = useAppStore(s => s.currentHospital);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ vehicle_number: "", driver_name: "" });

  useEffect(() => { loadAmbulances(); }, [hospital]);

  const loadAmbulances = async () => {
    if (!hospital) return;
    const { data } = await supabase.from('ambulances').select('*').eq('hospital_id', hospital.id);
    setAmbulances(data || []);
    setLoading(false);
  };

  const addAmbulance = async () => {
    if (!hospital || !form.vehicle_number || !form.driver_name) {
      toast({ title: "Fill all fields", variant: "destructive" });
      return;
    }
    await supabase.from('ambulances').insert({
      hospital_id: hospital.id,
      vehicle_number: form.vehicle_number,
      driver_name: form.driver_name,
      status: "free",
      current_lat: hospital.lat || null,
      current_lng: hospital.lng || null,
    });
    toast({ title: "Ambulance added ✅" });
    setShowAdd(false);
    setForm({ vehicle_number: "", driver_name: "" });
    loadAmbulances();
  };

  const hospitalLat = hospital?.lat || 26.82;
  const hospitalLng = hospital?.lng || 75.89;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${hospitalLng - 0.05},${hospitalLat - 0.05},${hospitalLng + 0.05},${hospitalLat + 0.05}&layer=mapnik&marker=${hospitalLat},${hospitalLng}`;

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (ambulances.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Ambulance Tracking 🚑</h2>
        <div className="glass-card p-12 text-center">
          <p className="text-4xl mb-4">🚑</p>
          <p className="text-foreground font-bold text-lg">No ambulances registered</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Add ambulances to start tracking</p>
          <button onClick={() => setShowAdd(true)} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 mx-auto">
            <Plus className="h-4 w-4" /> Add Ambulance
          </button>
        </div>
        {showAdd && renderAddModal()}
      </div>
    );
  }

  function renderAddModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setShowAdd(false)}>
        <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} onClick={e => e.stopPropagation()} className="glass-card p-6 w-full max-w-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-foreground">Add Ambulance</h3>
            <button onClick={() => setShowAdd(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
          <input value={form.vehicle_number} onChange={e => setForm(f => ({...f, vehicle_number: e.target.value}))} placeholder="Vehicle Number *"
            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground" />
          <input value={form.driver_name} onChange={e => setForm(f => ({...f, driver_name: e.target.value}))} placeholder="Driver Name *"
            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground" />
          <button onClick={addAmbulance} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm">Save Ambulance</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">Ambulance Tracking 🚑</h2>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Ambulance
        </button>
      </div>

      <div className="glass-card overflow-hidden rounded-2xl relative" style={{ height: 400 }}>
        <iframe src={mapUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Ambulance Tracking Map" loading="lazy" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl">🏥</div>
        {ambulances.map(a => {
          if (!a.current_lat) return null;
          const left = ((a.current_lng - (hospitalLng - 0.05)) / 0.1) * 100;
          const top = ((hospitalLat + 0.05 - a.current_lat) / 0.1) * 100;
          if (left < 0 || left > 100 || top < 0 || top > 100) return null;
          return <div key={a.id} className="absolute text-xl" style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)' }}>🚑</div>;
        })}
      </div>

      <a href={`https://www.google.com/maps?q=${hospitalLat},${hospitalLng}`} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
        📍 Open in Google Maps <ExternalLink className="h-3 w-3" />
      </a>

      <div className="space-y-3">
        {ambulances.map(a => (
          <div key={a.id} className={`glass-card p-4 flex items-center gap-4 ${a.status === 'active' ? 'border-destructive/30' : ''}`}>
            <div className="text-3xl">🚑</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-foreground">{a.vehicle_number}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${a.status === 'free' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
                  {a.status === 'active' && <span className="inline-block w-2 h-2 rounded-full bg-destructive animate-pulse mr-1" />}
                  {a.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Driver: {a.driver_name}</p>
              {a.status === 'active' && (
                <>
                  <p className="text-xs text-destructive mt-1">En route: {a.destination} • ETA: {a.eta_minutes || '?'} min</p>
                  <a href={`https://www.google.com/maps/dir/${hospitalLat},${hospitalLng}/${a.current_lat},${a.current_lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                    <MapPin className="h-3 w-3" /> View Route in Google Maps
                  </a>
                </>
              )}
            </div>
            {a.status === 'free' && (
              <button className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
                onClick={() => toast({ title: "Select an emergency to dispatch" })}>Dispatch</button>
            )}
          </div>
        ))}
      </div>

      {showAdd && renderAddModal()}
    </div>
  );
};

export default AmbulanceTracking;
