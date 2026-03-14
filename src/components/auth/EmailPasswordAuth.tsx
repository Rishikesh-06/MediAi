import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface EmailPasswordAuthProps {
  mode: "login" | "signup";
  onSuccess: (user: any) => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accentClass?: string;
  extraFields?: React.ReactNode;
  onBeforeSubmit?: () => string | null; // return error string or null
}

const EmailPasswordAuth = ({
  mode,
  onSuccess,
  title,
  subtitle,
  icon,
  accentClass = "bg-primary text-primary-foreground",
  extraFields,
  onBeforeSubmit,
}: EmailPasswordAuthProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async () => {
    setError("");

    if (!isValidEmail(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (onBeforeSubmit) {
      const err = onBeforeSubmit();
      if (err) { setError(err); return; }
    }

    setLoading(true);
    const trimmedEmail = email.toLowerCase().trim();

    try {
      if (mode === "login") {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (authErr) {
          setError("Invalid email or password");
          setLoading(false);
          return;
        }
        onSuccess(data.user);
      } else {
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
        onSuccess(data.user);
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    }
    setLoading(false);
  };

  const inputCls =
    "flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm";

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        {icon && <div className="flex justify-center mb-3">{icon}</div>}
        <h2 className="font-display text-xl font-bold text-foreground">
          {title || (mode === "login" ? "Welcome Back" : "Create Account")}
        </h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="space-y-3">
        <div className="glass-card p-1">
          <div className="flex items-center gap-3 px-4 py-3">
            <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="yourname@gmail.com"
              autoComplete="email"
              className={inputCls}
            />
          </div>
        </div>

        <div className="glass-card p-1">
          <div className="flex items-center gap-3 px-4 py-3">
            <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Password (min 6 characters)"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className={inputCls}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {mode === "signup" && (
          <div className="glass-card p-1">
            <div className="flex items-center gap-3 px-4 py-3">
              <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Confirm password"
                autoComplete="new-password"
                className={inputCls}
              />
            </div>
          </div>
        )}

        {extraFields}
      </div>

      {error && <p className="text-xs text-destructive text-center">{error}</p>}

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleSubmit}
        disabled={loading}
        className={`w-full py-4 rounded-xl font-display font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 ${accentClass}`}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === "login" ? "Login" : "Create Account"}
      </motion.button>
    </div>
  );
};

export default EmailPasswordAuth;
