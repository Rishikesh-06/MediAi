import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Brain, Smile, Meh, Frown, AlertTriangle, Phone, Heart, Wind } from "lucide-react";
import { assessMentalHealth } from "@/lib/ai";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

const moods = [
  { emoji: "😊", label: "Great", score: 5 },
  { emoji: "🙂", label: "Okay", score: 4 },
  { emoji: "😐", label: "Meh", score: 3 },
  { emoji: "😢", label: "Sad", score: 2 },
  { emoji: "😰", label: "Anxious", score: 1 },
];

const questions = [
  "Are you sleeping well?",
  "Do you feel hopeless sometimes?",
  "Are you able to enjoy daily activities?",
  "Do you feel very anxious or worried?",
  "Are you able to concentrate?",
  "Have you lost appetite recently?",
  "Do you feel supported by family/friends?",
];

const MentalHealth = () => {
  const patient = useAppStore((s) => s.currentPatient);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [showAssessment, setShowAssessment] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [breathePhase, setBreathePhase] = useState<'in' | 'hold' | 'out'>('in');
  const [showBreathing, setShowBreathing] = useState(false);

  useEffect(() => {
    if (!showBreathing) return;
    const phases: Array<'in' | 'hold' | 'out'> = ['in', 'hold', 'out'];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % 3;
      setBreathePhase(phases[i]);
    }, 4000);
    return () => clearInterval(interval);
  }, [showBreathing]);

  const answerQuestion = async (answer: string) => {
    const newAnswers = { ...answers, [currentQ]: answer };
    setAnswers(newAnswers);
    
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      // Submit
      setIsAnalyzing(true);
      try {
        const result = await assessMentalHealth({
          answers: Object.fromEntries(
            Object.entries(newAnswers).map(([k, v]) => [questions[parseInt(k)], v])
          ),
        });
        setResult(result);

        if (patient) {
          await supabase.from('mental_health_logs').insert({
            patient_id: patient.id,
            mood_score: selectedMood,
            answers: newAnswers,
            stress_level: result.stress_level,
            risk_level: result.risk_level,
            ai_analysis: result,
          });
        }
      } catch (e: any) {
        toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
      }
      setIsAnalyzing(false);
    }
  };

  if (isAnalyzing) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
          <Brain className="h-16 w-16 text-asha" />
        </motion.div>
        <p className="mt-4 text-muted-foreground">Analyzing your responses with care...</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 text-center"
          style={{ background: result.risk_level === 'high' ? "hsla(353, 90%, 64%, 0.06)" : result.risk_level === 'medium' ? "hsla(37, 100%, 56%, 0.06)" : "hsla(152, 100%, 45%, 0.06)" }}>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Your Mental Health Assessment</h2>
          <div className={`text-sm font-semibold mb-4 ${result.risk_level === 'high' ? "text-destructive" : result.risk_level === 'medium' ? "text-urgent" : "text-primary"}`}>
            Stress Level: {result.stress_level?.toUpperCase()}
          </div>
          <p className="text-sm text-muted-foreground">{result.explanation}</p>
        </motion.div>

        {result.recommendations?.map((r: string, i: number) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.2 }} className="glass-card p-4">
            <p className="text-sm text-foreground">💡 {r}</p>
          </motion.div>
        ))}

        {result.should_see_counselor && (
          <div className="glass-card p-5 border-urgent/30">
            <h3 className="font-bold text-urgent mb-3">We recommend speaking to a counselor</h3>
            <div className="space-y-2">
              <a href="tel:9152987821" className="flex items-center gap-3 glass-card p-3">
                <Phone className="h-5 w-5 text-primary" />
                <div><p className="text-sm font-semibold text-foreground">iCall</p><p className="text-xs text-muted-foreground">9152987821</p></div>
              </a>
              <a href="tel:18002662345" className="flex items-center gap-3 glass-card p-3">
                <Phone className="h-5 w-5 text-primary" />
                <div><p className="text-sm font-semibold text-foreground">Vandrevala Foundation</p><p className="text-xs text-muted-foreground">1860-2662-345</p></div>
              </a>
            </div>
          </div>
        )}

        <button onClick={() => setShowBreathing(true)} className="w-full py-3 rounded-xl bg-asha/20 text-foreground text-sm font-medium">
          🧘 Try Breathing Exercise
        </button>

        {showBreathing && (
          <motion.div className="glass-card p-8 text-center">
            <motion.div animate={{ scale: breathePhase === 'in' ? 1.5 : breathePhase === 'hold' ? 1.5 : 1 }}
              transition={{ duration: 4, ease: "easeInOut" }}
              className="w-24 h-24 rounded-full bg-asha/20 mx-auto flex items-center justify-center mb-4">
              <Wind className="h-8 w-8 text-asha" />
            </motion.div>
            <p className="text-lg font-display font-bold text-foreground">
              {breathePhase === 'in' ? "Breathe in..." : breathePhase === 'hold' ? "Hold..." : "Breathe out..."}
            </p>
          </motion.div>
        )}

        <button onClick={() => { setResult(null); setAnswers({}); setCurrentQ(0); setShowAssessment(false); setSelectedMood(null); }}
          className="w-full py-3 rounded-xl bg-secondary text-sm text-muted-foreground">Start Over</button>
      </div>
    );
  }

  if (showAssessment) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= currentQ ? "bg-asha" : "bg-secondary"}`} />
          ))}
        </div>
        <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-8 text-center">
          <p className="text-xs text-muted-foreground mb-4">Question {currentQ + 1} of {questions.length}</p>
          <h2 className="font-display text-xl font-bold text-foreground mb-8">{questions[currentQ]}</h2>
          <div className="space-y-3">
            {["Yes", "Sometimes", "No"].map(a => (
              <motion.button key={a} whileTap={{ scale: 0.98 }} onClick={() => answerQuestion(a)}
                className="w-full py-4 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-asha/20 transition-all">
                {a}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">This is a Safe Space 🤗</h2>
        <p className="text-muted-foreground text-sm">Your feelings matter. Let's check in.</p>
      </div>

      <div className="glass-card p-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">How are you feeling today?</p>
        <div className="flex justify-center gap-4">
          {moods.map(m => (
            <motion.button key={m.score} whileTap={{ scale: 0.9 }}
              onClick={() => setSelectedMood(m.score)}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${selectedMood === m.score ? "bg-asha/20 glow-border" : "hover:bg-secondary"}`}>
              <span className="text-3xl">{m.emoji}</span>
              <span className="text-xs text-muted-foreground">{m.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {selectedMood && selectedMood <= 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 text-center">
          <p className="text-sm text-foreground mb-4">Would you like to take a mental health assessment?</p>
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowAssessment(true)}
            className="px-6 py-3 rounded-xl bg-asha text-white font-semibold text-sm">
            Start Assessment
          </motion.button>
        </motion.div>
      )}

      {selectedMood && selectedMood > 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 text-center">
          <p className="text-sm text-foreground mb-2">That's wonderful! 🌟</p>
          <p className="text-xs text-muted-foreground">Would you still like to take a quick assessment?</p>
          <button onClick={() => setShowAssessment(true)} className="mt-3 text-sm text-asha font-semibold underline">
            Take Assessment Anyway
          </button>
        </motion.div>
      )}

      <div className="glass-card p-5">
        <h3 className="font-display font-bold text-foreground mb-3">💬 Crisis Helplines</h3>
        <div className="space-y-2">
          <a href="tel:9152987821" className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50">
            <Phone className="h-4 w-4 text-primary" />
            <div><p className="text-sm text-foreground">iCall — 9152987821</p></div>
          </a>
          <a href="tel:18002662345" className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50">
            <Phone className="h-4 w-4 text-primary" />
            <div><p className="text-sm text-foreground">Vandrevala Foundation — 1860-2662-345</p></div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default MentalHealth;
