import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import i18n from "@/i18n";
import EmailPasswordAuth from "@/components/auth/EmailPasswordAuth";

const PatientLogin = () => {
  const navigate = useNavigate();
  const { setPatient, setLanguage } = useAppStore();

  const handleSuccess = async (user: any) => {
    if (!user) return;
    const { data: patient } = await supabase
      .from("patients")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (patient) {
      setPatient(patient as any);
      const lang = (patient as any).preferred_language || "en";
      i18n.changeLanguage(lang);
      setLanguage(lang);
      toast({ title: "Welcome back! ✅" });
      navigate("/patient");
    } else {
      toast({ title: "No patient profile found", description: "Please sign up first.", variant: "destructive" });
      await supabase.auth.signOut();
    }
  };

  return (
    <div className="min-h-screen bg-background dot-grid flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Activity className="h-7 w-7 text-primary" />
          <span className="font-display text-xl font-extrabold text-foreground">
            Medi<span className="text-primary">AI</span>
          </span>
        </div>
        <div className="glass-card p-6">
          <EmailPasswordAuth
            mode="login"
            onSuccess={handleSuccess}
            title="Welcome Back"
            subtitle="Login with your email and password"
            icon={
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Heart className="h-7 w-7 text-primary" />
              </div>
            }
          />
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          New to MediAI?{" "}
          <button onClick={() => navigate("/patient/signup")} className="text-primary font-semibold hover:underline">
            Sign Up
          </button>
        </p>
        <button onClick={() => navigate("/")} className="block mx-auto mt-3 text-xs text-muted-foreground hover:text-foreground">
          ← Back to Home
        </button>
      </motion.div>
    </div>
  );
};

export default PatientLogin;
