import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Users, AlertTriangle, Clock, BedDouble, Star, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";

const COLORS = ["hsl(353,90%,64%)","hsl(37,100%,56%)","hsl(152,100%,45%)","hsl(190,90%,59%)","hsl(263,86%,76%)"];

const HospitalAnalytics = () => {
  const hospital = useAppStore(s => s.currentHospital);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ admissions: 0, emergencies: 0, avgResponse: 0, occupancy: 0, satisfaction: 0 });
  const [admissionsData, setAdmissionsData] = useState<any[]>([]);
  const [diseaseData, setDiseaseData] = useState<any[]>([]);

  useEffect(() => { loadData(); }, [hospital, period]);

  const loadData = async () => {
    if (!hospital) return;
    setLoading(true);

    const now = new Date();
    const start = new Date();
    if (period === 'week') start.setDate(now.getDate() - 7);
    else if (period === 'month') start.setMonth(now.getMonth() - 1);
    else if (period === 'quarter') start.setMonth(now.getMonth() - 3);
    else start.setFullYear(now.getFullYear() - 1);

    const [emgRes, apptRes, bedsRes, checksRes] = await Promise.all([
      supabase.from('emergencies').select('*').eq('hospital_id', hospital.id).gte('created_at', start.toISOString()),
      supabase.from('appointments').select('*').gte('created_at', start.toISOString()),
      supabase.from('beds').select('*').eq('hospital_id', hospital.id),
      supabase.from('health_checks').select('ai_condition, created_at').gte('created_at', start.toISOString()),
    ]);

    const emg = emgRes.data || [];
    const appts = apptRes.data || [];
    const beds = bedsRes.data || [];
    const checks = checksRes.data || [];

    const occupiedBeds = beds.filter(b => b.status === 'occupied').length;
    const totalBeds = beds.length;

    setStats({
      admissions: appts.length + emg.length,
      emergencies: emg.length,
      avgResponse: emg.length > 0 ? Math.round(emg.reduce((s: number, e: any) => s + (e.ambulance_eta || 15), 0) / emg.length) : 0,
      occupancy: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      satisfaction: 0,
    });

    // Group admissions by date
    const dateMap: Record<string, number> = {};
    const days = period === 'week' ? 7 : period === 'month' ? 30 : period === 'quarter' ? 90 : 12;
    for (let i = 0; i < Math.min(days, 14); i++) {
      const d = new Date();
      d.setDate(d.getDate() - (Math.min(days, 14) - 1 - i));
      const key = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      dateMap[key] = 0;
    }
    [...appts, ...emg].forEach(a => {
      const d = new Date(a.created_at);
      const key = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      if (dateMap[key] !== undefined) dateMap[key]++;
    });
    setAdmissionsData(Object.entries(dateMap).map(([day, admissions]) => ({ day, admissions })));

    // Disease distribution from real health checks
    const condMap: Record<string, number> = {};
    checks.forEach((c: any) => { if (c.ai_condition) condMap[c.ai_condition] = (condMap[c.ai_condition] || 0) + 1; });
    const sorted = Object.entries(condMap).sort(([, a], [, b]) => b - a).slice(0, 5);
    setDiseaseData(sorted.map(([name, value]) => ({ name, value })));

    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-urgent" /></div>;

  const hasData = stats.admissions > 0 || stats.emergencies > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">Hospital Analytics 📊</h2>
        <div className="flex gap-2">
          {["week", "month", "quarter", "year"].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-full text-xs capitalize ${period === p ? "bg-urgent text-urgent-foreground" : "bg-secondary text-muted-foreground"}`}>{p}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Admissions", value: stats.admissions, color: "text-urgent" },
          { icon: AlertTriangle, label: "Emergencies", value: stats.emergencies, color: "text-destructive" },
          { icon: Clock, label: "Avg Response", value: stats.avgResponse > 0 ? `${stats.avgResponse}m` : "—", color: "text-info" },
          { icon: BedDouble, label: "Occupancy", value: stats.occupancy > 0 ? `${stats.occupancy}%` : "—", color: "text-primary" },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <s.icon className={`h-5 w-5 ${s.color} mx-auto mb-2`} />
            <p className="font-mono text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {!hasData ? (
        <div className="glass-card p-12 text-center">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-foreground font-bold">No data yet</p>
          <p className="text-sm text-muted-foreground mt-1">Data appears as patients use the app</p>
        </div>
      ) : (
        <>
          <div className="glass-card p-5">
            <h3 className="font-display font-bold text-foreground mb-4">Admissions Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={admissionsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(156,35%,17%)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(156,30%,55%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(156,30%,55%)" }} />
                <Tooltip contentStyle={{ background: "hsl(156,53%,8%)", border: "1px solid hsl(156,35%,17%)", borderRadius: 12, color: "hsl(156,40%,93%)" }} />
                <Area type="monotone" dataKey="admissions" stroke="hsl(37,100%,56%)" fill="hsla(37,100%,56%,0.2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {diseaseData.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-display font-bold text-foreground mb-4">Disease Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={diseaseData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {diseaseData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(156,53%,8%)", border: "1px solid hsl(156,35%,17%)", borderRadius: 12, color: "hsl(156,40%,93%)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HospitalAnalytics;
