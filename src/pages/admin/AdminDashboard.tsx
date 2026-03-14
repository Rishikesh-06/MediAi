import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { BedDouble, Users, Truck, Wind, Siren, HeartPulse, Package, Droplets, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const AdminDashboard = () => {
  const navigate = useNavigate();
  const hospital = useAppStore(s => s.currentHospital);
  const [loading, setLoading] = useState(true);
  const [beds, setBeds] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [hospitalData, setHospitalData] = useState<any>(null);
  const [patients, setPatients] = useState<Record<string, any>>({});
  const [healthChecks, setHealthChecks] = useState<Record<string, any>>({});
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [emergencyAlert, setEmergencyAlert] = useState(false);

  const loadAll = useCallback(async () => {
    if (!hospital) return;
    const hid = hospital.id;

    const [bedRes, docRes, ambRes, emRes, hospRes] = await Promise.all([
      supabase.from("beds").select("*").eq("hospital_id", hid),
      supabase.from("doctors").select("*").eq("hospital_id", hid),
      supabase.from("ambulances").select("*").eq("hospital_id", hid),
      supabase.from("emergencies").select("*").eq("hospital_id", hid).in("status", ["pending", "doctor_confirmed", "hospital_notified"]).order("created_at", { ascending: false }),
      supabase.from("hospitals").select("*").eq("id", hid).single(),
    ]);

    setBeds(bedRes.data || []);
    setDoctors(docRes.data || []);
    setAmbulances(ambRes.data || []);
    setHospitalData(hospRes.data);

    if (emRes.data) {
      setEmergencies(emRes.data);
      const pIds = [...new Set(emRes.data.map((e: any) => e.patient_id))];
      const hcIds = [...new Set(emRes.data.map((e: any) => e.health_check_id).filter(Boolean))];
      if (pIds.length) {
        const { data: pts } = await supabase.from("patients").select("*").in("id", pIds);
        if (pts) { const m: Record<string, any> = {}; pts.forEach(p => m[p.id] = p); setPatients(m); }
      }
      if (hcIds.length) {
        const { data: hcs } = await supabase.from("health_checks").select("*").in("id", hcIds);
        if (hcs) { const m: Record<string, any> = {}; hcs.forEach(h => m[h.id] = h); setHealthChecks(m); }
      }
    }
    setLoading(false);
  }, [hospital]);

  useEffect(() => {
    if (!hospital) { navigate("/admin/login"); return; }
    loadAll();
    const hid = hospital.id;
    const ch = supabase.channel("admin-dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "emergencies" }, () => {
        loadAll();
        setEmergencyAlert(true);
        setTimeout(() => setEmergencyAlert(false), 3000);
        try { const ctx = new AudioContext(); const o = ctx.createOscillator(); o.frequency.value = 660; o.connect(ctx.destination); o.start(); setTimeout(() => o.stop(), 500); } catch {}
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "beds", filter: `hospital_id=eq.${hid}` }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "ambulances", filter: `hospital_id=eq.${hid}` }, () => loadAll())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "doctors", filter: `hospital_id=eq.${hid}` }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hospital, loadAll]);

  const confirmDispatch = async (em: any) => {
    setDispatching(em.id);
    try {
      const p = patients[em.patient_id];
      const freeAmb = ambulances.find(a => a.status === "free");
      const freeBed = beds.find(b => b.status === "available" && b.ward === "Emergency") || beds.find(b => b.status === "available");
      if (!freeAmb) { toast({ title: "No free ambulance!", variant: "destructive" }); setDispatching(null); return; }
      if (!freeBed) { toast({ title: "No available bed!", variant: "destructive" }); setDispatching(null); return; }

      const eta = Math.max(5, Math.round(Math.random() * 20 + 5));

      await Promise.all([
        supabase.from("beds").update({ status: "reserved", patient_name: p?.name || "Emergency" }).eq("id", freeBed.id),
        supabase.from("ambulances").update({ status: "active", destination: p?.village || "Patient location", eta_minutes: eta, patient_id: em.patient_id }).eq("id", freeAmb.id),
        supabase.from("emergencies").update({ status: "ambulance_dispatched", ambulance_eta: eta, bed_assigned: freeBed.bed_number }).eq("id", em.id),
      ]);

      await supabase.from("notifications").insert({
        user_id: em.patient_id, user_type: "patient",
        title: "🚑 Ambulance Dispatched!",
        message: `${freeAmb.vehicle_number} is on the way. Driver: ${freeAmb.driver_name}. ETA: ${eta} minutes.`,
        type: "ambulance_dispatched",
      });

      if (em.doctor_id) {
        await supabase.from("notifications").insert({
          user_id: em.doctor_id, user_type: "doctor",
          title: "✅ Ambulance Dispatched",
          message: `Ambulance dispatched for ${p?.name}. ETA ${eta} min.`,
          type: "dispatch_update",
        });
      }

      toast({ title: `Ambulance dispatched! ETA: ${eta} min ✅` });
      loadAll();
    } catch (e: any) {
      toast({ title: "Dispatch failed", description: e.message, variant: "destructive" });
    }
    setDispatching(null);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!hospital) return null;

  const h = hospitalData || hospital;
  const bedAvail = beds.filter(b => b.status === "available").length;
  const bedTotal = beds.length;
  const onlineDocs = doctors.filter(d => d.is_online).length;
  const freeAmbs = ambulances.filter(a => a.status === "free").length;
  const activeAmbs = ambulances.filter(a => a.status === "active").length;

  const icuFree = beds.filter(b => b.ward === "ICU" && b.status === "available").length;

  const oxygenCurrent = h.oxygen_count ?? 0;
  const oxygenTotal = 100;
  const oxyPct = oxygenTotal > 0 ? (oxygenCurrent / oxygenTotal) * 100 : 0;

  const bloodBank: Record<string, number> = typeof h.blood_bank === "object" && h.blood_bank ? h.blood_bank : {};
  const bloodEntries = Object.entries(bloodBank);
  const lowestBlood = bloodEntries.length > 0 ? bloodEntries.sort((a, b) => (a[1] as number) - (b[1] as number))[0] : null;
  const lowBloodTypes = bloodEntries.filter(([, v]) => (v as number) < 3);

  const ventFree = h.ventilators ?? 0;

  const medStock = h.medicine_stock;
  const lowMeds = Array.isArray(medStock) ? medStock.filter((m: any) => m.quantity < 20).length : 0;

  const bedPct = bedTotal > 0 ? bedAvail / bedTotal : 0;

  const resources = [
    { icon: BedDouble, label: "Beds", value: bedTotal > 0 ? `${bedAvail}/${bedTotal}` : "0", sub: bedTotal > 0 ? "Available" : "No beds added", color: "text-primary", ok: bedPct > 0.5, warn: bedPct > 0.2 },
    { icon: Users, label: "Doctors", value: doctors.length > 0 ? `${onlineDocs} online` : "0", sub: doctors.length > 0 ? `${doctors.length} total` : "No doctors registered", color: "text-info", ok: onlineDocs > 0, warn: true },
    { icon: Truck, label: "Ambulances", value: ambulances.length > 0 ? `${activeAmbs} active` : "0", sub: ambulances.length > 0 ? `${freeAmbs} free` : "No ambulances added", color: "text-accent", ok: freeAmbs > 0, warn: false },
    { icon: Wind, label: "Oxygen", value: `${oxygenCurrent}`, sub: oxygenCurrent === 0 ? "Not set" : oxyPct < 30 ? "⚠️ Reorder" : "OK", color: "text-accent", ok: oxyPct >= 30, warn: oxyPct >= 20 },
    { icon: Siren, label: "ICU", value: `${icuFree} free`, sub: `of ${beds.filter(b => b.ward === "ICU").length}`, color: "text-primary", ok: icuFree > 2, warn: icuFree >= 1 },
    { icon: Droplets, label: "Blood Bank", value: lowestBlood ? `${lowestBlood[0]}: ${lowestBlood[1]}u` : "No data", sub: lowBloodTypes.length > 0 ? `⚠️ ${lowBloodTypes.length} type(s) low` : bloodEntries.length > 0 ? "OK" : "Not set", color: "text-destructive", ok: lowBloodTypes.length === 0, warn: lowBloodTypes.length <= 1 },
    { icon: HeartPulse, label: "Ventilators", value: `${ventFree} free`, sub: ventFree === 0 ? "Not set" : "", color: "text-info", ok: ventFree > 2, warn: ventFree >= 1 },
    { icon: Package, label: "Medicines", value: lowMeds > 0 ? `${lowMeds} low` : Array.isArray(medStock) && medStock.length > 0 ? "Stock OK" : "Not set", sub: lowMeds > 0 ? "⚠️ Restock" : "", color: "text-accent", ok: lowMeds === 0, warn: lowMeds <= 3 },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-5xl mx-auto">
      <motion.div variants={fadeUp}>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground">{h.name} Dashboard</h1>
        <p className="text-sm text-muted-foreground">{h.district}, {h.state} • Real-time overview</p>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {resources.map(r => (
          <div key={r.label} className={`glass-card p-4 border ${r.ok ? "border-primary/20" : r.warn ? "border-yellow-500/30" : "border-destructive/30"}`}>
            <r.icon className={`h-5 w-5 ${r.color} mb-2`} />
            <p className="font-mono text-lg font-bold text-foreground">{r.value}</p>
            <p className="text-xs text-muted-foreground">{r.label}</p>
            {r.sub && <p className={`text-xs mt-1 ${r.ok ? "text-muted-foreground" : "text-destructive"}`}>{r.sub}</p>}
          </div>
        ))}
      </motion.div>

      {emergencies.length > 0 && emergencies.map(em => {
        const p = patients[em.patient_id];
        const hc = em.health_check_id ? healthChecks[em.health_check_id] : null;
        return (
          <motion.div key={em.id} variants={fadeUp} className={`glass-card p-5 border-destructive/30 ${emergencyAlert ? "animate-pulse" : ""}`} style={{ background: "hsla(353, 90%, 64%, 0.06)" }}>
            <div className="flex items-center gap-3 mb-4">
              <Siren className="h-6 w-6 text-destructive animate-pulse" />
              <h3 className="font-display text-lg font-bold text-destructive">🚨 Incoming Emergency</h3>
              <span className="ml-auto text-xs text-muted-foreground">{new Date(em.created_at).toLocaleTimeString()}</span>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-foreground"><strong>Patient:</strong> {p?.name || "Unknown"}, {p?.age ?? "?"}, {p?.gender || "?"}</p>
              <p className="text-muted-foreground"><strong>Condition:</strong> {hc?.ai_condition || "Pending assessment"}</p>
              <p className="text-muted-foreground"><strong>Village:</strong> {p?.village || "—"}</p>
              <p className="font-mono text-destructive"><strong>AI Risk:</strong> {hc?.ai_risk_score ?? "—"}%</p>
              <p className="text-xs text-muted-foreground"><strong>Status:</strong> {em.status.replace(/_/g, " ")}</p>
            </div>

            <div className="mt-4 p-3 glass-card">
              <p className="text-xs text-muted-foreground mb-2">🤖 AI Suggests:</p>
              <div className="space-y-1 text-xs text-foreground">
                <p>🛏️ {beds.find(b => b.status === "available" && b.ward === "Emergency")?.bed_number || beds.find(b => b.status === "available")?.bed_number || "No bed available"} ({beds.find(b => b.status === "available")?.ward || "N/A"})</p>
                <p>👨‍⚕️ {doctors.find(d => d.is_online)?.name || "No doctor online"} ({doctors.find(d => d.is_online)?.patients_today || 0} patients today)</p>
                <p>🚑 {ambulances.find(a => a.status === "free")?.vehicle_number || "No ambulance free"} — {ambulances.find(a => a.status === "free")?.driver_name || ""}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => confirmDispatch(em)} disabled={dispatching === em.id}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2">
                {dispatching === em.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {dispatching === em.id ? "Dispatching..." : "✅ Confirm & Dispatch"}
              </motion.button>
              <button onClick={() => navigate("/admin/emergencies")}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground">
                View Details
              </button>
            </div>
          </motion.div>
        );
      })}

      {emergencies.length === 0 && (
        <motion.div variants={fadeUp} className="glass-card p-6 text-center border-primary/20">
          <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="text-foreground font-bold">✅ No active emergencies</p>
          <p className="text-xs text-muted-foreground">All clear — System is monitoring in real-time</p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AdminDashboard;
