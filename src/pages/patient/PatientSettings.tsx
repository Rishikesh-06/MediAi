import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Download, Trash2, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

const indianStates = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
];
const bloodGroups = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];
const chronicConditions = ["Diabetes","Hypertension","Heart Disease","Asthma","Thyroid","Kidney Disease","Cancer","Arthritis","PCOD","Other"];
const languageOptions = [
  { code: "en", native: "English", english: "English" },
  { code: "hi", native: "हिंदी", english: "Hindi" },
  { code: "te", native: "తెలుగు", english: "Telugu" },
];

const PatientSettings = () => {
  const patient = useAppStore((s) => s.currentPatient);
  const setPatient = useAppStore((s) => s.setPatient);
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("personal");
  const [saving, setSaving] = useState(false);

  const tabs = [
    { key: "personal", label: t("personalInfo") },
    { key: "medical", label: t("medicalInfo") },
    { key: "language", label: t("languageSettings") },
    { key: "notifications", label: t("notifications") },
    { key: "emergency", label: t("emergencyContacts") },
    { key: "account", label: t("account") },
  ];

  // Personal
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState(0);
  const [gender, setGender] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("Rajasthan");
  const [bloodGroup, setBloodGroup] = useState("");

  // Medical
  const [conditions, setConditions] = useState<string[]>([]);
  const [medications, setMedications] = useState<{ name: string; dosage: string }[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [familyHistory, setFamilyHistory] = useState<string[]>([]);

  // Language
  const [lang, setLang] = useState("en");
  const [textSize, setTextSize] = useState("medium");

  // Notifications
  const [notifMedicine, setNotifMedicine] = useState(true);
  const [notifAppointment, setNotifAppointment] = useState(true);
  const [notifEmergency, setNotifEmergency] = useState(true);
  const [notifTips, setNotifTips] = useState(false);
  const [notifVillage, setNotifVillage] = useState(false);

  // Emergency
  const [primaryContact, setPrimaryContact] = useState({ name: "", phone: "", relationship: "Spouse" });
  const [secondaryContact, setSecondaryContact] = useState({ name: "", phone: "", relationship: "Parent" });

  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    if (patient) {
      setName(patient.name || "");
      setPhone((patient as any).phone || "");
      setAge(patient.age || 0);
      setGender(patient.gender || "");
      setVillage(patient.village || "");
      setDistrict((patient as any).district || "");
      setBloodGroup((patient as any).blood_group || "");
      setLang((patient as any).preferred_language || patient.language || "en");

      const mh = (patient as any).medical_history || {};
      setConditions(mh.conditions || []);
      setAllergies(mh.allergies || []);
      setFamilyHistory(mh.family_history || []);
      if (mh.medications) {
        setMedications(mh.medications.map((m: any) => typeof m === "string" ? { name: m, dosage: "" } : m));
      }

      const ec = (patient as any).emergency_contacts || [];
      if (ec[0]) setPrimaryContact(ec[0]);
      if (ec[1]) setSecondaryContact(ec[1]);
    }
  }, [patient]);

  const savePersonal = async () => {
    if (!patient) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("patients").update({
        name, age, gender, village, district, phone, blood_group: bloodGroup,
      } as any).eq("id", patient.id);
      if (error) throw error;
      setPatient({ ...patient, name, age, gender, village, district, phone, blood_group: bloodGroup } as any);
      toast({ title: t("profileUpdated") + " ✅" });
    } catch (e: any) {
      toast({ title: t("error"), description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const saveMedical = async () => {
    if (!patient) return;
    setSaving(true);
    try {
      const medHistory = { conditions, allergies, medications, family_history: familyHistory };
      const { error } = await supabase.from("patients").update({
        medical_history: medHistory,
      } as any).eq("id", patient.id);
      if (error) throw error;
      setPatient({ ...patient, medical_history: medHistory } as any);
      toast({ title: t("medicalInfoSaved") + " ✅" });
    } catch (e: any) {
      toast({ title: t("error"), description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const changeLang = async (code: string) => {
    setLang(code);
    i18n.changeLanguage(code);
    localStorage.setItem("mediai_language", code);
    if (patient) {
      await supabase.from("patients").update({ preferred_language: code } as any).eq("id", patient.id);
      setPatient({ ...patient, preferred_language: code } as any);
    }
    toast({ title: t("languageUpdated") + " ✅" });
  };

  const saveEmergencyContacts = async () => {
    if (!patient) return;
    setSaving(true);
    try {
      const contacts = [primaryContact, secondaryContact].filter(c => c.name);
      const { error } = await supabase.from("patients").update({
        emergency_contacts: contacts,
      } as any).eq("id", patient.id);
      if (error) throw error;
      toast({ title: t("contactsSaved") + " ✅" });
    } catch (e: any) {
      toast({ title: t("error"), description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const saveNotifications = async () => {
    if (!patient) return;
    try {
      const prefs = { medicine: notifMedicine, appointment: notifAppointment, emergency: notifEmergency, tips: notifTips, village: notifVillage };
      await supabase.from("patients").update({ notification_preferences: prefs } as any).eq("id", patient.id);
      toast({ title: t("preferencesSaved") + " ✅" });
    } catch (e: any) {
      toast({ title: t("error"), description: e.message, variant: "destructive" });
    }
  };

  const downloadData = async () => {
    if (!patient) return;
    try {
      const [hc, rx, mr] = await Promise.all([
        supabase.from("health_checks").select("*").eq("patient_id", patient.id),
        supabase.from("prescriptions").select("*").eq("patient_id", patient.id),
        supabase.from("medicine_reminders").select("*").eq("patient_id", patient.id),
      ]);
      const data = { patient, health_checks: hc.data, prescriptions: rx.data, reminders: mr.data };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `mediai-data-${patient.name}.json`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: t("downloadData") + " 📥" });
    } catch (e: any) {
      toast({ title: t("error"), description: e.message, variant: "destructive" });
    }
  };

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  const inputCls = "w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">⚙️ {t("settings")}</h1>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-5">
        {activeTab === "personal" && (
          <>
            <h2 className="font-display text-lg font-bold">{t("personalInfo")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("fullName")}</label>
                <input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("phone")}</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("age")}</label>
                <input type="number" value={age} onChange={e => setAge(+e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("gender")}</label>
                <div className="flex gap-2">
                  {[{k:"Male",l:t("male")},{k:"Female",l:t("female")},{k:"Other",l:t("other")}].map(g => (
                    <button key={g.k} onClick={() => setGender(g.k)}
                      className={`px-4 py-2 rounded-xl text-sm ${gender === g.k ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                      {g.l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("village")}</label>
                <input value={village} onChange={e => setVillage(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("district")}</label>
                <input value={district} onChange={e => setDistrict(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("state")}</label>
                <select value={state} onChange={e => setState(e.target.value)} className={inputCls}>
                  {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("bloodGroup")}</label>
                <div className="flex flex-wrap gap-2">
                  {bloodGroups.map(bg => (
                    <button key={bg} onClick={() => setBloodGroup(bg)}
                      className={`px-3 py-1.5 rounded-lg text-xs ${bloodGroup === bg ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                      {bg}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={savePersonal} disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? t("loading") : t("saveChanges")}
            </button>
          </>
        )}

        {activeTab === "medical" && (
          <>
            <h2 className="font-display text-lg font-bold">{t("medicalInfo")}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">{t("chronicConditions")}</label>
                <div className="flex flex-wrap gap-2">
                  {chronicConditions.map(c => (
                    <button key={c} onClick={() => setConditions(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])}
                      className={`px-3 py-1.5 rounded-full text-xs ${conditions.includes(c) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">{t("currentMedications")}</label>
                {medications.map((m, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={m.name} onChange={e => { const c = [...medications]; c[i].name = e.target.value; setMedications(c); }}
                      placeholder="Medicine" className={`flex-1 ${inputCls}`} />
                    <input value={m.dosage} onChange={e => { const c = [...medications]; c[i].dosage = e.target.value; setMedications(c); }}
                      placeholder="Dosage" className={`w-28 ${inputCls}`} />
                    <button onClick={() => setMedications(p => p.filter((_, j) => j !== i))} className="text-destructive"><X className="h-4 w-4" /></button>
                  </div>
                ))}
                <button onClick={() => setMedications(p => [...p, { name: "", dosage: "" }])}
                  className="flex items-center gap-1 text-xs text-primary font-medium"><Plus className="h-3 w-3" /> Add</button>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">{t("allergies")}</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {allergies.map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs">
                      {a} <button onClick={() => setAllergies(p => p.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input id="allergy-input-settings" placeholder="Add allergy" className={`flex-1 ${inputCls}`} />
                  <button onClick={() => {
                    const input = document.getElementById("allergy-input-settings") as HTMLInputElement;
                    if (input?.value.trim()) { setAllergies(p => [...p, input.value.trim()]); input.value = ""; }
                  }} className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">{t("familyHistoryLabel")}</label>
                {["Diabetes","Heart Disease","Cancer","Hypertension"].map(fh => (
                  <label key={fh} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input type="checkbox" checked={familyHistory.includes(fh)}
                      onChange={() => setFamilyHistory(p => p.includes(fh) ? p.filter(x => x !== fh) : [...p, fh])}
                      className="rounded accent-primary" />
                    <span className="text-sm text-foreground">{fh}</span>
                  </label>
                ))}
              </div>
            </div>
            <button onClick={saveMedical} disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? t("loading") : t("saveMedicalInfo")}
            </button>
          </>
        )}

        {activeTab === "language" && (
          <>
            <h2 className="font-display text-lg font-bold">{t("languageSettings")}</h2>
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {languageOptions.map(l => (
                  <button key={l.code} onClick={() => changeLang(l.code)}
                    className={`p-4 rounded-xl text-center transition-all border-2 ${
                      lang === l.code
                        ? "border-primary bg-primary/10 shadow-[0_0_20px_hsla(152,100%,45%,0.3)]"
                        : "border-border bg-secondary/50 hover:border-primary/40"
                    }`}>
                    <span className="text-xl">🇮🇳</span>
                    <p className="font-bold text-foreground mt-1">{l.native}</p>
                    <p className="text-xs text-muted-foreground">{l.english}</p>
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">{t("textSize")}</label>
                <div className="flex gap-3">
                  {([{k:"small",l:t("small"),px:"14px"},{k:"medium",l:t("medium"),px:"16px"},{k:"large",l:t("large"),px:"20px"}] as const).map(s => (
                    <button key={s.k} onClick={() => {
                      setTextSize(s.k);
                      document.documentElement.style.fontSize = s.px;
                      localStorage.setItem("mediai_textsize", s.k);
                    }}
                      className={`px-4 py-2 rounded-xl text-sm ${textSize === s.k ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                      {s.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "notifications" && (
          <>
            <h2 className="font-display text-lg font-bold">{t("notifications")}</h2>
            <div className="space-y-3">
              {[
                { label: t("medicineReminder"), value: notifMedicine, set: setNotifMedicine },
                { label: t("appointments"), value: notifAppointment, set: setNotifAppointment },
                { label: t("emergency"), value: notifEmergency, set: setNotifEmergency },
                { label: t("dailyHealthTip"), value: notifTips, set: setNotifTips },
                { label: t("villageHealth"), value: notifVillage, set: setNotifVillage },
              ].map(({ label, value, set }) => (
                <div key={label} className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-sm text-foreground">{label}</span>
                  <button onClick={() => set(!value)}
                    className={`w-12 h-6 rounded-full transition-all flex items-center ${value ? "bg-primary justify-end" : "bg-secondary justify-start"}`}>
                    <div className={`w-5 h-5 rounded-full mx-0.5 transition-all ${value ? "bg-primary-foreground" : "bg-muted-foreground"}`} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={saveNotifications}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
              <Save className="h-4 w-4" /> {t("savePreferences")}
            </button>
          </>
        )}

        {activeTab === "emergency" && (
          <>
            <h2 className="font-display text-lg font-bold">{t("emergencyContacts")}</h2>
            <div className="space-y-5">
              {[
                { title: t("primaryContact"), contact: primaryContact, setContact: setPrimaryContact },
                { title: t("secondaryContact"), contact: secondaryContact, setContact: setSecondaryContact },
              ].map(({ title, contact, setContact }) => (
                <div key={title} className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input value={contact.name} onChange={e => setContact({ ...contact, name: e.target.value })}
                      placeholder={t("contactName")} className={inputCls} />
                    <input value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })}
                      placeholder={t("contactPhone")} className={inputCls} />
                    <select value={contact.relationship} onChange={e => setContact({ ...contact, relationship: e.target.value })} className={inputCls}>
                      {["Spouse","Parent","Child","Sibling","Friend"].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={saveEmergencyContacts} disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
              <Save className="h-4 w-4" /> {saving ? t("loading") : t("saveContacts")}
            </button>
          </>
        )}

        {activeTab === "account" && (
          <>
            <h2 className="font-display text-lg font-bold">{t("account")}</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">{t("phone")}</span>
                <span className="text-foreground font-mono">{phone || "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">ID</span>
                <span className="text-foreground font-mono text-xs">{patient.id.slice(0,8)}...</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <button onClick={downloadData}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm">
                <Download className="h-4 w-4" /> {t("downloadData")}
              </button>
              <div className="glass-card p-4 border border-destructive/30 space-y-3">
                <p className="text-sm text-destructive font-semibold">⚠️ {t("dangerZone")}</p>
                <p className="text-xs text-muted-foreground">{t("typeDeleteConfirm")}</p>
                <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder='Type "DELETE"' className={inputCls} />
                <button disabled={deleteConfirm !== "DELETE"}
                  onClick={() => toast({ title: "Account deletion requested", description: "Contact support to complete." })}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm disabled:opacity-30">
                  <Trash2 className="h-4 w-4" /> {t("deleteAccount")}
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PatientSettings;
