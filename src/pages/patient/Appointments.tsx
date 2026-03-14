import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import PageTransition from "@/components/PageTransition";

const Appointments = () => {
  const patient = useAppStore((s) => s.currentPatient);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!patient) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("appointments")
          .select(`*, doctors (id, name, specialty)`)
          .eq("patient_id", patient.id)
          .order("date_time", { ascending: true });

        if (!error && data) {
          setAppointments(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [patient]);

  const now = new Date();
  const upcoming = appointments.filter(
    (a) => new Date(a.date_time) >= now && a.status !== "cancelled"
  );
  const past = appointments.filter(
    (a) =>
      new Date(a.date_time) < now ||
      a.status === "completed" ||
      a.status === "cancelled"
  );
  const displayed = activeTab === "upcoming" ? upcoming : past;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "hsl(var(--primary))";
      case "pending": return "hsl(45, 93%, 55%)";
      case "completed": return "hsl(var(--muted-foreground))";
      case "cancelled": return "hsl(0, 84%, 60%)";
      case "active": return "hsl(187, 72%, 51%)";
      default: return "hsl(var(--muted-foreground))";
    }
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <PageTransition>
      <div className="max-w-[900px] mx-auto px-6 py-7">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground mb-1">
              📅 My Appointments
            </h1>
            <p className="text-sm text-muted-foreground">
              {upcoming.length} upcoming
            </p>
          </div>
          <button
            onClick={() => navigate("/patient/book-doctor")}
            className="bg-primary text-primary-foreground border-none rounded-xl px-5 py-2.5 text-sm font-bold cursor-pointer flex items-center gap-1.5"
          >
            + Book New
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {(["upcoming", "past"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-full text-sm font-semibold cursor-pointer capitalize transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground border-none"
                  : "bg-transparent border border-border text-muted-foreground"
              }`}
            >
              {tab} ({tab === "upcoming" ? upcoming.length : past.length})
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-[14px] bg-muted h-[100px]"
              />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-5xl mb-3">📅</div>
            <p className="text-base font-semibold mb-2 text-foreground">
              No {activeTab} appointments
            </p>
            <p className="text-sm mb-5">
              {activeTab === "upcoming"
                ? "Book a doctor for your next checkup"
                : "Your past appointments will appear here"}
            </p>
            {activeTab === "upcoming" && (
              <button
                onClick={() => navigate("/patient/book-doctor")}
                className="bg-primary text-primary-foreground border-none rounded-xl px-6 py-2.5 font-bold cursor-pointer"
              >
                Book a Doctor
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayed.map((apt, i) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-card border border-border rounded-[14px] p-4 flex items-center gap-4"
              >
                {/* Doctor Avatar */}
                <div className="w-12 h-12 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-xl flex-shrink-0">
                  👨‍⚕️
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[15px] font-bold text-foreground">
                      Dr. {apt.doctors?.name || "Doctor"}
                    </span>
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize border"
                      style={{
                        background: getStatusColor(apt.status) + "20",
                        color: getStatusColor(apt.status),
                        borderColor: getStatusColor(apt.status) + "40",
                      }}
                    >
                      {apt.status || "pending"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {apt.doctors?.specialty || "General Physician"}
                  </p>
                  <p className="text-xs text-secondary-foreground">
                    🕐 {formatDateTime(apt.date_time)}
                  </p>
                </div>

                {/* Type badge */}
                <div
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold flex-shrink-0 ${
                    apt.type === "video_emergency"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {apt.type === "video_emergency"
                    ? "🚨 Emergency"
                    : "📹 Video Call"}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default Appointments;
