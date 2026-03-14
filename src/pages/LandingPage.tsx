import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Activity, ChevronRight, Phone } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import ECGLine from "@/components/ECGLine";
import AnimatedCounter from "@/components/AnimatedCounter";
import ThemeToggle from "@/components/ThemeToggle";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0, 0, 0.2, 1] as const } } };

const stats = [
  { value: 25000, suffix: "+", label: "PHCs Connected" },
  { value: 2300000, suffix: "+", label: "Patients Served", prefix: "" },
  { value: 98, suffix: "%", label: "Emergency Response" },
  { value: 4.8, suffix: "★", label: "Doctor Rating" },
];

const steps = [
  { num: "01", title: "Enter Symptoms", desc: "Patient describes symptoms via voice or text in any language" },
  { num: "02", title: "AI Analysis", desc: "AI analyzes and triages — emergency, urgent, or routine" },
  { num: "03", title: "Doctor Consults", desc: "Real doctor video-calls, prescribes, hospital dispatches if needed" },
];

const LandingPage = () => {
  const navigate = useNavigate();

  const portalCards = [
    { emoji: "👤", label: "Patient", desc: "Health checks, AI diagnosis,\nemergency care & more", accent: "#00e87a", path: "/patient/login" },
    { emoji: "🩺", label: "Doctor", desc: "Manage patients, video\nconsultations & prescriptions", accent: "#00b8d9", path: "/doctor/login" },
    { emoji: "🏥", label: "Hospital Admin", desc: "Manage beds, ambulances,\nemergencies & staff", accent: "#ffa502", path: "/admin/login" },
  ];

  return (
    <div className="landing-page min-h-screen dot-grid scrollbar-thin relative overflow-x-hidden transition-colors duration-300"
      style={{ background: 'var(--bg-primary)' }}>
      <ParticleBackground />

      <motion.nav initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-2">
          <Activity className="h-7 w-7" style={{ color: 'var(--accent-green)' }} />
          <span className="font-display text-xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Medi<span style={{ color: 'var(--accent-green)' }}>AI</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <a href="tel:108" className="flex items-center gap-1.5 badge-emergency text-xs font-bold"><Phone className="h-3.5 w-3.5" /> 108</a>
        </div>
      </motion.nav>

      <section className="relative z-10 flex flex-col items-center text-center px-4 sm:px-6 pt-8 pb-4 md:pt-24 md:pb-8">
        <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-4xl w-full">
          <motion.div variants={fadeUp} className="mb-4"><span className="badge-safe text-xs uppercase tracking-widest">AI-Powered Platform</span></motion.div>
          <motion.h1 variants={fadeUp} className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold leading-tight mb-4 sm:mb-6" style={{ color: 'var(--text-primary)' }}>
            Healthcare for{" "}<span className="text-gradient-primary">Every Village</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-6 sm:mb-8" style={{ color: 'var(--text-secondary)' }}>
            AI-powered diagnosis, real doctors, zero distance — built for rural India.
          </motion.p>
          <motion.div variants={fadeUp} className="hidden sm:block"><ECGLine /></motion.div>
        </motion.div>
      </section>

      <section className="relative z-10 px-4 sm:px-6 py-8 sm:py-12 md:px-12">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-[780px] mx-auto">
          {portalCards.map((card) => (
            <motion.div key={card.label} variants={fadeUp}
              onClick={() => navigate(card.path)}
              className="portal-card rounded-[20px] sm:rounded-[24px] p-6 sm:p-9 sm:pb-7 cursor-pointer relative overflow-hidden text-center transition-all duration-300 hover:-translate-y-2 group"
              style={{ 
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
              }}
              whileHover={{
                borderColor: card.accent,
                boxShadow: `0 20px 60px ${card.accent}33`,
              }}
            >
              <div
                className="w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-2xl sm:rounded-[20px] flex items-center justify-center mx-auto mb-4 sm:mb-5 border"
                style={{ background: `${card.accent}1A`, borderColor: `${card.accent}33` }}
              >
                <span className="text-2xl sm:text-[32px]">{card.emoji}</span>
              </div>
              <h3 className="text-lg sm:text-[20px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{card.label}</h3>
              <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-line mb-4 sm:mb-6" style={{ color: 'var(--text-muted)' }}>{card.desc}</p>
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center mx-auto border transition-transform duration-300 group-hover:translate-x-1"
                style={{ background: `${card.accent}1A`, borderColor: `${card.accent}33`, color: card.accent }}
              >
                <ChevronRight className="w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Stats */}
      <section className="relative z-10 px-4 sm:px-6 py-10 sm:py-16">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="glass-card max-w-5xl mx-auto p-5 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
          {stats.map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="text-center">
              <AnimatedCounter end={typeof s.value === "number" && s.value > 10000 ? s.value / 1000 : s.value}
                suffix={typeof s.value === "number" && s.value > 10000 ? `K${s.suffix}` : s.suffix} prefix={s.prefix} />
              <p className="text-xs sm:text-sm mt-1 sm:mt-2" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 px-4 sm:px-6 py-10 sm:py-16 md:px-12">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="max-w-4xl mx-auto">
          <motion.h2 variants={fadeUp} className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-center mb-8 sm:mb-12" style={{ color: 'var(--text-primary)' }}>
            How It <span className="text-gradient-primary">Works</span>
          </motion.h2>
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            {steps.map((step) => (
              <motion.div key={step.num} variants={fadeUp} className="glass-card p-5 sm:p-6 relative">
                <span className="font-mono text-4xl sm:text-5xl font-bold absolute top-4 right-4" style={{ color: 'var(--accent-green)', opacity: 0.3 }}>{step.num}</span>
                <h3 className="font-display text-lg sm:text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{step.title}</h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t px-4 sm:px-6 py-8 sm:py-10" style={{ borderColor: 'var(--border-default)' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" style={{ color: 'var(--accent-green)' }} />
            <span className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>MediAI</span>
          </div>
          <a href="tel:108" className="flex items-center gap-2 badge-emergency px-4 py-2 text-sm font-bold"><Phone className="h-4 w-4" /> Emergency: 108</a>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>© 2026 MediAI. Built with ❤️ for rural India by Team EliteOrbit.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
