import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Users, DollarSign, Star, AlertTriangle, Loader2, Clock } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import AnimatedCounter from "@/components/AnimatedCounter";

const COLORS = ["hsl(353,90%,64%)", "hsl(37,100%,56%)", "hsl(152,100%,45%)"];

const DoctorAnalytics = () => {
  const doctor = useAppStore(s => s.currentDoctor);
  const navigate = useNavigate();
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ patients: 0, earnings: 0, emergencies: 0, rating: 4.8 });
  const [earningsData, setEarningsData] = useState<any[]>([]);
  const [triageData, setTriageData] = useState<any[]>([]);
  const [patientsData, setPatientsData] = useState<any[]>([]);
  const [topDiagnoses, setTopDiagnoses] = useState<any[]>([]);

  useEffect(() => {
    if (!doctor) { navigate('/doctor/login'); return; }
    loadAnalytics();
  }, [doctor, period]);

  const getDateRange = () => {
    const now = new Date();
    const start = new Date();
    if (period === 'today') { start.setHours(0, 0, 0, 0); }
    else if (period === 'week') { start.setDate(now.getDate() - 7); }
    else if (period === 'month') { start.setMonth(now.getMonth() - 1); }
    else { start.setFullYear(now.getFullYear() - 1); }
    return { start: start.toISOString(), end: now.toISOString() };
  };

  const loadAnalytics = async () => {
    if (!doctor) return;
    setLoading(true);
    const { start, end } = getDateRange();

    const [apptRes, checkRes, emRes] = await Promise.all([
      supabase.from('appointments').select('*').eq('doctor_id', doctor.id).gte('date_time', start).lte('date_time', end),
      supabase.from('health_checks').select('*').eq('assigned_doctor_id', doctor.id).gte('created_at', start).lte('created_at', end),
      supabase.from('emergencies').select('*').eq('doctor_id', doctor.id).gte('created_at', start).lte('created_at', end),
    ]);

    const appts = apptRes.data || [];
    const checks = checkRes.data || [];
    const completed = appts.filter(a => a.status === 'completed');

    setStats({
      patients: completed.length,
      earnings: completed.length * 60,
      emergencies: emRes.data?.length || 0,
      rating: doctor.rating || 4.8,
    });

    // Group by date for charts
    const dateMap: Record<string, { earnings: number; emergency: number; urgent: number; routine: number }> = {};
    const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 12;

    for (let i = 0; i < Math.min(days, 14); i++) {
      const d = new Date();
      if (period === 'year') { d.setMonth(d.getMonth() - (days - 1 - i)); }
      else { d.setDate(d.getDate() - (Math.min(days, 14) - 1 - i)); }
      const key = period === 'year' ? d.toLocaleDateString('en-IN', { month: 'short' }) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      dateMap[key] = { earnings: 0, emergency: 0, urgent: 0, routine: 0 };
    }

    appts.forEach(a => {
      const d = new Date(a.date_time);
      const key = period === 'year' ? d.toLocaleDateString('en-IN', { month: 'short' }) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      if (dateMap[key]) {
        if (a.status === 'completed') dateMap[key].earnings += 60;
        dateMap[key].routine += 1;
      }
    });

    checks.forEach(c => {
      const d = new Date(c.created_at);
      const key = period === 'year' ? d.toLocaleDateString('en-IN', { month: 'short' }) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      if (dateMap[key]) {
        if (c.ai_triage === 'emergency') { dateMap[key].emergency += 1; dateMap[key].routine = Math.max(0, dateMap[key].routine - 1); }
        else if (c.ai_triage === 'urgent') { dateMap[key].urgent += 1; dateMap[key].routine = Math.max(0, dateMap[key].routine - 1); }
      }
    });

    setEarningsData(Object.entries(dateMap).map(([day, v]) => ({ day, earnings: v.earnings })));
    setPatientsData(Object.entries(dateMap).map(([day, v]) => ({ day, Emergency: v.emergency, Urgent: v.urgent, Routine: v.routine })));

    // Triage pie
    const em = checks.filter(c => c.ai_triage === 'emergency').length;
    const ur = checks.filter(c => c.ai_triage === 'urgent').length;
    const rt = checks.filter(c => c.ai_triage === 'routine').length || Math.max(1, appts.length - em - ur);
    setTriageData([{ name: "Emergency", value: em || 0 }, { name: "Urgent", value: ur || 0 }, { name: "Routine", value: rt }]);

    // Top diagnoses
    const condMap: Record<string, number> = {};
    checks.forEach(c => { if (c.ai_condition) condMap[c.ai_condition] = (condMap[c.ai_condition] || 0) + 1; });
    const sorted = Object.entries(condMap).sort(([, a], [, b]) => b - a).slice(0, 5);
    const total = sorted.reduce((s, [, c]) => s + c, 0);
    setTopDiagnoses(sorted.map(([cond, count], i) => ({ rank: i + 1, condition: cond, count, pct: total ? Math.round((count / total) * 100) : 0 })));

    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-info" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">Analytics 📊</h2>
        <div className="flex gap-2">
          {["today", "week", "month", "year"].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-full text-xs capitalize ${period === p ? "bg-info text-info-foreground" : "bg-secondary text-muted-foreground"}`}>{p}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Patients Seen", value: stats.patients, color: "text-info" },
          { icon: DollarSign, label: "Earnings", value: `₹${stats.earnings}`, color: "text-primary" },
          { icon: AlertTriangle, label: "Emergencies", value: stats.emergencies, color: "text-destructive" },
          { icon: Star, label: "Rating", value: `${stats.rating}⭐`, color: "text-urgent" },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <s.icon className={`h-5 w-5 ${s.color} mx-auto mb-2`} />
            <p className="font-mono text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-5">
        <h3 className="font-display font-bold text-foreground mb-4">Earnings Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={earningsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(156,35%,17%)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(156,30%,55%)" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(156,30%,55%)" }} />
            <Tooltip contentStyle={{ background: "hsl(156,53%,8%)", border: "1px solid hsl(156,35%,17%)", borderRadius: 12, color: "hsl(156,40%,93%)" }} />
            <Area type="monotone" dataKey="earnings" stroke="hsl(190,90%,59%)" fill="hsl(190,90%,59%)" fillOpacity={0.2} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="font-display font-bold text-foreground mb-4">Patients by Triage</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={patientsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(156,35%,17%)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(156,30%,55%)" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(156,30%,55%)" }} />
              <Bar dataKey="Emergency" stackId="a" fill={COLORS[0]} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Urgent" stackId="a" fill={COLORS[1]} />
              <Bar dataKey="Routine" stackId="a" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-display font-bold text-foreground mb-4">Triage Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={triageData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {triageData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(156,53%,8%)", border: "1px solid hsl(156,35%,17%)", borderRadius: 12, color: "hsl(156,40%,93%)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {topDiagnoses.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-display font-bold text-foreground mb-4">Top Diagnoses</h3>
          <div className="space-y-3">
            {topDiagnoses.map(d => (
              <div key={d.rank} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-info/20 text-info text-xs flex items-center justify-center font-bold">{d.rank}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{d.condition}</span>
                    <span className="text-xs text-muted-foreground">{d.count} ({d.pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary mt-1 overflow-hidden">
                    <div className="h-full rounded-full bg-info/60" style={{ width: `${d.pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAnalytics;
