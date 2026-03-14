import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Send, Volume2, VolumeX, Sparkles, Plus, Search, MoreHorizontal, Pencil, Trash2, MessageSquare, X, Menu } from "lucide-react";
import { streamHealthAssistant } from "@/lib/ai";
import { useAppStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { getCurrentLanguage, getGreeting, getPlaceholder, getSpeechLang, getLanguageInstruction } from "@/utils/language";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: string;
  patient_id: string;
  title: string;
  language: string;
  created_at: string;
  updated_at: string;
}

const AIAssistant = () => {
  const patient = useAppStore((s) => s.currentPatient);
  const { t } = useTranslation();
  const lang = getCurrentLanguage();
  const patientName = patient?.name || "friend";
  const patientId = patient?.id;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load sessions on mount
  useEffect(() => {
    if (!patientId) return;
    loadSessions();
  }, [patientId]);

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSessions = async () => {
    if (!patientId) return;
    const { data } = await supabase
      .from("ai_chat_sessions")
      .select("*")
      .eq("patient_id", patientId)
      .order("updated_at", { ascending: false });

    const sessionList = (data as ChatSession[]) || [];
    setSessions(sessionList);

    if (sessionList.length > 0 && !activeSessionId) {
      setActiveSessionId(sessionList[0].id);
      loadMessages(sessionList[0].id);
    } else if (sessionList.length === 0) {
      createNewSession();
    }
  };

  const loadMessages = async (sessionId: string) => {
    const { data } = await supabase
      .from("ai_chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      setMessages(data.map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
    } else {
      setMessages([{ role: "assistant", content: getGreeting(lang, patientName) }]);
    }
  };

  const createNewSession = async () => {
    if (!patientId) return;
    const newId = crypto.randomUUID();
    const session: any = {
      id: newId,
      patient_id: patientId,
      title: t("newConversation"),
      language: getCurrentLanguage(),
    };

    await supabase.from("ai_chat_sessions").insert(session);

    setSessions((prev) => [{ ...session, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...prev]);
    setActiveSessionId(newId);
    setMessages([{ role: "assistant", content: getGreeting(lang, patientName) }]);
    setSidebarOpen(false);
    inputRef.current?.focus();
  };

  const switchSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    loadMessages(sessionId);
    setSidebarOpen(false);
  };

  const deleteSession = async (sessionId: string) => {
    await supabase.from("ai_chat_sessions").delete().eq("id", sessionId);
    const remaining = sessions.filter((s) => s.id !== sessionId);
    setSessions(remaining);
    setMenuOpenId(null);
    if (activeSessionId === sessionId) {
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
        loadMessages(remaining[0].id);
      } else {
        createNewSession();
      }
    }
  };

  const renameSession = async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    await supabase.from("ai_chat_sessions").update({ title: newTitle.trim() }).eq("id", sessionId);
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle.trim() } : s)));
    setRenamingId(null);
  };

  const speakText = (text: string) => {
    if (!speakEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = getSpeechLang(getCurrentLanguage());
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !activeSessionId || !patientId) return;
    const userMsg: Message = { role: "user", content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setIsLoading(true);

    // Save user message to DB
    await supabase.from("ai_chat_messages").insert({
      session_id: activeSessionId,
      patient_id: patientId,
      role: "user",
      content: text,
    });

    // Update session title if first user message
    const session = sessions.find((s) => s.id === activeSessionId);
    if (session && (session.title === t("newConversation") || session.title === "New conversation" || session.title === "नई बातचीत" || session.title === "కొత్త సంభాషణ")) {
      const newTitle = text.slice(0, 40);
      await supabase.from("ai_chat_sessions").update({ title: newTitle, updated_at: new Date().toISOString() }).eq("id", activeSessionId);
      setSessions((prev) => prev.map((s) => (s.id === activeSessionId ? { ...s, title: newTitle, updated_at: new Date().toISOString() } : s)));
    } else {
      await supabase.from("ai_chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", activeSessionId);
      setSessions((prev) => prev.map((s) => (s.id === activeSessionId ? { ...s, updated_at: new Date().toISOString() } : s)));
    }

    const currentLang = getCurrentLanguage();
    const langInstruction = getLanguageInstruction(currentLang);

    // Last 10 messages for context
    const contextMessages = newMsgs.slice(-10).map((m) => ({ role: m.role, content: m.content }));

    let assistantContent = "";
    try {
      await streamHealthAssistant({
        messages: contextMessages,
        language: currentLang,
        languageInstruction: langInstruction,
        onDelta: (chunk) => {
          assistantContent += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && prev.length > newMsgs.length) {
              return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
            }
            return [...prev, { role: "assistant", content: assistantContent }];
          });
        },
        onDone: async () => {
          setIsLoading(false);
          if (assistantContent) {
            speakText(assistantContent);
            // Save assistant message to DB
            await supabase.from("ai_chat_messages").insert({
              session_id: activeSessionId,
              patient_id: patientId,
              role: "assistant",
              content: assistantContent,
            });
          }
        },
      });
    } catch (e: any) {
      setIsLoading(false);
      toast({ title: t("error"), description: e.message, variant: "destructive" });
      setMessages((prev) => [...prev, { role: "assistant", content: "I'm having trouble connecting. Please try again. 🙏" }]);
    }
  };

  const startVoice = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      toast({ title: "Not supported", description: "Voice input not available" });
      return;
    }
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SR();
    recognition.lang = getSpeechLang(getCurrentLanguage());
    recognition.continuous = false;
    setIsListening(true);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      sendMessage(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  // Group sessions by date
  const groupSessions = (list: ChatSession[]) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000);
    const monthStart = new Date(todayStart.getTime() - 30 * 86400000);

    const groups: { label: string; items: ChatSession[] }[] = [
      { label: t("today"), items: [] },
      { label: t("yesterday"), items: [] },
      { label: t("thisWeek"), items: [] },
      { label: t("lastMonth"), items: [] },
      { label: t("older"), items: [] },
    ];

    list.forEach((s) => {
      const d = new Date(s.updated_at);
      if (d >= todayStart) groups[0].items.push(s);
      else if (d >= yesterdayStart) groups[1].items.push(s);
      else if (d >= weekStart) groups[2].items.push(s);
      else if (d >= monthStart) groups[3].items.push(s);
      else groups[4].items.push(s);
    });

    return groups.filter((g) => g.items.length > 0);
  };

  const filtered = searchQuery
    ? sessions.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : sessions;

  const grouped = groupSessions(filtered);

  const placeholder = getPlaceholder(getCurrentLanguage());
  const suggestions =
    lang === "hi"
      ? ["मुझे बुखार है", "BP कैसे कंट्रोल करें?", "यह दवा किसलिए है?", "कितना पानी पीना चाहिए?"]
      : lang === "te"
      ? ["నాకు జ్వరం వస్తోంది", "BP ఎలా కంట్రోల్ చేయాలి?", "ఈ మందు దేనికి?", "ఎంత నీళ్ళు తాగాలి?"]
      : ["What are diabetes symptoms?", "How to control blood pressure?", "Is my fever serious?", "How much water should I drink?"];

  // Sidebar content (shared between desktop and mobile drawer)
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchChats")}
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pb-3">
        <button
          onClick={createNewSession}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          {t("newChat")}
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">{t("noConversations")}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{t("startChatting")}</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label}>
              <p className="text-xs text-muted-foreground/60 font-medium px-2 py-2 uppercase tracking-wider">{group.label}</p>
              {group.items.map((session) => (
                <div
                  key={session.id}
                  onClick={() => switchSession(session.id)}
                  className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm ${
                    activeSessionId === session.id
                      ? "bg-primary/10 border-l-[3px] border-primary text-foreground"
                      : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="h-4 w-4 flex-shrink-0 opacity-60" />
                  <div className="flex-1 min-w-0">
                    {renamingId === session.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => renameSession(session.id, renameValue)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameSession(session.id, renameValue);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-secondary px-1 py-0.5 rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    ) : (
                      <p className="truncate">{session.title}</p>
                    )}
                  </div>

                  {/* Three dot menu */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === session.id ? null : session.id);
                      }}
                      className="p-1 rounded hover:bg-secondary"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuOpenId === session.id && (
                      <div className="absolute right-0 top-8 z-50 bg-card border border-border rounded-lg shadow-lg py-1 w-36">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingId(session.id);
                            setRenameValue(session.title);
                            setMenuOpenId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary"
                        >
                          <Pencil className="h-3 w-3" /> {t("rename")}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(t("confirmDelete"))) deleteSession(session.id);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" /> {t("deleteChat")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-140px)] sm:h-[calc(100vh-140px)] sm:h-[calc(100vh-140px)] sm:h-[calc(100vh-120px)] md:h-[calc(100vh-80px)] gap-0 relative">
      {/* Desktop Sidebar */}
      <div className="hid00px] lg:w-[2den md:flex flex-col w-[260px] flex-shrink-0 border-r border-border/50 bg-card/50 rounded-l-xl overflow-hidden">
        {sidebarContent}
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-card z-50 md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-3 border-b border-border">
                <span className="font-semibold text-foreground">{t("chatHistory")}</span>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-secondary">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Right Panel - Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="glass-card p-3 flex items-center gap-3 rounded-t-xl md:rounded-tl-none">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-secondary">
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-foreground text-sm">MediAI {t("healthAssistant")}</h2>
            <p className="text-xs text-primary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Online
            </p>
          </div>
          <button onClick={() => setSpeakEnabled(!speakEnabled)} className="p-2 rounded-xl bg-secondary">
            {speakEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3 p-4">
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "glass-card rounded-bl-md"
                }`}
              >
                {msg.content}
                {msg.role === "assistant" && (
                  <button onClick={() => speakText(msg.content)} className="mt-2 flex items-center gap-1 text-xs text-primary">
                    <Volume2 className="h-3 w-3" /> {t("speakNow")}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Suggestions */}
        {messages.length < 3 && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-thin">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium bg-secondary text-secondary-foreground hover:bg-primary/20 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="glass-card p-3 flex  safe-bottomitems-center gap-2 rounde safe-bottomd-b-xl md:rounded-bl-none">
          <button
            onClick={startVoice}
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isListening ? "bg-destructive/20 text-destructive animate-pulse" : "bg-primary/20 text-primary"
            }`}
          >
            <Mic className="h-5 w-5" />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-30 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
