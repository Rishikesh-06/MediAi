import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Trophy, Download, Loader2, TrendingUp, TrendingDown, Minus, Users, Activity, HeartPulse } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

interface VillageData {
  name: string;
  district: string;
  patientCount: number;
  healthCheckCount: number;
  emergencyCount: number;
  avgRisk: number;
  healthScore: number;
  trend: "up" | "stable" | "down";
}

const Leaderboard = () => {
  const [villages, setVillages] = useState<VillageData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: patients }, { data: healthChecks }, { data: emergencies }] = await Promise.all([
        supabase.from("patients").select("id, village, district").not("village", "is", null).neq("village", ""),
        supabase.from("health_checks").select("id, patient_id, ai_risk_score, ai_triage, created_at").order("created_at", { ascending: false }),
        supabase.from("emergencies").select("patient_id, status"),
      ]);

      if (!patients || patients.length === 0) {
        setVillages([]);
        setLoading(false);
        return;
      }

      const villageMap: Record<string, {
        name: string; district: string; patientCount: number;
        totalRiskScore: number; healthCheckCount: number; emergencyCount: number;
        lowRiskCount: number; patientIds: string[];
      }> = {};

      patients.forEach((p) => {
        const v = p.village.trim();
        if (!villageMap[v]) {
          villageMap[v] = {
            name: v, district: p.district || "", patientCount: 0,
            totalRiskScore: 0, healthCheckCount: 0, emergencyCount: 0,
            lowRiskCount: 0, patientIds: [],
          };
        }
        villageMap[v].patientCount++;
        villageMap[v].patientIds.push(p.id);
      });

      if (healthChecks) {
        healthChecks.forEach((hc) => {
          Object.values(villageMap).forEach((v) => {
            if (v.patientIds.includes(hc.patient_id)) {
              v.healthCheckCount++;
              v.totalRiskScore += hc.ai_risk_score || 0;
              if (hc.ai_triage === "low" || (hc.ai_risk_score !== null && hc.ai_risk_score < 40)) v.lowRiskCount++;
            }
          });
        });
      }

      if (emergencies) {
        emergencies.forEach((e) => {
          Object.values(villageMap).forEach((v) => {
            if (v.patientIds.includes(e.patient_id)) v.emergencyCount++;
          });
        });
      }

      const villageList: VillageData[] = Object.values(villageMap)
        .map((v) => {
          const avgRisk = v.healthCheckCount > 0 ? v.totalRiskScore / v.healthCheckCount : 50;
          const lowRiskPct = v.healthCheckCount > 0 ? (v.lowRiskCount / v.healthCheckCount) * 100 : 0;

          let score = 50;
          if (avgRisk < 40) score += 20;
          else if (avgRisk < 60) score += 10;
          else score -= 10;

          if (v.healthCheckCount >= 3) score += 15;
          else if (v.healthCheckCount >= 1) score += 8;

          score -= v.emergencyCount * 8;

          if (lowRiskPct >= 70) score += 15;
          else if (lowRiskPct >= 50) score += 8;

          score = Math.max(10, Math.min(100, Math.round(score)));

          return {
            name: v.name,
            district: v.district,
            patientCount: v.patientCount,
            healthCheckCount: v.healthCheckCount,
            emergencyCount: v.emergencyCount,
            avgRisk: Math.round(avgRisk),
            healthScore: score,
            trend: score >= 70 ? "up" as const : score >= 50 ? "stable" as const : "down" as const,
          };
        })
        .sort((a, b) => b.healthScore - a.healthScore);

      setVillages(villageList);
    } catch (err) {
      console.error("Leaderboard error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboardData();
    const channel = supabase
      .channel("leaderboard-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, fetchLeaderboardData)
      .on("postgres_changes", { event: "*", schema: "public", table: "health_checks" }, fetchLeaderboardData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeaderboardData]);

  const scoreColor = (s: number) => s >= 70 ? "text-primary" : s >= 40 ? "text-yellow-400" : "text-destructive";
  const scoreBarColor = (s: number) => s >= 70 ? "bg-primary" : s >= 40 ? "bg-yellow-400" : "bg-destructive";
  const statusBadge = (s: number) => {
    if (s >= 70) return { label: "Healthy", emoji: "💚", cls: "bg-primary/15 text-primary" };
    if (s >= 40) return { label: "Moderate", emoji: "💛", cls: "bg-yellow-400/15 text-yellow-500" };
    return { label: "At Risk", emoji: "🔴", cls: "bg-destructive/15 text-destructive" };
  };

  const totalPatients = villages.reduce((s, v) => s + v.patientCount, 0);
  const totalChecks = villages.reduce((s, v) => s + v.healthCheckCount, 0);

  const downloadCert = (v: VillageData) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 800; canvas.height = 600;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#0a1f15"; ctx.fillRect(0, 0, 800, 600);
      ctx.strokeStyle = "#00e87a"; ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 760, 560);
      ctx.strokeRect(30, 30, 740, 540);
      ctx.fillStyle = "#00e87a"; ctx.font = "bold 36px serif";
      ctx.textAlign = "center";
      ctx.fillText("🏆 Certificate of Health Excellence", 400, 100);
      ctx.fillStyle = "#e0f5ec"; ctx.font = "20px sans-serif";
      ctx.fillText("This certifies that", 400, 180);
      ctx.fillStyle = "#00e87a"; ctx.font = "bold 40px serif";
      ctx.fillText(v.name, 400, 240);
      ctx.fillStyle = "#e0f5ec"; ctx.font = "18px sans-serif";
      ctx.fillText(`District: ${v.district}`, 400, 290);
      ctx.fillText("has been recognized as the", 400, 340);
      ctx.fillStyle = "#ffd700"; ctx.font = "bold 30px serif";
      ctx.fillText("Healthiest Village of March 2026", 400, 390);
      ctx.fillStyle = "#e0f5ec"; ctx.font = "16px sans-serif";
      ctx.fillText("by MediAI — AI-Powered Healthcare Platform", 400, 440);
      ctx.fillText(`Health Score: ${v.healthScore} | Patients: ${v.patientCount} | Checks: ${v.healthCheckCount}`, 400, 490);
      ctx.fillStyle = "#555"; ctx.font = "14px sans-serif";
      ctx.fillText("Presented by Team EliteOrbit", 400, 550);
      const link = document.createElement("a");
      link.download = `${v.name}_Certificate.png`;
      link.href = canvas.toDataURL();
      link.click();
      toast({ title: "Certificate downloaded!" });
    } catch { toast({ title: "Download failed", variant: "destructive" }); }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground flex items-center gap-2">
        <Trophy className="h-7 w-7 text-yellow-400" /> Healthiest Villages
      </h1>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="h-5 rounded bg-muted w-2/3 mb-2" />
            <div className="h-4 rounded bg-muted w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );

  if (villages.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground flex items-center gap-2">
          <Trophy className="h-7 w-7 text-yellow-400" /> Healthiest Villages
        </h1>
        <div className="glass-card p-12 text-center">
          <p className="text-4xl mb-4">🏘️</p>
          <p className="text-foreground font-bold text-lg">No villages registered yet</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            When patients sign up with their village name, rankings will appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  const top = villages[0];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-4xl mx-auto p-4 md:p-8">
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-foreground flex items-center gap-2">
          <Trophy className="h-7 w-7 text-yellow-400" /> Healthiest Villages
        </h1>
        <p className="text-sm text-muted-foreground">Real-time village health rankings based on patient data</p>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
        {[
          { icon: <Users className="h-4 w-4 text-primary" />, label: "Villages Tracked", val: villages.length },
          { icon: <HeartPulse className="h-4 w-4 text-primary" />, label: "Total Patients", val: totalPatients },
          { icon: <Activity className="h-4 w-4 text-primary" />, label: "Health Checks", val: totalChecks },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <div className="flex justify-center mb-1">{s.icon}</div>
            <p className="font-mono text-xl font-bold text-foreground">{s.val}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Top Village / Podium */}
      {villages.length >= 3 ? (
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3 items-end">
          {/* #2 Silver */}
          <div className="glass-card p-4 text-center border-border/50">
            <p className="text-3xl mb-1">🥈</p>
            <p className="font-bold text-foreground text-sm truncate">{villages[1].name}</p>
            <p className="text-xs text-muted-foreground truncate">{villages[1].district}</p>
            <p className={`font-mono text-2xl font-extrabold mt-2 ${scoreColor(villages[1].healthScore)}`}>{villages[1].healthScore}</p>
            <div className="w-full h-1.5 rounded-full bg-muted mt-2">
              <div className={`h-1.5 rounded-full ${scoreBarColor(villages[1].healthScore)}`} style={{ width: `${villages[1].healthScore}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{villages[1].patientCount} patients</p>
          </div>
          {/* #1 Gold */}
          <div className="glass-card p-5 text-center border-yellow-500/30 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, hsla(45,100%,50%,0.08), hsla(152,100%,45%,0.05))" }}>
            <motion.p animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2.5 }} className="text-4xl mb-1">🥇</motion.p>
            <p className="font-bold text-foreground text-base truncate">{top.name}</p>
            <p className="text-xs text-muted-foreground truncate">{top.district}</p>
            <p className={`font-mono text-3xl font-extrabold mt-2 ${scoreColor(top.healthScore)}`}>{top.healthScore}</p>
            <div className="w-full h-2 rounded-full bg-muted mt-2">
              <div className={`h-2 rounded-full ${scoreBarColor(top.healthScore)}`} style={{ width: `${top.healthScore}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{top.patientCount} patients</p>
            <button onClick={() => downloadCert(top)}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs mx-auto">
              <Download className="h-3.5 w-3.5" /> Certificate
            </button>
          </div>
          {/* #3 Bronze */}
          <div className="glass-card p-4 text-center border-border/50">
            <p className="text-3xl mb-1">🥉</p>
            <p className="font-bold text-foreground text-sm truncate">{villages[2].name}</p>
            <p className="text-xs text-muted-foreground truncate">{villages[2].district}</p>
            <p className={`font-mono text-2xl font-extrabold mt-2 ${scoreColor(villages[2].healthScore)}`}>{villages[2].healthScore}</p>
            <div className="w-full h-1.5 rounded-full bg-muted mt-2">
              <div className={`h-1.5 rounded-full ${scoreBarColor(villages[2].healthScore)}`} style={{ width: `${villages[2].healthScore}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{villages[2].patientCount} patients</p>
          </div>
        </motion.div>
      ) : (
        /* Single top village highlight when < 3 villages */
        <motion.div variants={fadeUp} className="glass-card p-6 border-yellow-500/30 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, hsla(45,100%,50%,0.08), hsla(152,100%,45%,0.05))" }}>
          <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 3 }}
            className="absolute top-4 right-4 text-5xl">🏆</motion.div>
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary/15 text-primary mb-2 inline-block">Village of the Month</span>
          <h2 className="font-display text-3xl font-extrabold text-foreground">{top.name}</h2>
          <p className="text-sm text-muted-foreground">{top.district}</p>
          <div className="flex gap-6 mt-4">
            <div><span className={`font-mono text-2xl font-bold ${scoreColor(top.healthScore)}`}>{top.healthScore}</span><p className="text-xs text-muted-foreground">Health Score</p></div>
            <div><span className="font-mono text-2xl font-bold text-foreground">{top.patientCount}</span><p className="text-xs text-muted-foreground">Patients</p></div>
            <div><span className="font-mono text-2xl font-bold text-foreground">{top.healthCheckCount}</span><p className="text-xs text-muted-foreground">Checks</p></div>
          </div>
          <button onClick={() => downloadCert(top)}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm">
            <Download className="h-4 w-4" /> Download Certificate
          </button>
        </motion.div>
      )}

      {/* Full Rankings Table */}
      <motion.div variants={fadeUp} className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-3 text-muted-foreground font-medium">Rank</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Village</th>
                <th className="text-right p-3 text-muted-foreground font-medium">Patients</th>
                <th className="text-right p-3 text-muted-foreground font-medium">Score</th>
                <th className="text-right p-3 text-muted-foreground font-medium hidden md:table-cell">Checks</th>
                <th className="text-center p-3 text-muted-foreground font-medium">Status</th>
                <th className="text-center p-3 text-muted-foreground font-medium hidden md:table-cell">Trend</th>
              </tr>
            </thead>
            <tbody>
              {villages.map((v, i) => {
                const badge = statusBadge(v.healthScore);
                return (
                  <tr key={v.name} className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
                    <td className="p-3">
                      <span className="font-bold text-foreground">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-foreground">{v.name}</p>
                      <p className="text-xs text-muted-foreground">{v.district}</p>
                    </td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-secondary text-foreground">{v.patientCount}</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-mono font-bold ${scoreColor(v.healthScore)}`}>{v.healthScore}</span>
                      <div className="w-16 h-1.5 rounded-full bg-muted mt-1 ml-auto">
                        <div className={`h-1.5 rounded-full ${scoreBarColor(v.healthScore)}`} style={{ width: `${v.healthScore}%` }} />
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-foreground hidden md:table-cell">{v.healthCheckCount}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${badge.cls}`}>
                        {badge.emoji} {badge.label}
                      </span>
                    </td>
                    <td className="p-3 text-center hidden md:table-cell">
                      {v.trend === "up" ? <TrendingUp className="h-4 w-4 text-primary inline" /> :
                       v.trend === "down" ? <TrendingDown className="h-4 w-4 text-destructive inline" /> :
                       <Minus className="h-4 w-4 text-muted-foreground inline" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Leaderboard;
