import { motion } from "framer-motion";
import { useState } from "react";
import { Salad, Dumbbell, Droplets, Moon, Loader2 } from "lucide-react";
import { generateWellnessPlan } from "@/lib/ai";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

const goals = [
  { emoji: "🏃", label: "Lose weight" },
  { emoji: "💪", label: "Stay fit" },
  { emoji: "🩸", label: "Manage diabetes" },
  { emoji: "❤️", label: "Control BP" },
  { emoji: "🌟", label: "General wellness" },
  { emoji: "🤰", label: "Healthy pregnancy" },
];

const Wellness = () => {
  const patient = useAppStore((s) => s.currentPatient);
  const [selectedGoal, setSelectedGoal] = useState("");
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [waterCount, setWaterCount] = useState(0);

  const generatePlan = async () => {
    setIsLoading(true);
    try {
      const result = await generateWellnessPlan({
        age: patient?.age || 30,
        gender: patient?.gender || "Male",
        conditions: selectedConditions.join(", ") || "None",
        goal: selectedGoal,
      });
      setPlan(result);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Creating your personalized wellness plan...</p>
      </div>
    );
  }

  if (plan) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Your Wellness Plan 🌿</h2>

        {/* Diet */}
        {plan.diet && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Salad className="h-5 w-5 text-primary" />
              <h3 className="font-display font-bold text-foreground">Diet Plan</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">🌅 Breakfast: </span><span className="text-foreground">{plan.diet.breakfast}</span></div>
              <div><span className="text-muted-foreground">🌞 Lunch: </span><span className="text-foreground">{plan.diet.lunch}</span></div>
              <div><span className="text-muted-foreground">🌙 Dinner: </span><span className="text-foreground">{plan.diet.dinner}</span></div>
              <div><span className="text-muted-foreground">🍎 Snacks: </span><span className="text-foreground">{plan.diet.snacks}</span></div>
              {plan.diet.avoid?.length > 0 && (
                <div className="mt-2 p-2 rounded-lg bg-destructive/10">
                  <span className="text-xs text-destructive">⚠️ Avoid: {plan.diet.avoid.join(", ")}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Exercise */}
        {plan.exercise?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell className="h-5 w-5 text-info" />
              <h3 className="font-display font-bold text-foreground">Exercise Plan</h3>
            </div>
            <div className="space-y-3">
              {plan.exercise.map((ex: any, i: number) => (
                <div key={i} className="glass-card p-3">
                  <p className="text-sm font-semibold text-foreground">{ex.name} — {ex.duration}</p>
                  <p className="text-xs text-muted-foreground">{ex.instructions}</p>
                  <span className="badge-info text-xs mt-1 inline-block">{ex.level}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Water tracker */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Droplets className="h-5 w-5 text-info" />
            <h3 className="font-display font-bold text-foreground">Water Intake</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{plan.water_intake || "Drink 8 glasses of water daily"}</p>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.button key={i} whileTap={{ scale: 0.9 }}
                onClick={() => setWaterCount(Math.max(waterCount, i + 1))}
                className={`w-10 h-12 rounded-xl flex items-center justify-center text-lg ${i < waterCount ? "bg-info/20" : "bg-secondary"}`}>
                {i < waterCount ? "💧" : "🫗"}
              </motion.button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{waterCount}/8 glasses today</p>
        </motion.div>

        {/* Home remedies */}
        {plan.home_remedies?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card p-5">
            <h3 className="font-display font-bold text-foreground mb-3">🌿 Home Remedies</h3>
            <div className="space-y-2">
              {plan.home_remedies.map((r: string, i: number) => (
                <p key={i} className="text-sm text-foreground">• {r}</p>
              ))}
            </div>
          </motion.div>
        )}

        {plan.weekly_challenge && (
          <div className="glass-card p-5 glow-border">
            <h3 className="font-display font-bold text-primary mb-2">🏆 Weekly Challenge</h3>
            <p className="text-sm text-foreground">{plan.weekly_challenge}</p>
          </div>
        )}

        <button onClick={() => setPlan(null)} className="w-full py-3 rounded-xl bg-secondary text-sm text-muted-foreground">← Generate New Plan</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">Wellness & Prevention 🌿</h2>
        <p className="text-muted-foreground text-sm">Prevention is better than cure</p>
      </div>

      <div className="glass-card p-5">
        <p className="text-sm font-semibold text-foreground mb-3">What's your goal?</p>
        <div className="grid grid-cols-2 gap-3">
          {goals.map(g => (
            <motion.button key={g.label} whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedGoal(g.label)}
              className={`p-3 rounded-xl text-sm text-left transition-all ${selectedGoal === g.label ? "bg-primary/20 glow-border" : "bg-secondary hover:bg-secondary/80"}`}>
              <span className="text-lg mr-2">{g.emoji}</span> {g.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="glass-card p-5">
        <p className="text-sm font-semibold text-foreground mb-3">Any existing conditions?</p>
        <div className="flex flex-wrap gap-2">
          {["Diabetes", "Hypertension", "Obesity", "PCOS", "Thyroid", "None"].map(c => (
            <button key={c} onClick={() => setSelectedConditions(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
              className={`px-4 py-2 rounded-full text-sm transition-all ${selectedConditions.includes(c) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <motion.button whileTap={{ scale: 0.98 }} onClick={generatePlan}
        disabled={!selectedGoal}
        className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg disabled:opacity-50 animate-pulse-glow">
        🌟 Create My Wellness Plan
      </motion.button>
    </div>
  );
};

export default Wellness;
