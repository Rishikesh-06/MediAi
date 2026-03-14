import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";

const cards = [
  {
    id: "full-body",
    icon: "🩺",
    title: "Full Body Checkup",
    description: "Check your vitals, symptoms & get AI-powered diagnosis with downloadable report",
    buttonText: "Start Checkup →",
    path: "/patient/health-check/full-body",
  },
  {
    id: "womens-health",
    icon: "💗",
    title: "Women's Health",
    description: "Period tracker, pregnancy week guide & general women's wellness assistant",
    buttonText: "Open →",
    path: "/patient/health-check/womens-health",
  },
  {
    id: "mental-health",
    icon: "🧠",
    title: "Mental Health",
    description: "Safe space for mood check-ins, stress tracking & emotional wellness support",
    buttonText: "Open →",
    path: "/patient/health-check/mental-health",
  },
];

const HealthCheckHub = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            🏥 Health Check
          </h1>
          <p className="text-muted-foreground mt-2">
            Choose what you'd like to check today
          </p>
        </div>

        {/* 3 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {cards.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              onClick={() => navigate(card.path)}
              className={`hub-card hub-card-${card.id} rounded-2xl p-6 md:p-7 cursor-pointer flex flex-col gap-3 min-h-[220px] border border-border/50 bg-card transition-all duration-200 hover:shadow-lg`}
            >
              {/* Icon */}
              <span className="text-4xl">{card.icon}</span>

              {/* Title */}
              <h2 className="text-lg font-bold text-foreground">{card.title}</h2>

              {/* Description */}
              <p className="text-sm text-muted-foreground flex-1">{card.description}</p>

              {/* Button */}
              <button
                className={`hub-btn-${card.id} mt-auto self-start px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-primary text-primary-foreground`}
              >
                {card.buttonText}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
};

export default HealthCheckHub;
