import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Loader2, MapPin, CheckCircle, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

const indianStates = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
];

const AdminSignup = () => {
  const navigate = useNavigate();
  const setHospital = useAppStore(s => s.setHospital);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Hospital
  const [hospName, setHospName] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("Rajasthan");
  const [hospPhone, setHospPhone] = useState("");
  const [adminName, setAdminName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [totalBeds, setTotalBeds] = useState("");
  const [ambulances, setAmbulances] = useState("");
  const [detectingLoc, setDetectingLoc] = useState(false);

  const detectLocation = () => {
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude.toFixed(4)); setLng(pos.coords.longitude.toFixed(4)); setDetectingLoc(false); toast({ title: "📍 Location detected!" }); },
      () => { setDetectingLoc(false); toast({ title: "Could not detect location", variant: "destructive" }); }
    );
  };

  const handleRegister = async () => {
    setError("");
    if (!adminName || !email || !hospName || !address || !district) { setError("Fill all required fields"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);
    const trimmedEmail = email.toLowerCase().trim();

    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({ email: trimmedEmail, password });
      if (authErr) { setError(authErr.message); setLoading(false); return; }
      if (authData.user?.identities?.length === 0) { setError("Email already registered. Please login."); setLoading(false); return; }

      const { data: hosp, error: insertErr } = await (supabase.from("hospitals") as any).insert({
        name: hospName, location: address, district, state,
        admin_auth_id: authData.user!.id, admin_email: trimmedEmail, admin_name: adminName,
        lat: lat ? parseFloat(lat) : null, lng: lng ? parseFloat(lng) : null,
        is_registered: true, total_beds: parseInt(totalBeds) || 0, available_beds: parseInt(totalBeds) || 0,
        ambulances_available: parseInt(ambulances) || 0, ambulances_total: parseInt(ambulances) || 0,
      }).select().single();
      if (insertErr) throw insertErr;

      setHospital({
        id: hosp.id, name: hosp.name, location: hosp.location, district: hosp.district,
        state: hosp.state, total_beds: hosp.total_beds || 0, available_beds: hosp.available_beds || 0,
        icu_available: hosp.icu_available || 0, ambulances_total: hosp.ambulances_total || 0,
        ambulances_available: hosp.ambulances_available || 0, oxygen_count: hosp.oxygen_count || 0,
        lat: hosp.lat, lng: hosp.lng, reg_number: hosp.reg_number,
      });
      toast({ title: `${hospName} registered! 🏥` });
      navigate("/admin");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    }
    setLoading(false);
  };

  const inputCls = "w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-urgent/50";

  return (
    <div className="min-h-screen bg-background dot-grid flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-urgent/20 flex items-center justify-center mx-auto mb-3">
            <Building2 className="h-8 w-8 text-urgent" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Register Hospital</h1>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-thin">
          <h3 className="font-display text-lg font-bold text-foreground">Admin Account</h3>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground">Admin Name *</label><input value={adminName} onChange={e => setAdminName(e.target.value)} className={inputCls} placeholder="Your full name" /></div>
            <div><label className="text-xs text-muted-foreground">Email *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="admin@hospital.com" /></div>
            <div><label className="text-xs text-muted-foreground">Password *</label><input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className={inputCls} placeholder="Min 6 characters" /></div>
            <div><label className="text-xs text-muted-foreground">Confirm Password *</label><input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} /></div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={showPassword} onChange={() => setShowPassword(!showPassword)} /> Show passwords
            </label>
          </div>

          <h3 className="font-display text-lg font-bold text-foreground pt-2">Hospital Details</h3>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground">Hospital Name *</label><input value={hospName} onChange={e => setHospName(e.target.value)} className={inputCls} placeholder="PHC Bassi" /></div>
            <div><label className="text-xs text-muted-foreground">Full Address *</label><input value={address} onChange={e => setAddress(e.target.value)} className={inputCls} placeholder="Bassi, Jaipur" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">District *</label><input value={district} onChange={e => setDistrict(e.target.value)} className={inputCls} /></div>
              <div><label className="text-xs text-muted-foreground">State</label><select value={state} onChange={e => setState(e.target.value)} className={inputCls}>{indianStates.map(s => <option key={s}>{s}</option>)}</select></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Hospital Phone</label><input value={hospPhone} onChange={e => setHospPhone(e.target.value)} className={inputCls} /></div>
          </div>

          <h3 className="font-display text-lg font-bold text-foreground pt-2">Location</h3>
          <motion.button whileTap={{ scale: 0.95 }} onClick={detectLocation} disabled={detectingLoc}
            className="w-full py-3 rounded-xl bg-secondary text-foreground font-medium flex items-center justify-center gap-2">
            {detectingLoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            {lat ? `📍 ${lat}, ${lng}` : "Detect Location"}
          </motion.button>

          <h3 className="font-display text-lg font-bold text-foreground pt-2">Resources (optional)</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">Total Beds</label><input type="number" value={totalBeds} onChange={e => setTotalBeds(e.target.value)} className={inputCls} /></div>
            <div><label className="text-xs text-muted-foreground">Ambulances</label><input type="number" value={ambulances} onChange={e => setAmbulances(e.target.value)} className={inputCls} /></div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <motion.button whileTap={{ scale: 0.95 }} onClick={handleRegister} disabled={loading}
            className="w-full py-4 rounded-xl bg-urgent text-urgent-foreground font-display font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />} Register Hospital
          </motion.button>
        </motion.div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Already registered?{" "}
          <button onClick={() => navigate("/admin/login")} className="text-urgent font-semibold hover:underline">Login</button>
        </p>
        <button onClick={() => navigate("/")} className="block mx-auto mt-3 text-xs text-muted-foreground hover:text-foreground">← Back to Home</button>
      </motion.div>
    </div>
  );
};

export default AdminSignup;
