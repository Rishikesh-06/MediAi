import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, Loader2, ChevronRight, ChevronLeft, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import i18n from "@/i18n";

const languageOptions = [
  { code: "en", native: "English", english: "English" },
  { code: "hi", native: "हिंदी", english: "Hindi" },
  { code: "te", native: "తెలుగు", english: "Telugu" },
];
const indianStates = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
];
const bloodGroups = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];
const chronicConditions = ["Diabetes","Hypertension","Heart Disease","Asthma","Thyroid","Kidney Disease","Cancer","Arthritis","PCOD","Other"];

const PatientSignup = () => {
  const navigate = useNavigate();
  const { setPatient, setLanguage } = useAppStore();

  const [step, setStep] = useState(0); // 0=language, 1=account+profile, 2=medical
  const [loading, setLoading] = useState(false);
  const [selectedLang, setSelectedLang] = useState("");
  const [error, setError] = useState("");

  // Account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Profile
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("Rajasthan");
  const [bloodGroup, setBloodGroup] = useState("");

  // Medical
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRelation, setContactRelation] = useState("Spouse");

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const validateStep1 = () => {
    if (!name || !age || !gender || !village) return "Fill all required fields";
    if (!isValidEmail(email.trim())) return "Enter a valid email";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (password !== confirmPassword) return "Passwords do not match";
    return null;
  };

  const handleCreateAccount = async () => {
    setLoading(true);
    setError("");
    const trimmedEmail = email.toLowerCase().trim();

    try {
      const { data, error: authErr } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });
      if (authErr) {
        if (authErr.message.includes("already")) {
          setError("Email already registered. Please login instead.");
        } else {
          setError(authErr.message);
        }
        setLoading(false);
        return;
      }
      if (data.user?.identities?.length === 0) {
        setError("Email already registered. Please login instead.");
        setLoading(false);
        return;
      }

      const { data: patient, error: insertErr } = await supabase.from("patients").insert({
        auth_user_id: data.user!.id,
        email: trimmedEmail,
        name,
        phone: phone || null,
        age: parseInt(age) || 25,
        gender,
        village,
        district: district || "Unknown",
        aadhaar_last4: "",
        blood_group: bloodGroup || null,
        preferred_language: selectedLang || "en",
        medical_history: { conditions, allergies },
        emergency_contacts: contactName ? [{ name: contactName, phone: contactPhone, relationship: contactRelation }] : [],
        health_score: 75,
      }).select().single();

      if (insertErr) throw insertErr;

      setPatient(patient as any);
      setLanguage(selectedLang || "en");
      toast({ title: `Welcome to MediAI, ${name}! 🎉` });
      navigate("/patient");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    }
    setLoading(false);
  };

  const inputCls = "w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="min-h-screen bg-background dot-grid flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Activity className="h-7 w-7 text-primary" />
          <span className="font-display text-xl font-extrabold text-foreground">Medi<span className="text-primary">AI</span></span>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {[0, 1, 2].map(i => (
            <div key={i} className={`w-3 h-3 rounded-full transition-all ${step === i ? "bg-primary scale-125" : step > i ? "bg-primary/50" : "bg-secondary"}`} />
          ))}
        </div>

        {/* Step 0: Language */}
        {step === 0 && (
          <motion.div key="lang" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 space-y-6">
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-foreground">Choose Your Language</h2>
              <p className="text-muted-foreground text-sm mt-1">अपनी भाषा चुनें | మీ భాషను ఎంచుకోండి</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {languageOptions.map(l => (
                <motion.button key={l.code} whileTap={{ scale: 0.95 }} onClick={() => { setSelectedLang(l.code); i18n.changeLanguage(l.code); }}
                  className={`p-4 rounded-xl text-center transition-all border-2 ${selectedLang === l.code ? "border-primary bg-primary/10 shadow-[0_0_20px_hsla(152,100%,45%,0.3)]" : "border-border bg-secondary/50 hover:border-primary/40"}`}>
                  <span className="text-2xl">🇮🇳</span>
                  <p className="font-bold text-foreground text-lg mt-1">{l.native}</p>
                  <p className="text-xs text-muted-foreground">{l.english}</p>
                </motion.button>
              ))}
            </div>
            {selectedLang && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setStep(1)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2">
                Continue <ChevronRight className="h-4 w-4" />
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Step 1: Account + Profile */}
        {step === 1 && (
          <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <h2 className="font-display text-xl font-bold text-foreground">Create Your Account</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Full Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} className={inputCls}
                  placeholder={selectedLang === "hi" ? "आपका पूरा नाम" : selectedLang === "te" ? "మీ పూర్తి పేరు" : "Your full name"} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email Address *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="yourname@gmail.com" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Password * (min 6 characters)</label>
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className={inputCls} placeholder="••••••" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Confirm Password *</label>
                <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} placeholder="••••••" />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={showPassword} onChange={() => setShowPassword(!showPassword)} /> Show passwords
              </label>
              <div className="border-t border-border pt-3" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Age *</label>
                  <input type="number" value={age} onChange={e => setAge(e.target.value)} className={inputCls} min={1} max={120} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Gender *</label>
                  <div className="flex gap-1.5 mt-1">
                    {["Male", "Female", "Other"].map(g => (
                      <button key={g} onClick={() => setGender(g)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium ${gender === g ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Phone (optional)</label>
                <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className={inputCls} placeholder="9876543210" inputMode="numeric" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Village / Town *</label>
                  <input value={village} onChange={e => setVillage(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">District</label>
                  <input value={district} onChange={e => setDistrict(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">State</label>
                <select value={state} onChange={e => setState(e.target.value)} className={inputCls}>
                  {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Blood Group</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {bloodGroups.map(bg => (
                    <button key={bg} onClick={() => setBloodGroup(bg)}
                      className={`px-3 py-1.5 rounded-lg text-xs ${bloodGroup === bg ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                      {bg}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="px-4 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm flex items-center gap-1">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button onClick={() => { const err = validateStep1(); if (err) { setError(err); return; } setError(""); setStep(2); }}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Medical + Emergency + Submit */}
        {step === 2 && (
          <motion.div key="medical" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground">Health & Emergency Info</h2>
            <p className="text-xs text-muted-foreground">Optional — you can skip this</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Chronic Conditions</label>
                <div className="flex flex-wrap gap-2">
                  {chronicConditions.map(c => (
                    <button key={c} onClick={() => setConditions(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])}
                      className={`px-3 py-1.5 rounded-full text-xs ${conditions.includes(c) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Allergies</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {allergies.map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs">
                      {a} <button onClick={() => setAllergies(p => p.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={allergyInput} onChange={e => setAllergyInput(e.target.value)} placeholder="Add allergy" className={`flex-1 ${inputCls}`} />
                  <button onClick={() => { if (allergyInput.trim()) { setAllergies(p => [...p, allergyInput.trim()]); setAllergyInput(""); } }}
                    className="px-3 py-2 rounded-xl bg-primary text-primary-foreground"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <label className="text-xs text-muted-foreground mb-2 block">Emergency Contact</label>
                <div className="space-y-2">
                  <input value={contactName} onChange={e => setContactName(e.target.value)} className={inputCls} placeholder="Contact name" />
                  <input value={contactPhone} onChange={e => setContactPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className={inputCls} placeholder="Contact phone" inputMode="numeric" />
                  <select value={contactRelation} onChange={e => setContactRelation(e.target.value)} className={inputCls}>
                    {["Spouse", "Parent", "Child", "Sibling", "Friend"].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-4 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm flex items-center gap-1">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button onClick={handleCreateAccount} disabled={loading}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create My Account 🎉"}
              </button>
            </div>
            <button onClick={handleCreateAccount} disabled={loading} className="w-full text-center text-xs text-muted-foreground hover:text-primary">
              Skip & Create Account →
            </button>
          </motion.div>
        )}

        {step <= 1 && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <button onClick={() => navigate("/patient/login")} className="text-primary font-semibold hover:underline">Login</button>
          </p>
        )}
        <button onClick={() => navigate("/")} className="block mx-auto mt-3 text-xs text-muted-foreground hover:text-foreground">← Back to Home</button>
      </motion.div>
    </div>
  );
};

export default PatientSignup;
