import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Camera, Upload, Loader2, Pill, Volume2, ExternalLink, AlertTriangle, Info, Plus, Search, Trash2, MoreVertical, ChevronDown, ChevronUp, History, X, RefreshCw, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { getCurrentLanguage, getLanguageInstruction } from "@/utils/language";
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Medicine {
  name: string;
  generic_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  timing: string;
  purpose: string;
  how_it_works: string;
  side_effects: string[];
  precautions: string[];
  generic_alternative: string;
  price_branded: string;
  price_generic: string;
  buy_links: {
    netmeds: string;
    pharmeasy: string;
    onedmg: string;
    apollo: string;
  };
}

interface DecodedResult {
  patient_name?: string;
  age?: string;
  diagnosis?: string;
  doctor_name?: string;
  date?: string;
  medicines: Medicine[];
  special_instructions?: string;
  follow_up?: string;
  total_estimated_cost?: string;
  total_generic_cost?: string;
  savings?: string;
  reading_confidence?: "high" | "medium" | "low";
  unreadable_parts?: string;
}

interface PrescriptionHistory {
  id: string;
  patient_id: string;
  image_url: string | null;
  raw_text: string | null;
  decoded_result: any;
  patient_name: string | null;
  doctor_name: string | null;
  diagnosis: string | null;
  date_on_prescription: string | null;
  medicines_count: number | null;
  total_branded_cost: string | null;
  total_generic_cost: string | null;
  total_savings: string | null;
  created_at: string;
}

const PrescriptionDecoder = () => {
  const { t } = useTranslation();
  const patient = useAppStore((s) => s.currentPatient);
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState("");
  const [isDecoding, setIsDecoding] = useState(false);
  const [result, setResult] = useState<DecodedResult | null>(null);
  const [decodeStep, setDecodeStep] = useState(0);
  const [useText, setUseText] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // History state
  const [history, setHistory] = useState<PrescriptionHistory[]>([]);
  const [activePrescription, setActivePrescription] = useState<PrescriptionHistory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<string | null>(null);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const lang = getCurrentLanguage();

  // Load history on mount
  useEffect(() => {
    if (patient?.id) {
      loadHistory();
    }
  }, [patient?.id]);

  const loadHistory = async () => {
    if (!patient?.id) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("prescription_history")
        .select("*")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory((data as PrescriptionHistory[]) || []);
    } catch (e: any) {
      console.error("Error loading history:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 4 * 1024 * 1024) {
      toast({ 
        title: lang === 'hi' ? "फ़ाइल बहुत बड़ी है" : lang === 'te' ? "ఫైల్ చాలా పెద్దది" : "File too large",
        description: lang === 'hi' ? "कृपया 4MB से छोटी फ़ाइल चुनें" : lang === 'te' ? "దయచేసి 4MB కంటే చిన్న ఫైల్ ఎంచుకోండి" : "Please choose a file smaller than 4MB",
        variant: "destructive" 
      });
      return;
    }
    
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const savePrescription = async (decodedResult: DecodedResult, imageBase64: string | null, rawText: string | null) => {
    if (!patient?.id) return;

    try {
      let imageUrl: string | null = null;

      // Upload image to storage if exists
      if (imageFile) {
        const fileName = `${patient.id}/${Date.now()}_${imageFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("prescriptions")
          .upload(fileName, imageFile);

        if (uploadError) {
          console.error("Upload error:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from("prescriptions")
            .getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        }
      }

      // Insert into prescription_history
      const { data: inserted, error } = await supabase
        .from("prescription_history")
        .insert({
          patient_id: patient.id,
          image_url: imageUrl,
          raw_text: rawText,
          decoded_result: decodedResult as any,
          patient_name: decodedResult.patient_name || null,
          doctor_name: decodedResult.doctor_name || null,
          diagnosis: decodedResult.diagnosis || null,
          date_on_prescription: decodedResult.date || null,
          medicines_count: decodedResult.medicines?.length || 0,
          total_branded_cost: decodedResult.total_estimated_cost || null,
          total_generic_cost: decodedResult.total_generic_cost || null,
          total_savings: decodedResult.savings || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh history and set active
      await loadHistory();
      if (inserted) {
        setActivePrescription(inserted as PrescriptionHistory);
      }
    } catch (e: any) {
      console.error("Error saving prescription:", e);
    }
  };

  const handleDecode = async () => {
    if (!image && !textInput.trim()) return;
    setIsDecoding(true);
    
    const steps = lang === 'hi' 
      ? ["पर्ची पढ़ रहे हैं... 🔍", "दवाइयाँ खोज रहे हैं... 💊", "जानकारी ढूँढ रहे हैं... 📚", "सस्ती दवाएं खोज रहे हैं... 💰"]
      : lang === 'te'
      ? ["ప్రిస్క్రిప్షన్ చదువుతున్నాము... 🔍", "మందులు గుర్తిస్తున్నాము... 💊", "సమాచారం వెతుకుతున్నాము... 📚", "తక్కువ ధర ప్రత్యామ్నాయాలు... 💰"]
      : ["Reading prescription... 🔍", "Identifying medicines... 💊", "Looking up information... 📚", "Finding cheaper alternatives... 💰"];
    
    for (let i = 0; i < steps.length; i++) {
      setDecodeStep(i);
      await new Promise((r) => setTimeout(r, 800));
    }

    try {
      const langInstruction = getLanguageInstruction(lang);
      
      const body: any = {
        type: "decode_prescription_full",
        data: { 
          languageInstruction: langInstruction
        },
      };
      
      if (image && !useText) {
        body.data.image = image;
      } else {
        body.data.text = textInput;
      }

      const { data: fnData, error: fnError } = await supabase.functions.invoke("medical-ai", {
        body,
      });

      if (fnError) throw fnError;
      const parsed = fnData?.result;
      
      if (parsed?.medicines && Array.isArray(parsed.medicines)) {
        const enriched: DecodedResult = {
          ...parsed,
          medicines: parsed.medicines.map((m: any) => ({
            ...m,
            side_effects: Array.isArray(m.side_effects) ? m.side_effects : [m.side_effects || "Consult doctor"],
            precautions: Array.isArray(m.precautions) ? m.precautions : [m.precautions || "Follow prescription"],
            buy_links: {
              netmeds: `https://www.netmeds.com/catalogsearch/result/${encodeURIComponent(m.name || "")}`,
              pharmeasy: `https://pharmeasy.in/search/all?name=${encodeURIComponent(m.name || "")}`,
              onedmg: `https://www.1mg.com/search/all?name=${encodeURIComponent(m.name || "")}`,
              apollo: `https://www.apollopharmacy.in/search-medicines/${encodeURIComponent(m.name || "")}`,
              ...m.buy_links,
            },
          })),
        };
        setResult(enriched);
        
        // Save to history
        await savePrescription(enriched, image, useText ? textInput : null);
      } else {
        toast({ 
          title: lang === 'hi' ? "पढ़ नहीं पाए" : lang === 'te' ? "చదవలేకపోయాము" : "Could not decode",
          description: lang === 'hi' ? "कृपया साफ फोटो या टेक्स्ट डालें" : lang === 'te' ? "దయచేసి స్పష్టమైన ఫోటో లేదా టెక్స్ట్ ఉపయోగించండి" : "Please try with clearer image or text.",
          variant: "destructive" 
        });
      }
    } catch (e: any) {
      console.error(e);
      toast({ 
        title: lang === 'hi' ? "त्रुटि" : lang === 'te' ? "లోపం" : "Decode failed",
        description: e.message || "Try again",
        variant: "destructive" 
      });
    } finally {
      setIsDecoding(false);
    }
  };

  const handleNewScan = () => {
    setActivePrescription(null);
    setResult(null);
    setImage(null);
    setImageFile(null);
    setTextInput("");
    setUseText(false);
    setIsHistoryOpen(false);
  };

  const handleSelectPrescription = (prescription: PrescriptionHistory) => {
    setActivePrescription(prescription);
    setResult(prescription.decoded_result);
    setIsHistoryOpen(false);
  };

  const handleDeletePrescription = async () => {
    if (!prescriptionToDelete) return;

    try {
      // Find the prescription to get image URL
      const prescription = history.find(p => p.id === prescriptionToDelete);
      
      // Delete from storage if image exists
      if (prescription?.image_url) {
        const pathMatch = prescription.image_url.match(/prescriptions\/(.+)$/);
        if (pathMatch) {
          await supabase.storage.from("prescriptions").remove([pathMatch[1]]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from("prescription_history")
        .delete()
        .eq("id", prescriptionToDelete);

      if (error) throw error;

      // If deleting active prescription, clear it
      if (activePrescription?.id === prescriptionToDelete) {
        handleNewScan();
      }

      await loadHistory();
      toast({ title: lang === 'hi' ? "हटा दिया गया" : lang === 'te' ? "తొలగించబడింది" : "Deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setPrescriptionToDelete(null);
    }
  };

  const setReminder = async (med: Medicine) => {
    if (!patient) { 
      toast({ 
        title: lang === 'hi' ? "लॉगिन ज़रूरी" : lang === 'te' ? "లాగిన్ అవసరం" : "Login required",
        variant: "destructive" 
      }); 
      return; 
    }
    try {
      await supabase.from("medicine_reminders").insert({
        patient_id: patient.id,
        medicine_name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        times: med.frequency?.toLowerCase().includes("twice") ? ["08:00", "20:00"] : ["08:00"],
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        is_active: true,
      });
      toast({ 
        title: lang === 'hi' ? "रिमाइंडर सेट! ⏰" : lang === 'te' ? "రిమైండర్ సెట్! ⏰" : "Reminder set! ⏰",
        description: `${med.name}` 
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const speakMedicine = (med: Medicine) => {
    if (!("speechSynthesis" in window)) return;
    const speechLang = lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';
    const text = `${med.name}. ${med.dosage}. ${med.frequency}. ${med.timing}. ${med.purpose}.`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = speechLang;
    window.speechSynthesis.speak(utter);
  };

  const getConfidenceBadge = (confidence?: string) => {
    if (confidence === 'high') {
      return <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">✓ {lang === 'hi' ? 'स्पष्ट' : lang === 'te' ? 'స్పష్టం' : 'Clear reading'}</span>;
    }
    if (confidence === 'medium') {
      return <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">⚠ {lang === 'hi' ? 'कुछ अस्पष्ट' : lang === 'te' ? 'కొంత అస్పష్టం' : 'Some parts unclear'}</span>;
    }
    if (confidence === 'low') {
      return <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">⚠ {lang === 'hi' ? 'अस्पष्ट' : lang === 'te' ? 'అస్పష్టం' : 'Difficult to read'}</span>;
    }
    return null;
  };

  // Group history by date
  const groupedHistory = () => {
    const filtered = history.filter(p => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.doctor_name?.toLowerCase().includes(query) ||
        p.diagnosis?.toLowerCase().includes(query) ||
        p.patient_name?.toLowerCase().includes(query)
      );
    });

    const groups: { [key: string]: PrescriptionHistory[] } = {
      today: [],
      yesterday: [],
      thisWeek: [],
      lastMonth: [],
      older: [],
    };

    filtered.forEach(p => {
      const date = new Date(p.created_at);
      if (isToday(date)) groups.today.push(p);
      else if (isYesterday(date)) groups.yesterday.push(p);
      else if (isThisWeek(date)) groups.thisWeek.push(p);
      else if (isThisMonth(date)) groups.lastMonth.push(p);
      else groups.older.push(p);
    });

    return groups;
  };

  const HistorySidebar = ({ isMobile = false }: { isMobile?: boolean }) => {
    const groups = groupedHistory();
    
    return (
      <div className="flex flex-col h-full" style={{ background: isMobile ? 'var(--bg-primary)' : 'var(--bg-surface)' }}>
        {/* New Scan Button */}
        <div className="p-3">
          <button
            onClick={handleNewScan}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
          >
            <Plus className="h-4 w-4" />
            {t("newScan")}
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPrescriptions")}
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ 
                background: 'var(--bg-input)', 
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Pill className="h-12 w-12 mb-3" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              <p className="font-medium" style={{ color: 'var(--text-muted)' }}>{t("noPrescriptions")}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>{t("uploadFirst")}</p>
            </div>
          ) : (
            <>
              {Object.entries(groups).map(([key, items]) => {
                if (items.length === 0) return null;
                const label = key === 'today' ? t("today") 
                  : key === 'yesterday' ? t("yesterday")
                  : key === 'thisWeek' ? t("thisWeek")
                  : key === 'lastMonth' ? t("lastMonth")
                  : t("older");
                
                return (
                  <div key={key} className="mb-4">
                    <p className="text-xs px-2 py-1 font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    {items.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPrescription(p)}
                        className="group relative flex items-start gap-2 p-3 rounded-lg cursor-pointer transition-all mb-1"
                        style={{ 
                          background: activePrescription?.id === p.id ? 'var(--accent-green-dim)' : 'transparent',
                          borderLeft: activePrescription?.id === p.id ? '3px solid var(--accent-green)' : '3px solid transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (activePrescription?.id !== p.id) {
                            e.currentTarget.style.background = 'var(--bg-hover)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (activePrescription?.id !== p.id) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        {p.image_url && (
                          <img
                            src={p.image_url}
                            alt=""
                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            💊 {p.doctor_name || (lang === 'hi' ? 'डॉक्टर' : lang === 'te' ? 'డాక్టర్' : 'Doctor')}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                            {p.diagnosis || (lang === 'hi' ? 'पर्ची' : lang === 'te' ? 'చీటీ' : 'Prescription')}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {p.medicines_count || 0} {t("medicines")} · {format(new Date(p.created_at), "h:mm a")}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all" style={{ background: 'var(--bg-hover)' }}>
                              <MoreVertical className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrescriptionToDelete(p.id);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("deleteChat")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    );
  };

  const DecodingLoader = () => {
    const steps = lang === 'hi' 
      ? ["पर्ची पढ़ रहे हैं... 🔍", "दवाइयाँ खोज रहे हैं... 💊", "जानकारी ढूँढ रहे हैं... 📚", "सस्ती दवाएं खोज रहे हैं... 💰"]
      : lang === 'te'
      ? ["ప్రిస్క్రిప్షన్ చదువుతున్నాము... 🔍", "మందులు గుర్తిస్తున్నాము... 💊", "సమాచారం వెతుకుతున్నాము... 📚", "తక్కువ ధర ప్రత్యామ్నాయాలు... 💰"]
      : ["Reading prescription... 🔍", "Identifying medicines... 💊", "Looking up information... 📚", "Finding cheaper alternatives... 💰"];
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
          <Pill className="h-16 w-16 text-primary" />
        </motion.div>
        <div className="space-y-3">
          {steps.map((s, i) => (
            <motion.p key={s} initial={{ opacity: 0 }} animate={{ opacity: i <= decodeStep ? 1 : 0.3 }}
              className={`text-sm ${i <= decodeStep ? "text-foreground" : "text-muted-foreground"}`}>
              {i < decodeStep ? "✅" : i === decodeStep ? "⏳" : "⬜"} {s}
            </motion.p>
          ))}
        </div>
      </div>
    );
  };

  const ResultView = ({ showPastBanner = false }: { showPastBanner?: boolean }) => {
    if (!result) return null;

    return (
      <div className="space-y-4">
        {/* Past prescription banner */}
        {showPastBanner && activePrescription && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{t("decodedOn")} {format(new Date(activePrescription.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
            <button
              onClick={() => {
                if (activePrescription.image_url) {
                  setImage(activePrescription.image_url);
                } else if (activePrescription.raw_text) {
                  setTextInput(activePrescription.raw_text);
                  setUseText(true);
                }
                setActivePrescription(null);
                setResult(null);
              }}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <RefreshCw className="h-3 w-3" />
              {t("decodeAgain")}
            </button>
          </div>
        )}

        {/* Original image collapsible */}
        {showPastBanner && activePrescription?.image_url && (
          <Collapsible open={isImageExpanded} onOpenChange={setIsImageExpanded}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 w-full p-3 rounded-lg bg-secondary/30 border border-border text-sm text-muted-foreground hover:bg-secondary/50 transition-all">
                <Camera className="h-4 w-4" />
                <span>{t("viewOriginal")}</span>
                {isImageExpanded ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 rounded-lg bg-secondary/20 border border-border">
                <img
                  src={activePrescription.image_url}
                  alt="Original prescription"
                  className="w-full rounded-lg max-h-64 object-contain"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* TOP DISCLAIMER */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border-2 border-yellow-500/50 bg-yellow-500/10"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-500 mb-1">
                {lang === 'hi' ? '⚠️ महत्वपूर्ण सूचना' : lang === 'te' ? '⚠️ ముఖ్యమైన గమనిక' : '⚠️ Important Notice'}
              </h3>
              <p className="text-sm text-yellow-200/80">
                {lang === 'hi' 
                  ? 'यह आपकी पर्ची की AI रीडिंग है। दवाई लेने से पहले हमेशा अपने डॉक्टर या फार्मासिस्ट से जाँच करें। अगर कुछ गलत लगे, तुरंत अपने डॉक्टर से संपर्क करें।'
                  : lang === 'te'
                  ? 'ఇది మీ ప్రిస్క్రిప్షన్ యొక్క AI రీడింగ్. మందులు తీసుకునే ముందు ఎల్లప్పుడూ మీ డాక్టర్ లేదా ఫార్మసిస్ట్‌తో ధృవీకరించండి. ఏదైనా తప్పుగా కనిపిస్తే, వెంటనే మీ డాక్టర్‌ను సంప్రదించండి.'
                  : 'This is an AI reading of your prescription. Always verify medicines with your doctor or pharmacist before taking. If anything looks wrong, consult your doctor immediately.'}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-foreground">
            {lang === 'hi' ? 'आपकी पर्ची 💊' : lang === 'te' ? 'మీ ప్రిస్క్రిప్షన్ 💊' : 'Your Prescription Decoded 💊'}
          </h2>
          {getConfidenceBadge(result.reading_confidence)}
        </div>

        {/* Unreadable parts warning */}
        {result.unreadable_parts && (
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <p className="text-sm text-orange-400">
              <Info className="h-4 w-4 inline mr-1" />
              {lang === 'hi' ? 'कुछ हिस्से पढ़ नहीं पाए: ' : lang === 'te' ? 'కొన్ని భాగాలు చదవలేకపోయాము: ' : 'Could not read some parts: '}
              {result.unreadable_parts}
            </p>
          </div>
        )}

        {/* Patient & Doctor info */}
        {(result.patient_name || result.doctor_name || result.date) && (
          <div className="glass-card p-4 grid grid-cols-2 gap-2 text-sm">
            {result.patient_name && (
              <div><span className="text-muted-foreground">{lang === 'hi' ? 'मरीज़: ' : lang === 'te' ? 'రోగి: ' : 'Patient: '}</span><span className="text-foreground">{result.patient_name}</span></div>
            )}
            {result.age && (
              <div><span className="text-muted-foreground">{lang === 'hi' ? 'उम्र: ' : lang === 'te' ? 'వయస్సు: ' : 'Age: '}</span><span className="text-foreground">{result.age}</span></div>
            )}
            {result.doctor_name && (
              <div><span className="text-muted-foreground">{lang === 'hi' ? 'डॉक्टर: ' : lang === 'te' ? 'డాక్టర్: ' : 'Doctor: '}</span><span className="text-foreground">{result.doctor_name}</span></div>
            )}
            {result.date && (
              <div><span className="text-muted-foreground">{lang === 'hi' ? 'तारीख: ' : lang === 'te' ? 'తేదీ: ' : 'Date: '}</span><span className="text-foreground">{result.date}</span></div>
            )}
          </div>
        )}

        {result.diagnosis && (
          <div className="glass-card p-4 border-l-4 border-primary">
            <p className="text-sm">
              <span className="text-muted-foreground">{lang === 'hi' ? 'निदान: ' : lang === 'te' ? 'రోగ నిర్ధారణ: ' : 'Diagnosis: '}</span>
              <span className="font-semibold text-foreground">{result.diagnosis}</span>
            </p>
            {result.special_instructions && (
              <p className="text-xs text-muted-foreground mt-1">📋 {result.special_instructions}</p>
            )}
            {result.follow_up && (
              <p className="text-xs text-primary mt-1">📅 {lang === 'hi' ? 'फॉलो-अप: ' : lang === 'te' ? 'ఫాలో-అప్: ' : 'Follow-up: '}{result.follow_up}</p>
            )}
          </div>
        )}

        {result.medicines.map((med, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}
            className="glass-card p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">💊 {med.name}</h3>
                {med.generic_name && (
                  <p className="text-xs text-muted-foreground">
                    {lang === 'hi' ? 'जेनेरिक: ' : lang === 'te' ? 'జెనరిక్: ' : 'Generic: '}{med.generic_name}
                  </p>
                )}
              </div>
              <button onClick={() => speakMedicine(med)} className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20">
                <Volume2 className="h-4 w-4 text-primary" />
              </button>
            </div>

            {med.purpose && (
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {lang === 'hi' ? 'के लिए: ' : lang === 'te' ? 'కోసం: ' : 'For: '}{med.purpose}
              </span>
            )}

            <div className="grid grid-cols-1 gap-1.5 text-sm">
              <div>
                <span className="text-muted-foreground">💊 {lang === 'hi' ? 'खुराक: ' : lang === 'te' ? 'మోతాదు: ' : 'Dosage: '}</span>
                <span className="text-foreground font-medium">{med.dosage}, {med.frequency}, {med.timing}</span>
              </div>
              <div>
                <span className="text-muted-foreground">📅 {lang === 'hi' ? 'अवधि: ' : lang === 'te' ? 'వ్యవధి: ' : 'Duration: '}</span>
                <span className="text-foreground">{med.duration}</span>
              </div>
              {med.how_it_works && (
                <div>
                  <span className="text-muted-foreground">🧬 {lang === 'hi' ? 'कैसे काम करता है: ' : lang === 'te' ? 'ఎలా పని చేస్తుంది: ' : 'How it works: '}</span>
                  <span className="text-foreground">{med.how_it_works}</span>
                </div>
              )}
            </div>

            {med.side_effects?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {med.side_effects.slice(0, 4).map((se, j) => (
                  <span key={j} className="px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs">⚠️ {se}</span>
                ))}
              </div>
            )}

            {med.generic_alternative && (
              <div className="glass-card p-3 border border-primary/20" style={{ background: "hsla(152, 100%, 45%, 0.05)" }}>
                <p className="text-sm font-semibold text-primary">
                  💰 {lang === 'hi' ? 'जेनेरिक से बचाएं!' : lang === 'te' ? 'జెనరిక్‌తో ఆదా చేయండి!' : 'Save with generic!'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {med.generic_alternative} — {med.price_generic} vs {lang === 'hi' ? 'ब्रांड' : lang === 'te' ? 'బ్రాండ్' : 'Brand'} {med.price_branded}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs text-muted-foreground mb-2">
                🛒 {lang === 'hi' ? 'ऑनलाइन खरीदें:' : lang === 'te' ? 'ఆన్‌లైన్‌లో కొనండి:' : 'Buy online:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "Netmeds", url: med.buy_links?.netmeds },
                  { name: "PharmEasy", url: med.buy_links?.pharmeasy },
                  { name: "1mg", url: med.buy_links?.onedmg },
                  { name: "Apollo", url: med.buy_links?.apollo },
                ].map((link) => (
                  <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium text-secondary-foreground hover:bg-primary/20 transition-all">
                    {link.name} <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>

            <button onClick={() => setReminder(med)}
              className="w-full py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-all">
              ⏰ {lang === 'hi' ? 'रिमाइंडर सेट करें' : lang === 'te' ? 'రిమైండర్ సెట్ చేయండి' : 'Set Medicine Reminder'}
            </button>
          </motion.div>
        ))}

        {/* Summary */}
        {(result.total_estimated_cost || result.total_generic_cost) && (
          <div className="glass-card p-5 space-y-2">
            <h3 className="font-display text-lg font-bold text-foreground">
              💰 {lang === 'hi' ? 'लागत सारांश' : lang === 'te' ? 'ఖర్చు సారాంశం' : 'Cost Summary'}
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">{lang === 'hi' ? 'ब्रांडेड' : lang === 'te' ? 'బ్రాండెడ్' : 'Branded'}</p>
                <p className="font-mono text-lg font-bold text-foreground">{result.total_estimated_cost}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{lang === 'hi' ? 'जेनेरिक' : lang === 'te' ? 'జెనరిక్' : 'Generic'}</p>
                <p className="font-mono text-lg font-bold text-primary">{result.total_generic_cost}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{lang === 'hi' ? 'बचत' : lang === 'te' ? 'ఆదా' : 'You Save'}</p>
                <p className="font-mono text-lg font-bold text-primary">{result.savings}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {lang === 'hi' ? 'जेनेरिक चुनें — समान गुणवत्ता, कम कीमत' : lang === 'te' ? 'జెనరిక్ ఎంచుకోండి — అదే నాణ్యత, తక్కువ ధర' : 'Choosing generics saves money with same quality'}
            </p>
          </div>
        )}

        {/* BOTTOM DISCLAIMER */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
          <p className="text-xs text-muted-foreground">
            {lang === 'hi' 
              ? '🤖 AI द्वारा पढ़ा गया — यह चिकित्सा राय नहीं है। हमेशा अपने डॉक्टर के निर्देशों का पालन करें।'
              : lang === 'te'
              ? '🤖 AI చదివింది — ఇది వైద్య సలహా కాదు. ఎల్లప్పుడూ మీ డాక్టర్ సూచనలను అనుసరించండి.'
              : '🤖 Decoded by AI — Not a medical opinion. Always follow your doctor\'s instructions.'}
          </p>
        </div>

        {!showPastBanner && (
          <button onClick={handleNewScan}
            className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium">
            ← {lang === 'hi' ? 'दूसरी पर्ची पढ़ें' : lang === 'te' ? 'మరో ప్రిస్క్రిప్షన్ చదవండి' : 'Decode Another Prescription'}
          </button>
        )}
      </div>
    );
  };

  const UploadView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          {lang === 'hi' ? 'पर्ची समझें 💊' : lang === 'te' ? 'ప్రిస్క్రిప్షన్ డీకోడర్ 💊' : 'Prescription Decoder 💊'}
        </h2>
        <p className="text-muted-foreground text-sm">
          {lang === 'hi' ? 'अपनी पर्ची अपलोड करें — हम समझाएंगे' : lang === 'te' ? 'మీ ప్రిస్క్రిప్షన్ అప్‌లోడ్ చేయండి — మేము వివరిస్తాము' : 'Upload your prescription — we\'ll explain it with real medicine info'}
        </p>
      </div>

      <input type="file" ref={fileRef} accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

      <div className="flex gap-2 justify-center">
        <button onClick={() => setUseText(false)}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${!useText ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
          📷 {lang === 'hi' ? 'फोटो अपलोड' : lang === 'te' ? 'ఫోటో అప్‌లోడ్' : 'Upload Image'}
        </button>
        <button onClick={() => setUseText(true)}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${useText ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
          ⌨️ {lang === 'hi' ? 'टेक्स्ट टाइप' : lang === 'te' ? 'టెక్స్ట్ టైప్' : 'Type Text'}
        </button>
      </div>

      {!useText ? (
        <>
          {!image ? (
            <motion.div whileHover={{ scale: 1.01 }}
              className="glass-card p-12 text-center border-2 border-dashed border-primary/30 cursor-pointer"
              onClick={() => fileRef.current?.click()}>
              <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
              <p className="text-foreground font-semibold mb-2">
                {lang === 'hi' ? 'पर्ची अपलोड करें' : lang === 'te' ? 'ప్రిస్క్రిప్షన్ అప్‌లోడ్ చేయండి' : 'Upload Prescription'}
              </p>
              <p className="text-xs text-muted-foreground">
                {lang === 'hi' ? 'फोटो लें या गैलरी से चुनें' : lang === 'te' ? 'ఫోటో తీయండి లేదా గ్యాలరీ నుండి ఎంచుకోండి' : 'Take a photo or upload from gallery'}
              </p>
              <div className="flex gap-3 justify-center mt-4">
                <button className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2">
                  <Camera className="h-4 w-4" /> {lang === 'hi' ? 'फोटो' : lang === 'te' ? 'ఫోటో' : 'Take Photo'}
                </button>
                <button className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4" /> {lang === 'hi' ? 'अपलोड' : lang === 'te' ? 'అప్‌లోడ్' : 'Upload'}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <div className="glass-card p-4">
                <img src={image} alt="Prescription" className="w-full rounded-xl max-h-64 object-contain" />
              </div>
              <motion.button whileTap={{ scale: 0.98 }} onClick={handleDecode}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg animate-pulse-glow">
                🔍 {lang === 'hi' ? 'पर्ची पढ़ें' : lang === 'te' ? 'ప్రిస్క్రిప్షన్ చదవండి' : 'Decode Prescription'}
              </motion.button>
              <button onClick={() => { setImage(null); setImageFile(null); }} className="w-full py-2 text-sm text-muted-foreground">
                {lang === 'hi' ? 'दूसरी फोटो चुनें' : lang === 'te' ? 'మరో ఫోటో ఎంచుకోండి' : 'Try another image'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            rows={6}
            placeholder={lang === 'hi' 
              ? "पर्ची का टेक्स्ट यहाँ टाइप करें...\n\nउदाहरण: Tab Metformin 500mg 1-0-1 x 30 days, Tab Amlodipine 5mg 0-0-1 x 30 days after food"
              : lang === 'te'
              ? "ప్రిస్క్రిప్షన్ టెక్స్ట్ ఇక్కడ టైప్ చేయండి...\n\nఉదాహరణ: Tab Metformin 500mg 1-0-1 x 30 days, Tab Amlodipine 5mg 0-0-1 x 30 days after food"
              : "Type or paste your prescription text here...\n\nExample: Tab Metformin 500mg 1-0-1 x 30 days, Tab Amlodipine 5mg 0-0-1 x 30 days after food"}
            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <motion.button whileTap={{ scale: 0.98 }} onClick={handleDecode} disabled={!textInput.trim()}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg disabled:opacity-50 animate-pulse-glow">
            🔍 {lang === 'hi' ? 'पर्ची पढ़ें' : lang === 'te' ? 'ప్రిస్క్రిప్షన్ చదవండి' : 'Decode Prescription'}
          </motion.button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deletePrescription")}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === 'hi' ? 'यह पर्ची स्थायी रूप से हटा दी जाएगी।' : lang === 'te' ? 'ఈ మందుల చీటీ శాశ్వతంగా తొలగించబడుతుంది.' : 'This prescription will be permanently deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePrescription} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("deleteChat")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-[260px] flex-shrink-0 border-r" 
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
          <HistorySidebar />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border">
            <h1 className="font-display font-bold text-lg text-foreground">
              {lang === 'hi' ? 'पर्ची समझें' : lang === 'te' ? 'మందుల చీటీ' : 'Prescriptions'}
            </h1>
            <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
              <SheetTrigger asChild>
                <button className="p-2 rounded-lg bg-secondary hover:bg-secondary/80">
                  <History className="h-5 w-5 text-foreground" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h2 className="font-display font-bold text-foreground">{t("prescriptionHistory")}</h2>
                  <button onClick={() => setIsHistoryOpen(false)} className="p-1 rounded hover:bg-secondary">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <HistorySidebar isMobile />
              </SheetContent>
            </Sheet>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-2xl mx-auto">
              {isDecoding ? (
                <DecodingLoader />
              ) : activePrescription && result ? (
                <ResultView showPastBanner />
              ) : result ? (
                <ResultView />
              ) : (
                <UploadView />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrescriptionDecoder;
