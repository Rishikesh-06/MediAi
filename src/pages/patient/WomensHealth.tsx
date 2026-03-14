import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Lock, Baby, Sparkles, AlertTriangle, Send, Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, Calendar as CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, addDays, differenceInDays, differenceInWeeks, isWithinInterval, startOfDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const symptomChips = [
  { emoji: "😣", label: "Cramps" },
  { emoji: "😤", label: "Mood swings" },
  { emoji: "🤢", label: "Nausea" },
  { emoji: "😪", label: "Fatigue" },
  { emoji: "🎈", label: "Bloating" },
  { emoji: "🤕", label: "Headache" },
  { emoji: "✨", label: "Feeling good" },
];

const babySizeMap: Record<number, { emoji: string; name: string }> = {
  4: { emoji: "🌱", name: "Poppy seed" },
  6: { emoji: "🫐", name: "Blueberry" },
  8: { emoji: "🫒", name: "Olive" },
  10: { emoji: "🍓", name: "Strawberry" },
  12: { emoji: "🍋", name: "Lemon" },
  16: { emoji: "🥑", name: "Avocado" },
  20: { emoji: "🍌", name: "Banana" },
  24: { emoji: "🌽", name: "Corn" },
  28: { emoji: "🍆", name: "Eggplant" },
  32: { emoji: "🥥", name: "Coconut" },
  36: { emoji: "🍈", name: "Honeydew" },
  40: { emoji: "🎃", name: "Pumpkin" },
};

const getBabySize = (week: number) => {
  const keys = Object.keys(babySizeMap).map(Number).sort((a, b) => a - b);
  let closest = keys[0];
  for (const k of keys) {
    if (k <= week) closest = k;
  }
  return babySizeMap[closest] || { emoji: "🌱", name: "Tiny seed" };
};

const importantDates = [
  { week: 8, label: "First prenatal visit" },
  { week: 12, label: "First trimester scan" },
  { week: 20, label: "Anatomy scan" },
  { week: 24, label: "Glucose test" },
  { week: 28, label: "Third trimester begins" },
  { week: 36, label: "Weekly checkups begin" },
  { week: 40, label: "Due date" },
];

const quickQuestions = [
  "Why am I feeling tired?",
  "Is this discharge normal?",
  "Irregular periods advice",
  "PCOS symptoms",
  "Breast self exam guide",
  "Iron deficiency signs",
];

const WomensHealth = () => {
  const patient = useAppStore(s => s.currentPatient);
  const navigate = useNavigate();
  const [tab, setTab] = useState<"period" | "pregnancy" | "general">("period");

  // Period state
  const [periodData, setPeriodData] = useState<any>(null);
  const [periodHistory, setPeriodHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastPeriodDate, setLastPeriodDate] = useState<Date | undefined>();
  const [cycleLength, setCycleLength] = useState(28);
  const [periodDuration, setPeriodDuration] = useState(5);
  const [showSetup, setShowSetup] = useState(false);
  const [logFlow, setLogFlow] = useState("");
  const [logSymptoms, setLogSymptoms] = useState<string[]>([]);
  const [savingLog, setSavingLog] = useState(false);
  const [showNewPeriodForm, setShowNewPeriodForm] = useState(false);
  const [newPeriodDate, setNewPeriodDate] = useState<Date | undefined>();
  const [newPeriodDuration, setNewPeriodDuration] = useState(5);
  const [newPeriodFlow, setNewPeriodFlow] = useState("");
  const [newPeriodSymptoms, setNewPeriodSymptoms] = useState<string[]>([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Pregnancy state
  const [pregnancyData, setPregnancyData] = useState<any>(null);
  const [lmpDate, setLmpDate] = useState<Date | undefined>();
  const [directDueDate, setDirectDueDate] = useState<Date | undefined>();
  const [pregnancyTip, setPregnancyTip] = useState("");
  const [tipLoading, setTipLoading] = useState(false);
  const [savingPregnancy, setSavingPregnancy] = useState(false);

  // General health state
  const [healthQuestion, setHealthQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [askingAi, setAskingAi] = useState(false);

  // Load data on mount
  useEffect(() => {
    if (patient?.id) loadAllData();
  }, [patient?.id]);

  const loadAllData = async () => {
    if (!patient?.id) return;
    setLoading(true);
    try {
      const { data: pData } = await supabase
        .from('women_health')
        .select('*')
        .eq('patient_id', patient.id)
        .eq('type', 'period')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pData) {
        setPeriodData(pData);
        if (pData.last_period_date) setLastPeriodDate(new Date(pData.last_period_date));
        if (pData.cycle_length) setCycleLength(pData.cycle_length);
        if (pData.period_duration) setPeriodDuration(pData.period_duration);
        setShowSetup(false);
      } else {
        setShowSetup(true);
      }

      // Load full period history
      const { data: history } = await supabase
        .from('women_health')
        .select('*')
        .eq('patient_id', patient.id)
        .eq('type', 'period')
        .not('last_period_date', 'is', null)
        .order('last_period_date', { ascending: false });
      setPeriodHistory(history || []);

      const { data: pregData } = await supabase
        .from('women_health')
        .select('*')
        .eq('patient_id', patient.id)
        .eq('type', 'pregnancy')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setPregnancyData(pregData);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveCycleSetup = async () => {
    if (!patient?.id || !lastPeriodDate) return;
    setSavingLog(true);
    try {
      const { error } = await supabase.from('women_health').insert({
        patient_id: patient.id,
        type: 'period',
        last_period_date: format(lastPeriodDate, 'yyyy-MM-dd'),
        cycle_length: cycleLength,
        period_duration: periodDuration,
      });
      if (error) throw error;
      toast({ title: "Cycle saved! ✅" });
      setShowSetup(false);
      await loadAllData();
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSavingLog(false);
    }
  };

  const saveNewPeriod = async () => {
    if (!patient?.id || !newPeriodDate) return;
    setSavingLog(true);
    try {
      await supabase.from('women_health')
        .update({ period_end_date: format(addDays(new Date(), -1), 'yyyy-MM-dd') })
        .eq('patient_id', patient.id)
        .eq('type', 'period')
        .is('period_end_date', null);

      const periodEndDate = addDays(newPeriodDate, newPeriodDuration - 1);
      const { error } = await supabase.from('women_health').insert({
        patient_id: patient.id,
        type: 'period',
        last_period_date: format(newPeriodDate, 'yyyy-MM-dd'),
        period_end_date: format(periodEndDate, 'yyyy-MM-dd'),
        cycle_length: cycleLength,
        period_duration: newPeriodDuration,
        flow_intensity: newPeriodFlow || null,
        symptoms: newPeriodSymptoms.length > 0 ? newPeriodSymptoms : null,
      });
      if (error) throw error;
      toast({ title: "Period logged! ✅" });
      setShowNewPeriodForm(false);
      setNewPeriodDate(undefined);
      setNewPeriodDuration(5);
      setNewPeriodFlow("");
      setNewPeriodSymptoms([]);
      await loadAllData();
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSavingLog(false);
    }
  };

  const saveSymptomLog = async () => {
    if (!patient?.id || !logFlow) return;
    setSavingLog(true);
    try {
      if (periodData?.id) {
        const { error } = await supabase.from('women_health')
          .update({ flow_intensity: logFlow, symptoms: logSymptoms, updated_at: new Date().toISOString() })
          .eq('id', periodData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('women_health').insert({
          patient_id: patient.id,
          type: 'period',
          last_period_date: lastPeriodDate ? format(lastPeriodDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
          cycle_length: cycleLength,
          period_duration: periodDuration,
          flow_intensity: logFlow,
          symptoms: logSymptoms,
        });
        if (error) throw error;
      }
      toast({ title: "Symptoms logged! ✅" });
      setLogFlow("");
      setLogSymptoms([]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingLog(false);
    }
  };

  const savePregnancy = async () => {
    if (!patient?.id || (!lmpDate && !directDueDate)) return;
    setSavingPregnancy(true);
    try {
      const calcLmp = lmpDate || (directDueDate ? addDays(directDueDate, -280) : new Date());
      const calcDue = directDueDate || addDays(calcLmp, 280);
      const weeks = Math.min(42, Math.max(0, differenceInWeeks(new Date(), calcLmp)));
      const { error } = await supabase.from('women_health').insert({
        patient_id: patient.id,
        type: 'pregnancy',
        lmp_date: format(calcLmp, 'yyyy-MM-dd'),
        due_date: format(calcDue, 'yyyy-MM-dd'),
        week_number: weeks,
      });
      if (error) throw error;
      toast({ title: "Pregnancy tracking started! 🤰" });
      await loadAllData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingPregnancy(false);
    }
  };

  const getPregnancyTip = async (week: number) => {
    setTipLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('womens-health-ai', { body: { type: 'pregnancy_tip', week } });
      if (error) throw error;
      setPregnancyTip(data.text || "No tip available.");
    } catch {
      setPregnancyTip("Could not load tip right now. Please try again later.");
    } finally {
      setTipLoading(false);
    }
  };

  const askHealthQuestion = async (q?: string) => {
    const question = q || healthQuestion;
    if (!question.trim()) return;
    setAskingAi(true);
    setAiAnswer("");
    setHealthQuestion(question);
    try {
      const { data, error } = await supabase.functions.invoke('womens-health-ai', { body: { type: 'health_question', question } });
      if (error) throw error;
      setAiAnswer(data.text || "No answer available.");
    } catch {
      setAiAnswer("Could not get answer right now. Please try again.");
    } finally {
      setAskingAi(false);
    }
  };

  // Period calculations
  const today = startOfDay(new Date());
  const nextPeriodDate = lastPeriodDate ? addDays(lastPeriodDate, cycleLength) : null;
  const ovulationDate = lastPeriodDate ? addDays(lastPeriodDate, cycleLength - 14) : null;
  const fertileStart = ovulationDate ? addDays(ovulationDate, -5) : null;
  const fertileEnd = ovulationDate ? addDays(ovulationDate, 1) : null;
  const daysUntilNext = nextPeriodDate ? differenceInDays(nextPeriodDate, today) : null;
  const currentCycleDay = lastPeriodDate ? differenceInDays(today, lastPeriodDate) + 1 : null;
  const periodEnd = lastPeriodDate ? addDays(lastPeriodDate, periodDuration - 1) : null;
  const isInPeriodWindow = lastPeriodDate && periodEnd ? isWithinInterval(today, { start: lastPeriodDate, end: periodEnd }) : false;

  // Pregnancy calculations
  const weeksPregnant = pregnancyData?.lmp_date ? Math.min(42, Math.max(0, differenceInWeeks(today, new Date(pregnancyData.lmp_date)))) : 0;
  const trimester = weeksPregnant <= 12 ? 1 : weeksPregnant <= 26 ? 2 : 3;
  const pregDueDate = pregnancyData?.due_date ? new Date(pregnancyData.due_date) : null;
  const daysToGo = pregDueDate ? Math.max(0, differenceInDays(pregDueDate, today)) : 0;
  const babySize = getBabySize(weeksPregnant);

  useEffect(() => {
    if (tab === "pregnancy" && pregnancyData && weeksPregnant > 0 && !pregnancyTip) {
      getPregnancyTip(weeksPregnant);
    }
  }, [tab, pregnancyData, weeksPregnant]);

  const getDaysInMonth = (date: Date) => eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) });

  const getDateType = (date: Date): "period" | "fertile" | "ovulation" | "nextPeriod" | "today" | null => {
    if (isSameDay(date, today)) return "today";
    if (lastPeriodDate && periodEnd && isWithinInterval(date, { start: lastPeriodDate, end: periodEnd })) return "period";
    if (ovulationDate && isSameDay(date, ovulationDate)) return "ovulation";
    if (fertileStart && fertileEnd && isWithinInterval(date, { start: fertileStart, end: fertileEnd })) return "fertile";
    if (nextPeriodDate && isSameDay(date, nextPeriodDate)) return "nextPeriod";
    return null;
  };

  const tabs = [
    { id: "period" as const, label: "🔴 Period" },
    { id: "pregnancy" as const, label: "🤰 Pregnancy" },
    { id: "general" as const, label: "💚 General" },
  ];

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto flex items-center justify-center py-20 px-6">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent-green)' }} />
      </div>
    );
  }

  // Custom Calendar Component
  const CustomCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDayOfMonth = startOfMonth(currentMonth).getDay();
    const dayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    return (
      <div className="rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
        {/* Month Header */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day Labels */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayLabels.map(day => (
            <div key={day} className="h-8 flex items-center justify-center text-xs font-semibold tracking-wider" style={{ color: 'var(--accent-green)' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 justify-center">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="w-11 h-11" />
          ))}
          {daysInMonth.map(date => {
            const dateType = getDateType(date);
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isToday = dateType === "today";
            const isPeriod = dateType === "period";
            const isFertile = dateType === "fertile";
            const isOvulation = dateType === "ovulation";
            const isNextPeriod = dateType === "nextPeriod";

            let cellClasses = "w-11 h-11 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer transition-all duration-200";
            let style: React.CSSProperties = {};

            if (isToday) {
              cellClasses += " font-bold";
              style = { backgroundColor: "var(--accent-green)", color: "#000", boxShadow: "0 0 12px rgba(0,232,122,0.4)" };
            } else if (isPeriod) {
              style = { backgroundColor: "#ff4757", color: "white", boxShadow: "0 2px 8px rgba(255,71,87,0.3)" };
            } else if (isOvulation) {
              style = { backgroundColor: "#ffa502", color: "#000", boxShadow: "0 0 12px rgba(255,165,2,0.5)" };
            } else if (isFertile) {
              style = { backgroundColor: "#2ed573", color: "#000" };
            } else if (isNextPeriod) {
              style = { backgroundColor: "transparent", border: "2px solid #5352ed", color: "#5352ed" };
            } else if (!isCurrentMonth) {
              style = { color: 'var(--text-placeholder)' };
            } else {
              style = { color: 'var(--text-secondary)' };
            }

            return (
              <div key={date.toISOString()} className={cellClasses} style={style}>
                {format(date, "d")}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff4757]" /> Period
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="w-2.5 h-2.5 rounded-full bg-[#2ed573]" /> Fertile
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffa502]" /> Ovulation
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="w-2.5 h-2.5 rounded-full border-2 border-[#5352ed] bg-transparent" /> Next Period
          </div>
        </div>
      </div>
    );
  };

  // Reusable card style
  const cardStyle: React.CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' };
  const innerCardStyle: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border-default)' };
  const chipBase: React.CSSProperties = { background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' };
  const chipActive: React.CSSProperties = { background: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)' };

  return (
    <div className="max-w-[1100px] mx-auto px-5 md:px-7 pb-8">
      {/* Page Title */}
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Women's Health 💗</h1>
      
      {/* Privacy Note */}
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <Lock className="h-3.5 w-3.5" />
        Your health data is private and secure. Only you can see this.
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 mb-5">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
            style={tab === t.id
              ? { background: 'var(--accent-green)', color: '#000', border: '1px solid var(--accent-green)' }
              : { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════ PERIOD TAB ═══════════ */}
      {tab === "period" && (
        <div>
          {showSetup ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[20px] p-10 max-w-[480px] mx-auto text-center"
              style={{ ...cardStyle, borderTop: '3px solid #ff4757' }}
            >
              <div className="text-5xl mb-4">🩸</div>
              <h2 className="text-[22px] font-bold mb-8" style={{ color: 'var(--text-primary)' }}>Set Up Period Tracking</h2>

              <div className="text-left mb-6">
                <label className="text-[13px] mb-2 block" style={{ color: 'var(--text-secondary)' }}>When did your last period start?</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left rounded-[10px] py-3.5 px-4 text-[15px]", !lastPeriodDate && "opacity-60")}
                      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    >
                      {lastPeriodDate ? format(lastPeriodDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" style={cardStyle}>
                    <Calendar mode="single" selected={lastPeriodDate} onSelect={setLastPeriodDate} disabled={(d) => d > new Date()} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="mb-6">
                <label className="text-[13px] mb-4 block text-left" style={{ color: 'var(--text-secondary)' }}>Cycle length:</label>
                <div className="text-[28px] font-bold mb-4" style={{ color: 'var(--accent-green)' }}>{cycleLength} days</div>
                <Slider value={[cycleLength]} onValueChange={([v]) => setCycleLength(v)} min={21} max={35} step={1} className="mt-2" />
              </div>

              <div className="mb-6">
                <label className="text-[13px] mb-4 block text-left" style={{ color: 'var(--text-secondary)' }}>Period duration:</label>
                <div className="text-[28px] font-bold mb-4" style={{ color: 'var(--accent-green)' }}>{periodDuration} days</div>
                <Slider value={[periodDuration]} onValueChange={([v]) => setPeriodDuration(v)} min={3} max={7} step={1} className="mt-2" />
              </div>

              <button
                onClick={saveCycleSetup}
                disabled={!lastPeriodDate || savingLog}
                className="w-full bg-[#ff4757] text-white py-4 rounded-[12px] text-[16px] font-bold mt-6 hover:bg-[#ff5f6d] transition-colors disabled:opacity-50"
              >
                {savingLog ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
                Start Tracking →
              </button>
            </motion.div>
          ) : (
            /* Period Tracking View - New Layout: Calendar top, Stats+Log bottom */
            <div>
              {/* SECTION 1 — Calendar centered top */}
              <div className="flex justify-center mb-6">
                <div className="w-full max-w-[520px]">
                  <CustomCalendar />
                </div>
              </div>

              {/* SECTION 2 — Stats + Log Today side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                {/* LEFT — 4 stat cards 2x2 grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Card 1 - Next Period */}
                  <div className="rounded-2xl p-[18px] flex flex-col justify-between min-h-[110px]" style={{ ...cardStyle, borderTop: '3px solid #ff6b81' }}>
                    <div>
                      <div className="text-[22px] mb-1.5">🩸</div>
                      <p className="text-[22px] font-extrabold mb-0.5" style={{ color: 'var(--text-primary)' }}>{nextPeriodDate ? format(nextPeriodDate, "MMM d") : "—"}</p>
                      <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Next Period</p>
                    </div>
                    <p className="text-xs font-semibold text-[#ff6b81]">{daysUntilNext !== null ? `in ${daysUntilNext} days` : ""}</p>
                  </div>

                  {/* Card 2 - Ovulation */}
                  <div className="rounded-2xl p-[18px] flex flex-col justify-between min-h-[110px]" style={{ ...cardStyle, borderTop: '3px solid #ffa502' }}>
                    <div>
                      <div className="text-[22px] mb-1.5">🌸</div>
                      <p className="text-[22px] font-extrabold mb-0.5" style={{ color: 'var(--text-primary)' }}>{ovulationDate ? format(ovulationDate, "MMM d") : "—"}</p>
                      <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Ovulation</p>
                    </div>
                    <p className="text-xs font-semibold text-[#ffa502]">
                      {fertileStart && fertileEnd ? `fertile ${format(fertileStart, "MMM d")}–${format(fertileEnd, "d")}` : ""}
                    </p>
                  </div>

                  {/* Card 3 - Cycle Day */}
                  <div className="rounded-2xl p-[18px] flex flex-col justify-between min-h-[110px]" style={{ ...cardStyle, borderTop: '3px solid var(--accent-green)' }}>
                    <div>
                      <div className="text-[22px] mb-1.5">📅</div>
                      <p className="text-[22px] font-extrabold mb-0.5" style={{ color: 'var(--text-primary)' }}>Day {currentCycleDay ?? "—"}</p>
                      <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Current Day</p>
                    </div>
                    {currentCycleDay !== null && (
                      <div className="w-full rounded-full h-1 mt-2" style={{ background: 'var(--border-default)' }}>
                        <div className="h-1 rounded-full transition-all" style={{ width: `${Math.min(100, (currentCycleDay / cycleLength) * 100)}%`, background: 'var(--accent-green)' }} />
                      </div>
                    )}
                  </div>

                  {/* Card 4 - Cycle Length */}
                  <div className="rounded-2xl p-[18px] flex flex-col justify-between min-h-[110px]" style={{ ...cardStyle, borderTop: '3px solid #a29bfe' }}>
                    <div>
                      <div className="text-[22px] mb-1.5">🔄</div>
                      <p className="text-[22px] font-extrabold mb-0.5" style={{ color: 'var(--text-primary)' }}>{cycleLength} days</p>
                      <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Avg Cycle</p>
                    </div>
                    <p className="text-xs font-semibold text-[#a29bfe]">{periodDuration} day period</p>
                  </div>
                </div>

                {/* RIGHT — Log Today card (full height) */}
                <div className="rounded-2xl p-5 h-full flex flex-col" style={cardStyle}>
                  <h3 className="text-[15px] font-bold mb-0.5" style={{ color: 'var(--accent-green)' }}>Log Today</h3>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{format(today, "EEEE, MMMM d")}</p>

                  {/* Flow Buttons */}
                  <p className="text-[13px] mb-2" style={{ color: 'var(--text-secondary)' }}>How's your flow today?</p>
                  <div className="flex gap-2 mb-3.5">
                    {[
                      { id: "light", label: "💧 Light" },
                      { id: "medium", label: "🌊 Medium" },
                      { id: "heavy", label: "🌊🌊 Heavy" },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setLogFlow(f.id)}
                        className="px-3.5 h-[34px] rounded-full text-[13px] transition-all"
                        style={logFlow === f.id ? chipActive : chipBase}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Symptoms Grid */}
                  <p className="text-[13px] mb-2" style={{ color: 'var(--text-secondary)' }}>Symptoms today:</p>
                  <div className="grid grid-cols-2 gap-2 mb-3.5">
                    {symptomChips.map(s => (
                      <button
                        key={s.label}
                        onClick={() => setLogSymptoms(p => p.includes(s.label) ? p.filter(x => x !== s.label) : [...p, s.label])}
                        className="px-3 rounded-[10px] text-[13px] h-[38px] flex items-center gap-1.5 transition-all text-left"
                        style={logSymptoms.includes(s.label) ? chipActive : chipBase}
                      >
                        {s.emoji} {s.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={saveSymptomLog}
                    disabled={!logFlow || savingLog}
                    className="w-full rounded-[10px] text-sm font-bold h-11 transition-colors disabled:opacity-50 mt-auto"
                    style={{ background: 'var(--accent-green)', color: '#000' }}
                  >
                    {savingLog ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : "💾"} Save Log
                  </button>
                </div>
              </div>

              {/* Edit cycle settings link */}
              <button onClick={() => setShowSetup(true)} className="text-xs underline block text-center mb-2" style={{ color: 'var(--text-muted)' }}>
                Edit cycle settings
              </button>
            </div>
          )}

          {/* ═══════════ PERIOD HISTORY SECTION ═══════════ */}
          {!showSetup && (
             <div className="rounded-2xl p-5 mt-5" style={cardStyle}>
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  🗓️ Past Period History
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{periodHistory.length} cycles tracked</span>
                  <button
                    onClick={() => setShowNewPeriodForm(!showNewPeriodForm)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-[#ff4757]/15 border border-[#ff4757] text-[#ff6b7a] hover:bg-[#ff4757]/25 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log New Period
                  </button>
                </div>
              </div>

              {/* Log New Period Form */}
              {showNewPeriodForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="rounded-[16px] p-5 mb-5"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}
                >
                  <h4 className="text-[14px] font-bold text-[#ff6b7a] mb-4">Log a Past Period</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-[12px] mb-2 block" style={{ color: 'var(--text-secondary)' }}>Period start date:</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn("w-full justify-start text-left rounded-[10px] py-3 px-4 text-[14px]", !newPeriodDate && "opacity-60")}
                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                          >
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {newPeriodDate ? format(newPeriodDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start" style={cardStyle}>
                          <Calendar mode="single" selected={newPeriodDate} onSelect={setNewPeriodDate} disabled={(d) => d > new Date()} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <label className="text-[12px] mb-2 block" style={{ color: 'var(--text-secondary)' }}>Duration: {newPeriodDuration} days</label>
                      <Slider value={[newPeriodDuration]} onValueChange={([v]) => setNewPeriodDuration(v)} min={3} max={7} step={1} className="mt-4" />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-[12px] mb-2 block" style={{ color: 'var(--text-secondary)' }}>Flow:</label>
                    <div className="flex gap-2">
                      {["light", "medium", "heavy"].map(f => (
                        <button
                          key={f}
                          onClick={() => setNewPeriodFlow(f)}
                          className="px-4 py-2 rounded-[20px] text-[13px] transition-all capitalize"
                          style={newPeriodFlow === f
                            ? { background: 'rgba(255,71,87,0.15)', border: '1px solid #ff4757', color: '#ff6b7a' }
                            : chipBase
                          }
                        >
                          {f === "light" ? "💧" : f === "medium" ? "🌊" : "🌊🌊"} {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-[12px] mb-2 block" style={{ color: 'var(--text-secondary)' }}>Symptoms:</label>
                    <div className="flex flex-wrap gap-2">
                      {symptomChips.map(s => (
                        <button
                          key={s.label}
                          onClick={() => setNewPeriodSymptoms(p => p.includes(s.label) ? p.filter(x => x !== s.label) : [...p, s.label])}
                          className="px-3 py-1.5 rounded-[20px] text-[12px] transition-all"
                          style={newPeriodSymptoms.includes(s.label)
                            ? { background: 'rgba(255,71,87,0.1)', border: '1px solid #ff4757', color: '#ff6b7a' }
                            : chipBase
                          }
                        >
                          {s.emoji} {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={saveNewPeriod}
                      disabled={!newPeriodDate || savingLog}
                      className="flex-1 bg-[#ff4757] text-white py-3 rounded-[10px] font-bold transition-colors hover:bg-[#ff5f6d] disabled:opacity-50"
                    >
                      {savingLog ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
                      Save Period
                    </button>
                    <button
                      onClick={() => setShowNewPeriodForm(false)}
                      className="px-4 py-3 rounded-[10px] transition-colors"
                      style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Empty State */}
              {periodHistory.length === 0 && (
                <div className="rounded-[12px] p-8 text-center" style={{ background: 'var(--bg-hover)', border: '1px dashed var(--border-default)' }}>
                  <div className="text-4xl mb-3">🩸</div>
                  <p className="text-[16px] mb-2" style={{ color: 'var(--text-primary)' }}>No period history yet</p>
                  <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Your logged periods will appear here so you can track patterns over time.</p>
                </div>
              )}

              {periodHistory.length === 1 && (
                <div className="rounded-[12px] p-6 text-center" style={{ background: 'var(--bg-hover)', border: '1px dashed var(--border-default)' }}>
                  <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>📊 Track 2+ cycles to see patterns and insights</p>
                </div>
              )}

              {/* Cycle Insights Banner */}
              {periodHistory.length >= 2 && (() => {
                const avgCycleLength = periodHistory.length > 1
                  ? Math.round(
                      periodHistory.slice(0, -1).reduce((sum, p, i) => {
                        const next = periodHistory[i + 1];
                        if (!p.last_period_date || !next?.last_period_date) return sum;
                        return sum + Math.abs(differenceInDays(new Date(p.last_period_date), new Date(next.last_period_date)));
                      }, 0) / (periodHistory.length - 1)
                    )
                  : null;
                const avgDuration = Math.round(periodHistory.reduce((sum, p) => sum + (p.period_duration || 5), 0) / periodHistory.length);

                return (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="px-3.5 py-1.5 rounded-full text-xs h-[30px] flex items-center" style={{ background: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)' }}>
                      ⏱️ Avg cycle: {avgCycleLength || cycleLength} days
                    </div>
                    <div className="px-3.5 py-1.5 rounded-full bg-[#ff4757]/10 border border-[#ff4757] text-[#ff6b7a] text-xs h-[30px] flex items-center">
                      🩸 Avg duration: {avgDuration} days
                    </div>
                    <div className="px-3.5 py-1.5 rounded-full bg-[#5352ed]/10 border border-[#5352ed] text-[#7b7aff] text-xs h-[30px] flex items-center">
                      📈 {periodHistory.length} cycles tracked
                    </div>
                  </div>
                );
              })()}

              {/* History Timeline */}
              {periodHistory.length >= 1 && (
                <div className="space-y-2.5">
                  {periodHistory.map((h, i) => {
                    const startDate = h.last_period_date ? new Date(h.last_period_date) : null;
                    const endDate = startDate ? addDays(startDate, (h.period_duration || 5) - 1) : null;
                    const prevPeriod = periodHistory[i + 1];
                    const cycleGap = startDate && prevPeriod?.last_period_date
                      ? differenceInDays(startDate, new Date(prevPeriod.last_period_date))
                      : null;
                    const isExpanded = expandedHistoryId === h.id;
                    const isLast = i === periodHistory.length - 1;

                    return (
                      <div key={h.id || i} className="relative">
                        <div className="absolute left-[5px] top-0 bottom-0 flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-[#ff4757] z-10 mt-6" />
                          {!isLast && <div className="w-0.5 flex-1 -mt-0.5" style={{ background: 'var(--border-default)' }} />}
                        </div>

                        <div className="ml-8 rounded-xl p-4 relative" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}>
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                Period {periodHistory.length - i}
                              </span>
                              <div className="text-base font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                                {startDate && endDate ? <>{format(startDate, "MMM d")} → {format(endDate, "MMM d, yyyy")}</> : "—"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full bg-[#ff4757]/10 text-[#ff6b7a] text-xs">
                                {h.period_duration || 5} days
                              </span>
                              <button
                                onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)}
                                className="p-1.5 rounded-full transition-colors"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {cycleGap !== null && (
                            <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                              {cycleGap} days since last period
                              {cycleGap < 21 || cycleGap > 35 ? (
                                <span className="ml-2 text-[#ffa502]">⚠️ irregular</span>
                              ) : (
                                <span className="ml-2" style={{ color: 'var(--accent-green)' }}>✓ regular</span>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-1.5">
                            {h.symptoms?.length > 0 && h.symptoms.map((s: string) => (
                              <span key={s} className="px-2.5 py-0.5 rounded-full text-[11px]" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                                {s}
                              </span>
                            ))}
                            {h.flow_intensity && (
                              <span className={cn("px-2.5 py-0.5 rounded-full text-[11px]",
                                h.flow_intensity === "light" ? "bg-[#00b8d9]/10 text-[#00b8d9]" :
                                h.flow_intensity === "medium" ? "bg-[#5352ed]/10 text-[#7b7aff]" :
                                "bg-[#ff4757]/10 text-[#ff6b7a]"
                              )}>
                                {h.flow_intensity === "light" ? "💧" : h.flow_intensity === "medium" ? "🌊" : "🌊🌊"} {h.flow_intensity}
                              </span>
                            )}
                          </div>

                          {startDate && (
                            <button onClick={() => setCurrentMonth(startDate)} className="flex items-center gap-1 text-xs mt-2 hover:underline" style={{ color: 'var(--accent-green)' }}>
                              📅 View on calendar
                            </button>
                          )}

                          {isExpanded && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
                              <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                                {h.notes || "No additional notes recorded."}
                              </p>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ PREGNANCY TAB ═══════════ */}
      {tab === "pregnancy" && (
        <div className="space-y-4 max-w-[600px] mx-auto">
          {!pregnancyData ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[20px] p-10 text-center"
              style={{ ...cardStyle, borderTop: '3px solid #ffa502' }}
            >
              <Baby className="w-12 h-12 text-[#ffa502] mx-auto mb-4" />
              <h2 className="text-[22px] font-bold mb-8" style={{ color: 'var(--text-primary)' }}>Start Pregnancy Tracking</h2>

              <div className="text-left mb-6">
                <label className="text-[13px] mb-2 block" style={{ color: 'var(--text-secondary)' }}>When was your last menstrual period?</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left rounded-[10px] py-3.5 px-4 text-[15px]", !lmpDate && "opacity-60")}
                      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                      {lmpDate ? format(lmpDate, "PPP") : "Pick LMP date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" style={cardStyle}>
                    <Calendar mode="single" selected={lmpDate} onSelect={setLmpDate} disabled={(d) => d > new Date()} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="text-[12px] my-4" style={{ color: 'var(--text-muted)' }}>— or enter due date directly —</div>

              <div className="text-left mb-6">
                <label className="text-[13px] mb-2 block" style={{ color: 'var(--text-secondary)' }}>Due date (if known):</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left rounded-[10px] py-3.5 px-4 text-[15px]", !directDueDate && "opacity-60")}
                      style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                      {directDueDate ? format(directDueDate, "PPP") : "Pick due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" style={cardStyle}>
                    <Calendar mode="single" selected={directDueDate} onSelect={setDirectDueDate} disabled={(d) => d < new Date()} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <button
                onClick={savePregnancy}
                disabled={(!lmpDate && !directDueDate) || savingPregnancy}
                className="w-full bg-[#ffa502] text-black py-4 rounded-[12px] text-[16px] font-bold mt-4 hover:bg-[#ffb020] transition-colors disabled:opacity-50"
              >
                {savingPregnancy ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
                Start Tracking My Pregnancy
              </button>
            </motion.div>
          ) : (
            <>
              {/* Hero Week Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-[20px] p-8 text-center"
                style={{ ...cardStyle, background: `linear-gradient(135deg, var(--bg-hover), var(--bg-surface))` }}
              >
                <p className="text-6xl mb-3">{babySize.emoji}</p>
                <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Your baby is the size of a</p>
                <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{babySize.name}</p>
                <p className="text-5xl font-extrabold mt-4" style={{ color: 'var(--accent-green)' }}>Week {weeksPregnant}</p>
                <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>of 40</p>
                <div className="w-full rounded-full h-3 mt-5" style={{ background: 'var(--border-default)' }}>
                  <div className="h-3 rounded-full transition-all" style={{ width: `${(weeksPregnant / 40) * 100}%`, background: 'var(--accent-green)' }} />
                </div>
                <p className="text-[13px] mt-2" style={{ color: 'var(--text-secondary)' }}>{40 - weeksPregnant} weeks to go</p>
                <span className={cn("inline-block mt-3 px-4 py-1.5 rounded-full text-[13px] font-medium",
                  trimester === 1 ? "bg-[#2ed573]/20 text-[#2ed573]" :
                  trimester === 2 ? "bg-[#ffa502]/20 text-[#ffa502]" :
                  "bg-[#ff4757]/20 text-[#ff4757]"
                )}>
                  {trimester === 1 ? "1st" : trimester === 2 ? "2nd" : "3rd"} Trimester
                </span>
              </motion.div>

              {/* Due Date Card */}
              <div className="rounded-[16px] p-5 text-center" style={cardStyle}>
                <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>📅 Due Date</p>
                <p className="text-[20px] font-bold" style={{ color: 'var(--text-primary)' }}>{pregDueDate ? format(pregDueDate, "MMMM d, yyyy") : "—"}</p>
                <p className="text-[14px]" style={{ color: 'var(--accent-green)' }}>{daysToGo} days to go</p>
              </div>

              {/* AI Weekly Tip */}
              <div className="rounded-[16px] p-6" style={cardStyle}>
                <h3 className="text-[14px] font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--accent-green)' }}>
                  <Sparkles className="h-4 w-4" /> Week {weeksPregnant} Tip
                </h3>
                {tipLoading ? (
                  <div className="flex items-center gap-2 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                    <Loader2 className="h-4 w-4 animate-spin" /> Getting your tip...
                  </div>
                ) : (
                  <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{pregnancyTip}</p>
                )}
                <button onClick={() => getPregnancyTip(weeksPregnant)} className="text-[12px] mt-3 underline" style={{ color: 'var(--accent-green)' }}>
                  Refresh tip
                </button>
              </div>

              {/* Important Milestones */}
              <div className="rounded-[16px] p-6" style={cardStyle}>
                <h3 className="text-[14px] font-bold mb-4" style={{ color: 'var(--accent-green)' }}>📋 Important Milestones</h3>
                <div className="space-y-2">
                  {importantDates.map(d => (
                    <div key={d.week} className="flex items-center gap-3 py-1.5" style={{ color: d.week <= weeksPregnant ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      <span className="text-[14px]">{d.week <= weeksPregnant ? "✅" : "⬜"}</span>
                      <span className="text-[14px]">Week {d.week}: {d.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger Signs */}
              <div className="bg-[#ff4757]/10 border border-[#ff4757]/30 rounded-[16px] p-6">
                <h3 className="text-[14px] font-bold text-[#ff4757] mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> See a doctor immediately if:
                </h3>
                <ul className="space-y-1.5 text-[14px]" style={{ color: 'var(--text-primary)' }}>
                  <li>• Heavy bleeding</li>
                  <li>• Severe abdominal pain</li>
                  <li>• Baby not moving after week 28</li>
                  <li>• Severe headache + vision changes</li>
                  <li>• High fever</li>
                </ul>
                <button
                  onClick={() => navigate("/patient/book-doctor")}
                  className="w-full bg-[#ff4757] text-white py-3 rounded-[10px] font-bold mt-4 hover:bg-[#ff5f6d] transition-colors"
                >
                  📞 Book Doctor Now
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════ GENERAL TAB ═══════════ */}
      {tab === "general" && (
        <div className="space-y-4 max-w-[600px] mx-auto">
          {/* AI Health Assistant */}
          <div className="rounded-[16px] p-6" style={cardStyle}>
            <h3 className="text-[14px] font-bold mb-4" style={{ color: 'var(--accent-green)' }}>💬 AI Women's Health Assistant</h3>

            <div className="flex flex-wrap gap-2 mb-4">
              {quickQuestions.map(q => (
                <button
                  key={q}
                  onClick={() => askHealthQuestion(q)}
                  className="px-3 py-1.5 rounded-full text-[12px] transition-colors"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={healthQuestion}
                onChange={(e) => setHealthQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askHealthQuestion()}
                placeholder="Ask any health question..."
                className="flex-1 rounded-[10px] px-4 py-3 text-[14px] focus:outline-none"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
              <button
                onClick={() => askHealthQuestion()}
                disabled={!healthQuestion.trim() || askingAi}
                className="px-5 py-3 rounded-[10px] font-bold transition-colors disabled:opacity-50"
                style={{ background: 'var(--accent-green)', color: '#000' }}
              >
                {askingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>

            {aiAnswer && (
              <div className="mt-4 p-4 rounded-[10px]" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}>
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{aiAnswer}</p>
              </div>
            )}
          </div>

          {/* Health Reminders */}
          <div className="rounded-[16px] p-6" style={cardStyle}>
            <h3 className="text-[14px] font-bold mb-4" style={{ color: 'var(--accent-green)' }}>🔔 Health Reminders</h3>
            <div className="space-y-3">
              {periodData && daysUntilNext !== null && daysUntilNext > 0 && daysUntilNext <= 7 && (
                <div className="flex items-center gap-3 p-3 bg-[#ff4757]/10 rounded-[10px] border border-[#ff4757]/20">
                  <span className="text-xl">🩸</span>
                  <p className="text-[14px]" style={{ color: 'var(--text-primary)' }}>Period due in {daysUntilNext} days — stock up on supplies</p>
                </div>
              )}
              {pregnancyData && weeksPregnant >= 8 && (
                <div className="flex items-center gap-3 p-3 bg-[#ffa502]/10 rounded-[10px] border border-[#ffa502]/20">
                  <span className="text-xl">👶</span>
                  <p className="text-[14px]" style={{ color: 'var(--text-primary)' }}>Time for Week {weeksPregnant} checkup</p>
                </div>
              )}
              {[
                { emoji: "💊", text: "Take iron supplements daily" },
                { emoji: "🥗", text: "Eat iron-rich foods: spinach, lentils, jaggery" },
                { emoji: "💧", text: "Drink 8 glasses of water" },
              ].map(r => (
                <div key={r.text} className="flex items-center gap-3 p-3 rounded-[10px]" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}>
                  <span className="text-xl">{r.emoji}</span>
                  <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WomensHealth;
