import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

const DoctorSettings = () => {
  const navigate = useNavigate();
  const doctor = useAppStore(s => s.currentDoctor);
  const setDoctor = useAppStore(s => s.setDoctor);

  const [name, setName] = useState(doctor?.name || "");
  const [specialty, setSpecialty] = useState(doctor?.specialty || "");
  const [qualification, setQualification] = useState(doctor?.qualification || "");
  const [languages, setLanguages] = useState<string[]>(doctor?.languages || ["English", "Hindi"]);
  const [newLang, setNewLang] = useState("");
  const [consultationFee, setConsultationFee] = useState(doctor?.consultation_fee || 60);
  const [isOnline, setIsOnline] = useState(doctor?.is_online ?? false);
  const [saving, setSaving] = useState(false);
  const [hospitalName, setHospitalName] = useState("");
  const [totalConsultations, setTotalConsultations] = useState(0);
  const [totalEmergencies, setTotalEmergencies] = useState(0);

  // Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!doctor) { navigate('/doctor/login'); return; }
    loadStats();
  }, [doctor]);

  const loadStats = async () => {
    if (!doctor) return;
    const [apptRes, emgRes, hospRes] = await Promise.all([
      supabase.from('appointments').select('id', { count: 'exact' }).eq('doctor_id', doctor.id).eq('status', 'completed'),
      supabase.from('emergencies').select('id', { count: 'exact' }).eq('doctor_id', doctor.id),
      doctor.hospital_id ? supabase.from('hospitals').select('name').eq('id', doctor.hospital_id).single() : Promise.resolve({ data: null }),
    ]);
    setTotalConsultations(apptRes.count || 0);
    setTotalEmergencies(emgRes.count || 0);
    if (hospRes.data) setHospitalName((hospRes.data as any).name || "");
  };

  const saveProfile = async () => {
    if (!doctor) return;
    setSaving(true);
    const { error } = await supabase.from('doctors').update({
      name, specialty, qualification, languages, consultation_fee: consultationFee,
    }).eq('id', doctor.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      setDoctor({ ...doctor, name, specialty, qualification, languages, consultation_fee: consultationFee });
      toast({ title: "Profile updated ✅" });
    }
    setSaving(false);
  };

  const toggleOnline = async () => {
    if (!doctor) return;
    const newStatus = !isOnline;
    await supabase.from('doctors').update({ is_online: newStatus }).eq('id', doctor.id);
    setIsOnline(newStatus);
    setDoctor({ ...doctor, is_online: newStatus });
    toast({ title: newStatus ? "You're now online ✅" : "You're now offline" });
  };

  const updatePassword = async () => {
    if (newPassword !== confirmPassword) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    if (newPassword.length < 6) { toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Password updated ✅" }); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
  };

  const addLanguage = () => {
    if (newLang.trim() && !languages.includes(newLang.trim())) {
      setLanguages([...languages, newLang.trim()]);
      setNewLang("");
    }
  };

  if (!doctor) return null;

  const inputClass = "w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-info/50";
  const labelClass = "text-sm font-semibold text-foreground block mb-1";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="font-display text-2xl font-bold text-foreground">Settings ⚙️</h2>

      <Tabs defaultValue="profile">
        <TabsList className="w-full grid grid-cols-5 bg-secondary">
          <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
          <TabsTrigger value="availability" className="text-xs">Availability</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">Alerts</TabsTrigger>
          <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
          <TabsTrigger value="about" className="text-xs">About</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4 mt-4">
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-info/10 flex items-center justify-center text-2xl font-bold text-info">
                {name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-foreground text-lg">Dr. {name}</p>
                <p className="text-sm text-muted-foreground">{specialty}</p>
              </div>
            </div>

            <div><label className={labelClass}>Full Name</label><input value={name} onChange={e => setName(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Specialization</label><input value={specialty} onChange={e => setSpecialty(e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Qualification</label><input value={qualification} onChange={e => setQualification(e.target.value)} className={inputClass} /></div>
            <div>
              <label className={labelClass}>Languages</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {languages.map(l => (
                  <span key={l} className="px-3 py-1 rounded-full bg-info/10 text-info text-xs font-medium flex items-center gap-1">
                    {l}
                    <button onClick={() => setLanguages(languages.filter(x => x !== l))} className="text-info/60 hover:text-destructive ml-1">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newLang} onChange={e => setNewLang(e.target.value)} placeholder="Add language" className={inputClass}
                  onKeyDown={e => e.key === 'Enter' && addLanguage()} />
                <button onClick={addLanguage} className="px-4 py-2 rounded-xl bg-info/10 text-info text-sm font-bold whitespace-nowrap">Add</button>
              </div>
            </div>
            <div><label className={labelClass}>Consultation Fee (₹)</label><input type="number" value={consultationFee} onChange={e => setConsultationFee(Number(e.target.value))} className={inputClass} /></div>

            <button onClick={saveProfile} disabled={saving}
              className="w-full py-3 rounded-xl bg-info text-white font-bold text-sm flex items-center justify-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Changes
            </button>
          </div>
        </TabsContent>

        <TabsContent value="availability" className="space-y-4 mt-4">
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-foreground">Online Status</p>
                <p className="text-xs text-muted-foreground">Toggle to receive patients</p>
              </div>
              <button onClick={toggleOnline}
                className={`px-6 py-2 rounded-xl text-sm font-bold ${isOnline ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {isOnline ? '🟢 Online' : '⚫ Offline'}
              </button>
            </div>
            <div><label className={labelClass}>Consultation Fee (₹)</label><input type="number" value={consultationFee} onChange={e => setConsultationFee(Number(e.target.value))} className={inputClass} /></div>
            <button onClick={saveProfile} disabled={saving}
              className="w-full py-3 rounded-xl bg-info text-white font-bold text-sm">
              Save Availability
            </button>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 mt-4">
          <div className="glass-card p-6 space-y-4">
            {[
              { label: "🔴 Emergency call alerts", defaultOn: true },
              { label: "📹 New appointment alerts", defaultOn: true },
              { label: "💊 Prescription reminders", defaultOn: true },
              { label: "📊 Daily summary", defaultOn: false },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <span className="text-sm text-foreground">{item.label}</span>
                <div className={`w-10 h-6 rounded-full flex items-center px-0.5 cursor-pointer transition-colors ${item.defaultOn ? 'bg-primary' : 'bg-secondary'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${item.defaultOn ? 'translate-x-4' : ''}`} />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-4">
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-bold text-foreground">Change Password</h3>
            <input type="password" placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputClass} />
            <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} />
            <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} />
            <button onClick={updatePassword} className="w-full py-3 rounded-xl bg-info text-white font-bold text-sm">Update Password</button>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Two-factor authentication</span>
                <span className="px-3 py-1 rounded-full bg-urgent/10 text-urgent text-xs font-bold">Coming Soon</span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="about" className="space-y-4 mt-4">
          <div className="glass-card p-6 space-y-3">
            {[
              ["Doctor ID", doctor.id.slice(0, 8)],
              ["Member since", new Date(doctor.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })],
              ["Hospital", hospitalName || "Not assigned"],
              ["Total consultations", String(totalConsultations)],
              ["Emergencies handled", String(totalEmergencies)],
              ["Registration No.", doctor.reg_number],
              ["Platform version", "MediAI v2.0"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium text-foreground">{value}</span>
              </div>
            ))}
            <button onClick={() => window.open('mailto:support@mediai.health')}
              className="w-full py-3 rounded-xl bg-secondary text-foreground font-medium text-sm mt-4">
              📧 Contact Support
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DoctorSettings;
