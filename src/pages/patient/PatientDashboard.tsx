import { motion } from "framer-motion";
import {
  HeartPulse, Pill, Calendar, Stethoscope, Heart, Brain,
  Salad, Bell, MapPin, Sun, MessageSquare
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const PatientDashboard = () => {
  const navigate = useNavigate();
  const patient = useAppStore((s) => s.currentPatient);
  const { t } = useTranslation();
  const [reminders, setReminders] = useState<any[]>([]);
  const [villageZone, setVillageZone] = useState<string | null>(null);
  const [villageAlert, setVillageAlert] = useState<string>("");
  const [healthScore, setHealthScore] = useState<number>(0);
  const [scoreLabel, setScoreLabel] = useState<string>("Loading...");

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return { text: t("goodMorning"), emoji: "🌅" };
    if (h < 17) return { text: t("goodAfternoon"), emoji: "👋" };
    return { text: t("goodEvening"), emoji: "🌙" };
  };

  const greeting = getGreeting();

  const quickActions = [
    { icon: HeartPulse, label: t("checkMyHealth"), path: "/patient/health-check/full-body", color: "hsl(353, 90%, 64%)" },
    { icon: MessageSquare, label: t("healthAssistant"), path: "/patient/assistant", color: "hsl(152, 100%, 45%)" },
    { icon: Pill, label: t("decodePrescription"), path: "/patient/prescriptions", color: "hsl(190, 90%, 59%)" },
    { icon: Stethoscope, label: t("bookDoctor"), path: "/patient/book-doctor", color: "hsl(37, 100%, 56%)" },
    { icon: Heart, label: t("womensHealth"), path: "/patient/health-check/womens-health", color: "hsl(340, 80%, 65%)" },
    { icon: Brain, label: t("mentalHealth"), path: "/patient/health-check/mental-health", color: "hsl(263, 86%, 76%)" },
    { icon: Salad, label: t("stayHealthy"), path: "/patient/wellness", color: "hsl(120, 60%, 50%)" },
    { icon: Bell, label: t("reminders"), path: "/patient/reminders", color: "hsl(210, 80%, 60%)" },
  ];

  const fetchHealthScore = async () => {
    if (!patient?.id) return;
    const { data: checks } = await supabase
      .from('health_checks')
      .select('ai_risk_score, ai_triage, vitals, created_at')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (!checks || checks.length === 0) {
      setHealthScore(0);
      setScoreLabel('No data yet');
      return;
    }

    const latest = checks[0];
    const riskScore = latest.ai_risk_score || 0;
    const vitals = (latest.vitals as any) || {};
    let score = 100;

    // Risk score deduction (up to 40pts)
    score -= (riskScore / 100) * 40;

    // Heart rate
    const hr = vitals.heart_rate || vitals.heartRate;
    if (hr && (hr < 50 || hr > 110)) score -= 10;

    // Blood pressure
    const sys = vitals.blood_pressure_systolic || vitals.systolic || vitals.bp_systolic;
    const dia = vitals.blood_pressure_diastolic || vitals.diastolic || vitals.bp_diastolic;
    if (sys && dia) {
      if (sys > 140 || dia > 90) score -= 10;
      else if (sys < 90 || dia < 60) score -= 8;
    }

    // SpO2
    const spo2 = vitals.oxygen_saturation || vitals.spo2 || vitals.oxygen;
    if (spo2 && spo2 < 95) score -= 8;

    // Trend from previous check
    if (checks.length >= 2) {
      const prevRisk = checks[1].ai_risk_score || 0;
      const trend = riskScore - prevRisk;
      if (trend > 10) score -= 10;
      if (trend < -10) score += 5;
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    setHealthScore(score);
    setScoreLabel(
      score >= 80 ? 'Excellent' :
      score >= 65 ? 'Good' :
      score >= 50 ? 'Fair' :
      score >= 35 ? 'Poor' : 'Critical'
    );
  };

  useEffect(() => {
    if (!patient) return;

    fetchHealthScore();

    supabase.from('medicine_reminders').select('*').eq('patient_id', patient.id).eq('is_active', true)
      .then(({ data }) => { if (data) setReminders(data); });

    // Village health data
    if (patient.village) {
      const loadVillageData = async () => {
        const { data: villagePatients } = await supabase.from('patients').select('id').eq('village', patient.village);
        if (!villagePatients?.length) return;
        const patientIds = villagePatients.map(p => p.id);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase.from('emergencies').select('*', { count: 'exact', head: true })
          .in('patient_id', patientIds).gte('created_at', thirtyDaysAgo);
        const emgCount = count || 0;
        if (emgCount >= 3) { setVillageZone('red'); setVillageAlert(`${emgCount} emergencies reported this month. Stay alert.`); }
        else if (emgCount >= 1) { setVillageZone('orange'); setVillageAlert(`${emgCount} emergency reported recently. Stay cautious.`); }
        else { setVillageZone('green'); setVillageAlert('No recent emergencies. Keep up the good health!'); }
      };
      loadVillageData();
    }

    // Realtime: update score on new health check
    const channel = supabase
      .channel('score-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'health_checks' }, fetchHealthScore)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [patient]);

  const name = patient?.name || "Guest";
  const score = healthScore;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-4xl mx-auto">
      <motion.div variants={fadeUp}>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground">
          {greeting.text}, {name.split(' ')[0]}! {greeting.emoji}
        </h1>
      </motion.div>

      <motion.div variants={fadeUp} className="glass-card p-6 flex items-center gap-6">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(156, 35%, 17%)" strokeWidth="8" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(152, 100%, 45%)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 264} ${264}`} className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-2xl font-bold text-primary">{score}</span>
          </div>
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">{t("healthScore")}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {score === 0 ? "📊 " + scoreLabel : score >= 80 ? "✅ " + scoreLabel : score >= 65 ? "✅ " + scoreLabel : score >= 50 ? "⚠️ " + scoreLabel : "🔴 " + scoreLabel}
          </p>
        </div>
      </motion.div>

      {reminders.length > 0 && (
        <motion.div variants={fadeUp} className="glass-card p-4 border-urgent/30 flex items-center gap-3 cursor-pointer" onClick={() => navigate('/patient/reminders')}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsla(37, 100%, 56%, 0.15)" }}>
            <Bell className="h-5 w-5 text-urgent" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{t("medicineReminder")}</p>
            <p className="text-xs text-muted-foreground">{reminders[0]?.medicine_name} — {reminders.length} active</p>
          </div>
          <span className="text-xs font-semibold text-primary">→</span>
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <h3 className="font-display text-lg font-bold text-foreground mb-3">{t("quickActions")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <motion.button key={action.label} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate(action.path)}
              className="glass-card-hover p-4 flex flex-col items-center gap-2 text-center min-h-[100px] justify-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${action.color}15` }}>
                <action.icon className="h-6 w-6" style={{ color: action.color }} />
              </div>
              <span className="text-xs font-medium text-foreground">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {patient?.village && villageZone && (
        <motion.div variants={fadeUp} className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <MapPin className="h-5 w-5 text-urgent" />
            <h3 className="font-display text-lg font-bold text-foreground">{t("villageHealth")}</h3>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className={villageZone === 'red' ? 'badge-emergency text-xs' : villageZone === 'orange' ? 'badge-urgent text-xs' : 'badge-safe text-xs'}>
              {villageZone === 'red' ? '🔴 Red Zone' : villageZone === 'orange' ? '🟠 Orange Zone' : '🟢 Green Zone'}
            </span>
            <span className="text-sm text-foreground">{patient.village}</span>
          </div>
          <p className="text-sm text-muted-foreground">{villageAlert}</p>
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="glass-card p-5 glow-border">
        <div className="flex items-center gap-2 mb-2">
          <Sun className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-primary">{t("dailyHealthTip")}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Drink at least 8 glasses of water daily. Add a pinch of salt and lemon for natural electrolytes. 🍋
        </p>
      </motion.div>
    </motion.div>
  );
};

export default PatientDashboard;
