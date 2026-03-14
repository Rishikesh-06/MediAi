import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Stethoscope, Star, Globe, Calendar, Search, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

const generateTimeSlots = () => {
  const slots: string[] = [];
  // Morning: 9 AM to 12 PM
  for (let h = 9; h < 12; h++) {
    slots.push(`${h}:00 AM`);
    slots.push(`${h}:30 AM`);
  }
  // Afternoon: 12 PM to 5 PM
  slots.push("12:00 PM");
  slots.push("12:30 PM");
  for (let h = 1; h < 5; h++) {
    slots.push(`${h}:00 PM`);
    slots.push(`${h}:30 PM`);
  }
  // Evening: 5 PM to 8 PM
  for (let h = 5; h < 8; h++) {
    slots.push(`${h}:00 PM`);
    slots.push(`${h}:30 PM`);
  }
  return slots;
};

const ALL_SLOTS = generateTimeSlots();

const parseTimeSlotToDate = (dateStr: string, timeSlot: string): Date => {
  const [timePart, ampm] = timeSlot.split(" ");
  const [hourStr, minStr] = timePart.split(":");
  let hour = parseInt(hourStr);
  const min = parseInt(minStr);
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  const d = new Date(dateStr);
  d.setHours(hour, min, 0, 0);
  return d;
};

const BookDoctor = () => {
  const patient = useAppStore((s) => s.currentPatient);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [booked, setBooked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from('doctors').select('*').eq('is_online', true).order('rating', { ascending: false });
      const docs = data || [];
      setDoctors(docs);
      const uniqueSpecs = [...new Set(docs.map((d: any) => d.specialty).filter(Boolean))];
      setSpecialties(uniqueSpecs);
      setLoading(false);
    };
    load();
  }, []);

  // Fetch booked slots when doctor or date changes
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!selectedDoctor || !selectedDate) {
        setBookedSlots([]);
        return;
      }
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data } = await supabase
        .from("appointments")
        .select("date_time, time_slot")
        .eq("doctor_id", selectedDoctor.id)
        .gte("date_time", startOfDay.toISOString())
        .lte("date_time", endOfDay.toISOString())
        .neq("status", "cancelled");

      if (data) {
        const booked = data.map((apt: any) => {
          if (apt.time_slot) return apt.time_slot;
          const d = new Date(apt.date_time);
          let h = d.getHours();
          const m = d.getMinutes();
          const ampm = h >= 12 ? "PM" : "AM";
          if (h > 12) h -= 12;
          if (h === 0) h = 12;
          return `${h}:${m === 0 ? "00" : "30"} ${ampm}`;
        });
        setBookedSlots(booked);
      }
    };
    fetchBookedSlots();
  }, [selectedDoctor, selectedDate]);

  const filtered = doctors.filter(d =>
    (specialty === "All" || d.specialty === specialty) &&
    (!search || d.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleBook = async () => {
    if (!patient || !selectedDoctor || !selectedDate || !selectedTime) return;
    try {
      const combinedDateTime = parseTimeSlotToDate(selectedDate, selectedTime);
      await supabase.from('appointments').insert({
        patient_id: patient.id,
        doctor_id: selectedDoctor.id,
        hospital_id: selectedDoctor.hospital_id,
        date_time: combinedDateTime.toISOString(),
        time_slot: selectedTime,
        status: 'confirmed',
        payment_amount: selectedDoctor.consultation_fee || 60,
        type: 'video',
      } as any);
      setBooked(true);
      toast({ title: "Appointment booked! ✅" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (booked) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
            <Check className="h-10 w-10 text-primary" />
          </div>
        </motion.div>
        <h2 className="font-display text-2xl font-bold text-foreground">Appointment Confirmed! 🎉</h2>
        <div className="glass-card p-5 w-full max-w-sm">
          <p className="text-sm text-foreground"><strong>{selectedDoctor?.name}</strong></p>
          <p className="text-xs text-muted-foreground">{selectedDoctor?.specialty}</p>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" /> {selectedDate} at {selectedTime}
          </div>
          <p className="text-xs text-primary mt-2">₹{selectedDoctor?.consultation_fee || 60} • Video Consultation</p>
        </div>
        <button onClick={() => { setBooked(false); setSelectedDoctor(null); setSelectedTime(""); }}
          className="text-sm text-primary font-semibold">Book Another</button>
      </div>
    );
  }

  if (selectedDoctor) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => { setSelectedDoctor(null); setSelectedTime(""); setBookedSlots([]); }} className="text-sm text-muted-foreground">← Back to doctors</button>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-info/10 flex items-center justify-center">
            <Stethoscope className="h-8 w-8 text-info" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">{selectedDoctor.name}</h2>
            <p className="text-sm text-muted-foreground">{selectedDoctor.specialty}</p>
            <div className="flex items-center gap-2 mt-1">
              <Star className="h-4 w-4 text-urgent fill-urgent" />
              <span className="text-sm text-foreground">{selectedDoctor.rating}</span>
              <Globe className="h-3 w-3 text-muted-foreground ml-2" />
              <span className="text-xs text-muted-foreground">{selectedDoctor.languages?.join(", ")}</span>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="font-display font-bold text-foreground mb-3">Select Date</h3>
          <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setSelectedTime(""); }}
            min={new Date().toISOString().split('T')[0]}
            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        {selectedDate && (
          <div className="glass-card p-5">
            <h3 className="font-display font-bold text-foreground mb-3">Select Time</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {ALL_SLOTS.map(t => {
                const isBooked = bookedSlots.includes(t);
                return (
                  <button
                    key={t}
                    disabled={isBooked}
                    onClick={() => !isBooked && setSelectedTime(t)}
                    className={`py-2 rounded-xl text-sm font-medium transition-all relative ${
                      isBooked
                        ? "bg-destructive/10 border border-destructive/20 text-destructive/50 cursor-not-allowed opacity-60"
                        : selectedTime === t
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-primary/20"
                    }`}
                  >
                    {t}
                    {isBooked && (
                      <span className="block text-[10px] text-destructive font-medium mt-0.5">
                        Booked
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {selectedDate && selectedTime && (
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Consultation Fee</span>
              <span className="font-mono text-lg font-bold text-foreground">₹{selectedDoctor.consultation_fee || 60}</span>
            </div>
            <motion.button whileTap={{ scale: 0.98 }} onClick={handleBook}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg">
              Confirm Booking
            </motion.button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="font-display text-2xl font-bold text-foreground">Book a Doctor 🩺</h2>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input placeholder="Search by name" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full bg-secondary/50 border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>
      {specialties.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
          {["All", ...specialties].map(s => (
            <button key={s} onClick={() => setSpecialty(s)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all ${specialty === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading doctors...</div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-4xl mb-4">👨‍⚕️</p>
            <p className="text-foreground font-bold text-lg">No doctors available right now</p>
            <p className="text-sm text-muted-foreground mt-1">Please check back later or call your nearest PHC</p>
          </div>
        ) : (
          filtered.map(d => (
            <motion.button key={d.id} whileHover={{ scale: 1.01 }} onClick={() => setSelectedDoctor(d)}
              className="glass-card-hover p-4 w-full text-left flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-info/10 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="h-6 w-6 text-info" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.specialty}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="h-3 w-3 text-urgent fill-urgent" />
                  <span className="text-xs text-foreground">{d.rating}</span>
                  <span className="text-xs text-muted-foreground">• {d.languages?.join(", ")}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="badge-safe text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Online</span>
                <p className="text-xs text-muted-foreground mt-1">₹{d.consultation_fee || 60}</p>
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
};

export default BookDoctor;
