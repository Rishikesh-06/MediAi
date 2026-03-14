import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import EmailPasswordAuth from "@/components/auth/EmailPasswordAuth";

const AdminLogin = () => {
  const navigate = useNavigate();
  const setHospital = useAppStore(s => s.setHospital);

  const handleSuccess = async (user: any) => {
    if (!user) return;
    const { data: hosp } = await (supabase.from("hospitals") as any).select("*").eq("admin_auth_id", user.id).maybeSingle();
    if (hosp) {
      setHospital({
        id: hosp.id, name: hosp.name, location: hosp.location, district: hosp.district,
        state: hosp.state, total_beds: hosp.total_beds || 100, available_beds: hosp.available_beds || 34,
        icu_available: hosp.icu_available || 3, ambulances_total: hosp.ambulances_total || 3,
        ambulances_available: hosp.ambulances_available || 1, oxygen_count: hosp.oxygen_count || 45,
        lat: hosp.lat, lng: hosp.lng, reg_number: hosp.reg_number,
      });
      toast({ title: `Welcome to ${hosp.name}! 🏥` });
      navigate("/admin");
      return;
    }
    await supabase.auth.signOut();
    toast({ title: "No hospital found", description: "Please register your hospital first.", variant: "destructive" });
  };

  return (
    <div className="min-h-screen bg-background dot-grid flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-6">
        <div className="glass-card p-6">
          <EmailPasswordAuth
            mode="login"
            onSuccess={handleSuccess}
            title="Admin Login"
            subtitle="Hospital management portal"
            icon={<div className="w-16 h-16 rounded-2xl bg-urgent/20 flex items-center justify-center"><Building2 className="h-8 w-8 text-urgent" /></div>}
            accentClass="bg-urgent text-urgent-foreground"
          />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          New hospital?{" "}
          <button onClick={() => navigate("/admin/signup")} className="text-urgent font-semibold hover:underline">Register Hospital</button>
        </p>
        <button onClick={() => navigate("/")} className="block mx-auto text-xs text-muted-foreground hover:text-foreground">← Back to Home</button>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
