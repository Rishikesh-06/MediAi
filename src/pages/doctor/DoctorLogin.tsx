import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import EmailPasswordAuth from "@/components/auth/EmailPasswordAuth";

const DoctorLogin = () => {
  const navigate = useNavigate();
  const setDoctor = useAppStore(s => s.setDoctor);

  const handleSuccess = async (user: any) => {
    if (!user) return;
    let { data: doc } = await (supabase.from("doctors") as any).select("*").eq("auth_id", user.id).maybeSingle();
    if (!doc) {
      const { data: docByEmail } = await (supabase.from("doctors") as any).select("*").eq("email", user.email).maybeSingle();
      if (docByEmail) {
        await (supabase.from("doctors") as any).update({ auth_id: user.id }).eq("id", docByEmail.id);
        doc = docByEmail;
      }
    }
    if (!doc) {
      await supabase.auth.signOut();
      toast({ title: "❌ Not registered as doctor", description: "Contact your hospital admin.", variant: "destructive" });
      return;
    }
    setDoctor({
      id: doc.id, name: doc.name, reg_number: doc.reg_number,
      specialty: doc.specialty, hospital_id: doc.hospital_id || "",
      rating: doc.rating || 4.8, is_online: doc.is_online || false,
      earnings_today: doc.earnings_today || 0, patients_today: doc.patients_today || 0,
    });
    toast({ title: `Welcome, Dr. ${doc.name}! 🩺` });
    navigate("/doctor");
  };

  return (
    <div className="min-h-screen bg-background dot-grid flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-6">
        <div className="glass-card p-6">
          <EmailPasswordAuth
            mode="login"
            onSuccess={handleSuccess}
            title="Doctor Login"
            subtitle="Enter your registered credentials"
            icon={<div className="w-16 h-16 rounded-2xl bg-info/20 flex items-center justify-center"><Stethoscope className="h-8 w-8 text-info" /></div>}
            accentClass="bg-info text-info-foreground"
          />
        </div>
        <p className="text-center text-xs text-muted-foreground">Contact hospital admin for registration</p>
        <button onClick={() => navigate("/")} className="block mx-auto text-xs text-muted-foreground hover:text-foreground">← Back to Home</button>
      </motion.div>
    </div>
  );
};

export default DoctorLogin;
