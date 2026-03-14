import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { FileBarChart, TrendingUp, Pill, Download, Share2, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, BarChart, Bar } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { generateReportAnalysis } from "@/lib/ai";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const HealthReport = () => {
  const patient = useAppStore(s => s.currentPatient);
  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date().getMonth());
  const [year] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [bpData, setBpData] = useState<any[]>([]);
  const [sugarData, setSugarData] = useState<any[]>([]);
  const [checkupCount, setCheckupCount] = useState(0);
  const [doctorNote, setDoctorNote] = useState("");
  const [compliance, setCompliance] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [latestVitals, setLatestVitals] = useState<any>(null);

  useEffect(() => {
    if (!patient) return;
    loadReport();
  }, [patient, month]);

  const loadReport = async () => {
    if (!patient) return;
    setIsLoading(true);
    const startDate = new Date(year, month, 1).toISOString();
    const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    const [checksRes, remindersRes, prescRes] = await Promise.all([
      supabase.from('health_checks').select('*').eq('patient_id', patient.id).gte('created_at', startDate).lte('created_at', endDate).order('created_at', { ascending: true }),
      supabase.from('medicine_reminders').select('*').eq('patient_id', patient.id).eq('is_active', true),
      supabase.from('prescriptions').select('*').eq('patient_id', patient.id).order('created_at', { ascending: false }).limit(1),
    ]);

    const checks = checksRes.data || [];
    const count = checks.length;
    setCheckupCount(count);
    if (prescRes.data?.[0]?.doctor_notes) setDoctorNote(prescRes.data[0].doctor_notes);

    // Build BP data from real vitals
    const bp: any[] = [];
    const sugar: any[] = [];
    checks.forEach((c: any) => {
      const v = c.vitals as any;
      const dateStr = new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      if (v?.bp_sys || v?.bp_systolic) {
        bp.push({
          date: dateStr,
          systolic: parseInt(v.bp_sys || v.bp_systolic),
          diastolic: parseInt(v.bp_dia || v.bp_diastolic || "80"),
        });
      }
      if (v?.sugar || v?.blood_sugar) {
        sugar.push({ date: dateStr, value: parseInt(v.sugar || v.blood_sugar) });
      }
    });
    setBpData(bp);
    setSugarData(sugar);

    // Medicine compliance from reminders count
    const reminderCount = remindersRes.data?.length || 0;
    setCompliance(reminderCount > 0 ? Math.min(100, reminderCount * 20) : 0);

    // Store latest vitals for PDF
    if (checks.length > 0) {
      const latestCheck = checks[checks.length - 1];
      const v = (latestCheck.vitals as any) || {};
      setLatestVitals({
        heart_rate: v.heart_rate || v.heartRate || null,
        bp_sys: v.bp_sys || v.bp_systolic || v.blood_pressure_systolic || null,
        bp_dia: v.bp_dia || v.bp_diastolic || v.blood_pressure_diastolic || null,
        temperature: v.temperature || v.temp || null,
        spo2: v.oxygen_saturation || v.spo2 || v.oxygen || null,
        sugar: v.sugar || v.blood_sugar || null,
        risk_score: latestCheck.ai_risk_score,
        risk_level: latestCheck.ai_triage,
      });
    }

    if (count === 0) {
      setReport(null);
      setIsLoading(false);
      return;
    }

    // Calculate real averages for AI
    const avgSys = bp.length ? Math.round(bp.reduce((a, b) => a + b.systolic, 0) / bp.length) : null;
    const avgSugar = sugar.length ? Math.round(sugar.reduce((a, b) => a + b.value, 0) / sugar.length) : null;
    const avgRisk = checks.reduce((sum: number, hc: any) => sum + (hc.ai_risk_score || 0), 0) / checks.length;
    const grade = avgRisk < 20 ? 'A+' : avgRisk < 35 ? 'A' : avgRisk < 50 ? 'B' : avgRisk < 65 ? 'C' : avgRisk < 80 ? 'D' : 'F';

    try {
      const result = await generateReportAnalysis({
        avg_bp: avgSys,
        avg_sugar: avgSugar,
        compliance_pct: compliance,
        checkup_count: count,
        month: new Date(year, month).toLocaleDateString('en-IN', { month: 'long' }),
        patient_age: patient.age,
      });
      setReport({ ...result, grade: result.grade || grade });
    } catch {
      setReport({ grade, summary: `Based on ${count} health check(s) this month.`, improved: [], needs_attention: [], recommendations: ["Continue regular health checks"] });
    }
    setIsLoading(false);
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const margin = 20;
      const contentW = 170;
      let y = 20;

      // Header bar
      doc.setFillColor(0, 168, 85);
      doc.rect(0, 0, 210, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('MediAI Health Report', margin, 14);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Generated: ' + new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }), margin, 24);
      y = 44;

      // Patient info box
      doc.setFillColor(240, 247, 244);
      doc.roundedRect(margin, y, contentW, 28, 3, 3, 'F');
      doc.setTextColor(10, 32, 24);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Patient Information', margin + 6, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 100, 80);
      doc.text('Name: ' + (patient?.name || 'N/A'), margin + 6, y + 16);
      doc.text('Age: ' + (patient?.age || 'N/A'), margin + 80, y + 16);
      doc.text('Village: ' + (patient?.village || 'N/A'), margin + 6, y + 22);
      doc.text('Blood Group: ' + (patient?.blood_group || 'N/A'), margin + 80, y + 22);
      y += 36;

      // Health Score
      doc.setTextColor(10, 32, 24);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Health Overview', margin, y);
      y += 8;

      if (report) {
        const gradeStr = report.grade || '--';
        const sc = gradeStr.startsWith('A') ? [0, 168, 85] : gradeStr === 'B' ? [0, 168, 85] : gradeStr === 'C' ? [255, 165, 2] : [255, 71, 87];
        doc.setFillColor(sc[0], sc[1], sc[2]);
        doc.roundedRect(margin, y, 40, 22, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(gradeStr, margin + 12, y + 14);

        doc.setFillColor(240, 247, 244);
        doc.roundedRect(margin + 46, y, 124, 22, 3, 3, 'F');
        doc.setTextColor(10, 32, 24);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Compliance: ' + compliance + '%', margin + 52, y + 9);
        doc.text('Checkups: ' + checkupCount + ' this month', margin + 52, y + 17);
        y += 30;
      }

      // Vitals table
      if (latestVitals) {
        doc.setTextColor(10, 32, 24);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Latest Vitals', margin, y);
        y += 8;

        const vitals: [string, string, string][] = [
          ['Heart Rate', (latestVitals.heart_rate || '--') + ' bpm', latestVitals.heart_rate && latestVitals.heart_rate >= 60 && latestVitals.heart_rate <= 100 ? 'Normal' : latestVitals.heart_rate ? 'Abnormal' : '--'],
          ['Blood Pressure', (latestVitals.bp_sys || '--') + '/' + (latestVitals.bp_dia || '--') + ' mmHg', latestVitals.bp_sys && latestVitals.bp_sys <= 120 ? 'Normal' : latestVitals.bp_sys ? 'High' : '--'],
          ['Temperature', (latestVitals.temperature || '--') + ' °C', latestVitals.temperature && latestVitals.temperature <= 37.5 ? 'Normal' : latestVitals.temperature ? 'Fever' : '--'],
          ['Oxygen (SpO2)', (latestVitals.spo2 || '--') + '%', latestVitals.spo2 && latestVitals.spo2 >= 95 ? 'Normal' : latestVitals.spo2 ? 'Low' : '--'],
          ['Blood Sugar', (latestVitals.sugar || '--') + ' mg/dL', latestVitals.sugar && latestVitals.sugar <= 140 ? 'Normal' : latestVitals.sugar ? 'High' : '--'],
          ['Risk Level', latestVitals.risk_level ? String(latestVitals.risk_level).toUpperCase() : '--', latestVitals.risk_level === 'low' ? 'Good' : latestVitals.risk_level ? 'Attention' : '--'],
        ];

        doc.setFillColor(0, 100, 50);
        doc.rect(margin, y, contentW, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Vital', margin + 4, y + 5.5);
        doc.text('Value', margin + 60, y + 5.5);
        doc.text('Status', margin + 120, y + 5.5);
        y += 8;

        vitals.forEach((row, i) => {
          doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 255 : 255, i % 2 === 0 ? 252 : 255);
          doc.rect(margin, y, contentW, 8, 'F');
          doc.setTextColor(10, 32, 24);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text(row[0], margin + 4, y + 5.5);
          doc.text(row[1], margin + 60, y + 5.5);
          const isOk = row[2] === 'Normal' || row[2] === 'Good';
          doc.setTextColor(isOk ? 0 : 200, isOk ? 150 : 50, isOk ? 80 : 20);
          doc.text(row[2], margin + 120, y + 5.5);
          y += 8;
        });
        y += 6;
      }

      // Needs attention
      if (report?.needs_attention?.length > 0) {
        doc.setTextColor(10, 32, 24);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Needs Attention', margin, y);
        y += 7;
        doc.setFillColor(255, 245, 230);
        const h = report.needs_attention.length * 7 + 8;
        doc.roundedRect(margin, y, contentW, h, 3, 3, 'F');
        doc.setTextColor(180, 80, 0);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        report.needs_attention.forEach((item: string, i: number) => {
          doc.text('• ' + item, margin + 6, y + 7 + i * 7);
        });
        y += h + 6;
      }

      // Recommendations
      if (report?.recommendations?.length > 0) {
        doc.setTextColor(10, 32, 24);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Recommendations', margin, y);
        y += 7;
        doc.setFillColor(240, 247, 244);
        const h = report.recommendations.length * 7 + 8;
        doc.roundedRect(margin, y, contentW, h, 3, 3, 'F');
        doc.setTextColor(0, 100, 50);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        report.recommendations.forEach((item: string, i: number) => {
          doc.text('• ' + item, margin + 6, y + 7 + i * 7);
        });
        y += h + 6;
      }

      // Footer
      const pageH = doc.internal.pageSize.height;
      doc.setFillColor(0, 168, 85);
      doc.rect(0, pageH - 14, 210, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('MediAI — Rural Healthcare Intelligence Platform | Team EliteOrbit', margin, pageH - 5);

      const filename = 'MediAI_Report_' + (patient?.name || 'Patient').replace(/\s+/g, '_') + '_' + new Date().toISOString().split('T')[0] + '.pdf';
      doc.save(filename);
      toast({ title: "PDF downloaded! ✅" });
    } catch (err) {
      console.error('PDF error:', err);
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const gradeColor = (g: string) => g?.startsWith("A") ? "text-primary" : g === "B" ? "text-primary" : g === "C" ? "text-urgent" : "text-destructive";

  if (isLoading) return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
      <p className="text-muted-foreground">Loading your health report...</p>
    </div>
  );

  if (checkupCount === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-foreground">Health Report 📊</h2>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
            className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground">
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{new Date(2026, i).toLocaleDateString('en-IN', { month: 'long' })}</option>)}
          </select>
        </div>
        <div className="glass-card p-12 text-center">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-foreground font-bold text-lg">No health data yet</p>
          <p className="text-sm text-muted-foreground mt-1">Complete a Health Check to see your reports</p>
          <button onClick={() => navigate('/patient/health-check')}
            className="mt-4 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
            → Go to Health Check
          </button>
        </div>
      </div>
    );
  }

  const complianceData = [{ name: "compliance", value: compliance, fill: "hsl(var(--primary))" }];

  return (
    <div className="max-w-2xl mx-auto space-y-6" id="report-container">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">Health Report 📊</h2>
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
          className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground">
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{new Date(2026, i).toLocaleDateString('en-IN', { month: 'long' })}</option>)}
        </select>
      </div>

      {/* Grade */}
      {report && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-8 text-center">
          <p className="text-xs text-muted-foreground mb-2">Overall Health Grade</p>
          <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.3 }}
            className={`font-display text-7xl font-extrabold ${gradeColor(report.grade)}`}>{report.grade}</motion.p>
          <p className="text-sm text-muted-foreground mt-3">{report.summary}</p>
          {checkupCount === 1 && <p className="text-xs text-muted-foreground mt-2">Complete more health checks to see trends over time</p>}
        </motion.div>
      )}

      {/* BP Chart */}
      {bpData.length > 0 ? (
        <div className="glass-card p-5">
          <h3 className="font-display font-bold text-foreground mb-4">Blood Pressure Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={bpData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }} />
              <Line type="monotone" dataKey="systolic" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ fill: "hsl(var(--destructive))" }} />
              <Line type="monotone" dataKey="diastolic" stroke="hsl(var(--info))" strokeWidth={2} dot={{ fill: "hsl(var(--info))" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="glass-card p-5 text-center text-sm text-muted-foreground">No BP data recorded yet</div>
      )}

      {/* Sugar Chart */}
      {sugarData.length > 0 ? (
        <div className="glass-card p-5">
          <h3 className="font-display font-bold text-foreground mb-4">Blood Sugar Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sugarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }} />
              <Bar dataKey="value" fill="hsl(var(--urgent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="glass-card p-5 text-center text-sm text-muted-foreground">No blood sugar data recorded yet</div>
      )}

      {/* Medicine Compliance */}
      <div className="glass-card p-5 flex items-center gap-6">
        <div className="w-24 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={complianceData} startAngle={90} endAngle={-270}>
              <RadialBar background dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="font-mono text-2xl font-bold text-primary">{compliance}%</p>
          <p className="text-sm text-muted-foreground">Medicine Compliance</p>
          <p className="text-xs text-muted-foreground mt-1">Checkups: {checkupCount} this month</p>
        </div>
      </div>

      {/* AI Analysis */}
      {report && (report.improved?.length > 0 || report.needs_attention?.length > 0 || report.recommendations?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {report.improved?.length > 0 && (
            <div className="glass-card p-4" style={{ borderColor: "hsla(var(--primary), 0.2)" }}>
              <h4 className="text-xs text-primary font-bold mb-2">✅ Improved</h4>
              {report.improved.map((r: string, i: number) => <p key={i} className="text-xs text-muted-foreground mb-1">• {r}</p>)}
            </div>
          )}
          {report.needs_attention?.length > 0 && (
            <div className="glass-card p-4" style={{ borderColor: "hsla(var(--urgent), 0.2)" }}>
              <h4 className="text-xs text-urgent font-bold mb-2">⚠️ Needs Attention</h4>
              {report.needs_attention.map((r: string, i: number) => <p key={i} className="text-xs text-muted-foreground mb-1">• {r}</p>)}
            </div>
          )}
          {report.recommendations?.length > 0 && (
            <div className="glass-card p-4" style={{ borderColor: "hsla(var(--info), 0.2)" }}>
              <h4 className="text-xs text-info font-bold mb-2">💡 Recommendations</h4>
              {report.recommendations.map((r: string, i: number) => <p key={i} className="text-xs text-muted-foreground mb-1">• {r}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Doctor Note */}
      {doctorNote && (
        <div className="glass-card p-5 glow-border">
          <p className="text-xs text-muted-foreground mb-1">Doctor's Note</p>
          <p className="text-sm text-foreground italic">"{doctorNote}"</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {downloading ? 'Generating...' : 'Download PDF'}
        </button>
        <button onClick={() => { if (navigator.share) navigator.share({ title: "Health Report", text: report?.summary }); else toast({ title: "Share not supported" }); }}
          className="flex-1 py-3 rounded-xl bg-secondary text-foreground text-sm font-medium flex items-center justify-center gap-2">
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>
    </div>
  );
};

export default HealthReport;
