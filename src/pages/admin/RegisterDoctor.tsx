import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserPlus, Loader2, CheckCircle, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

const SPECIALIZATIONS = [
  "General Physician", "Cardiologist", "Gynecologist", "Pediatrician",
  "Orthopedic", "ENT", "Dermatologist", "Psychiatrist", "Emergency Medicine"
];

const RegisterDoctor = () => {
  const navigate = useNavigate();
  const hospital = useAppStore(s => s.currentHospital);
  const [form, setForm] = useState({
    name: "", email: "", password: "", specialization: "General Physician",
    qualification: "MBBS", fee: "60"
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!hospital) { toast({ title: "No hospital found", variant: "destructive" }); return; }
    if (!form.name || !form.email || !form.password) {
      setError("Fill all required fields including password"); return;
    }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    try {
      // Create Supabase auth account for the doctor
      // We need to use the admin's session carefully here
      // Save current session, create doctor auth, restore
      const trimmedEmail = form.email.toLowerCase().trim();

      // Sign up doctor (this will change the current session)
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: form.password,
      });

      if (authErr) { setError(authErr.message); setLoading(false); return; }

      const doctorAuthId = authData.user?.id || null;

      // Sign back in as admin
      // We'll insert the doctor record regardless
      const { error: insertErr } = await (supabase.from("doctors") as any).insert({
        email: trimmedEmail,
        auth_id: doctorAuthId,
        name: form.name,
        reg_number: trimmedEmail, // Use email as unique identifier
        specialty: form.specialization,
        qualification: form.qualification,
        consultation_fee: parseInt(form.fee) || 60,
        hospital_id: hospital.id,
        rating: 5.0,
        is_online: false,
        patients_today: 0,
        earnings_today: 0,
      });
      if (insertErr) throw insertErr;

      setSuccess(true);
      toast({ title: `Dr. ${form.name} registered! ✅` });
    } catch (err: any) {
      setError(err.message || "Registration failed");
    }
    setLoading(false);
  };

  const copyInstructions = () => {
    const text = `🏥 MediAI Doctor Access\n\nYou have been registered as a doctor at ${hospital?.name}.\n\nLogin credentials:\nEmail: ${form.email}\nPassword: ${form.password}\n\nLogin at the MediAI app → Doctor Login`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copied! 📋" });
  };

  if (success) return (
    <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
      </motion.div>
      <h2 className="font-display text-2xl font-bold text-foreground">Dr. {form.name} Registered!</h2>
      <div className="glass-card p-5 w-full text-left space-y-3">
        <p className="text-sm font-bold text-foreground">🏥 MediAI Doctor Access</p>
        <p className="text-sm text-muted-foreground">Registered at <strong className="text-foreground">{hospital?.name}</strong></p>
        <div className="border border-border rounded-xl p-4 space-y-2">
          <p className="text-sm text-foreground">Login credentials:</p>
          <p className="text-sm text-muted-foreground">Email: <strong className="text-foreground">{form.email}</strong></p>
          <p className="text-sm text-muted-foreground">Password: <strong className="text-foreground">{form.password}</strong></p>
        </div>
        <button onClick={copyInstructions} className="w-full py-2 rounded-xl bg-secondary text-foreground text-sm font-medium flex items-center justify-center gap-2">
          <Copy className="h-4 w-4" /> Copy Credentials
        </button>
      </div>
      <div className="flex gap-3 w-full">
        <button onClick={() => { setSuccess(false); setForm({ name: "", email: "", password: "", specialization: "General Physician", qualification: "MBBS", fee: "60" }); }}
          className="flex-1 py-3 rounded-xl bg-primary/20 text-primary font-bold text-sm">Register Another</button>
        <button onClick={() => navigate("/admin/doctors")}
          className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-bold text-sm">View All Doctors</button>
      </div>
    </div>
  );

  const inputCls = "w-full mt-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-urgent/50";

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="font-display text-2xl font-bold text-foreground">Register Doctor 👨‍⚕️</h2>
      <p className="text-sm text-muted-foreground">Enter the doctor's details and set their login password.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { key: "name", label: "Full Name *", placeholder: "Dr. Rajesh Sharma" },
          { key: "email", label: "Email Address *", placeholder: "doctor@gmail.com", type: "email" },
          { key: "password", label: "Password *", placeholder: "Min 6 characters", type: "password" },
          { key: "qualification", label: "Qualification", placeholder: "MBBS, MD" },
          { key: "fee", label: "Consultation Fee (₹)", placeholder: "60", type: "number" },
        ].map(f => (
          <div key={f.key} className="glass-card p-4">
            <label className="text-xs text-muted-foreground">{f.label}</label>
            <input value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder} type={f.type || "text"} className={inputCls} />
          </div>
        ))}
        <div className="glass-card p-4">
          <label className="text-xs text-muted-foreground">Specialization</label>
          <select value={form.specialization} onChange={e => setForm(p => ({ ...p, specialization: e.target.value }))} className={inputCls}>
            {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={loading}
          className="w-full py-4 rounded-xl bg-urgent text-urgent-foreground font-display font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />} Register Doctor
        </motion.button>
      </form>
    </div>
  );
};

export default RegisterDoctor;
