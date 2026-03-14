import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { setPatient, setDoctor, setHospital } = useAppStore();
  const [error, setError] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase client auto-detects session from URL hash/params
        const { data: { session }, error: sessErr } = await supabase.auth.getSession();
        
        if (sessErr || !session?.user) {
          setError("Authentication failed. Please try again.");
          setTimeout(() => navigate("/"), 3000);
          return;
        }

        const uid = session.user.id;

        // Check user type in parallel
        const [doctorRes, hospitalRes, patientRes] = await Promise.all([
          supabase.from("doctors").select("*").eq("auth_id", uid).maybeSingle(),
          supabase.from("hospitals").select("*").eq("admin_auth_id", uid).maybeSingle(),
          supabase.from("patients").select("*").eq("auth_user_id", uid).maybeSingle(),
        ]);

        if (doctorRes.data) {
          setDoctor(doctorRes.data as any);
          navigate("/doctor", { replace: true });
        } else if (hospitalRes.data) {
          setHospital(hospitalRes.data as any);
          navigate("/admin", { replace: true });
        } else if (patientRes.data) {
          setPatient(patientRes.data as any);
          navigate("/patient", { replace: true });
        } else {
          // New user — default to patient signup
          navigate("/patient/signup", { replace: true });
        }
      } catch (e: any) {
        console.error("Auth callback error:", e);
        setError("Something went wrong. Redirecting...");
        setTimeout(() => navigate("/"), 3000);
      }
    };

    handleCallback();
  }, [navigate, setPatient, setDoctor, setHospital]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {error ? (
          <p className="text-destructive">{error}</p>
        ) : (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Verifying your login...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
