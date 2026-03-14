import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string | null;
  read: boolean | null;
  created_at: string;
}

const typeIcons: Record<string, string> = {
  emergency: "🚨",
  prescription: "💊",
  appointment: "📅",
  warning: "⚠️",
  info: "ℹ️"
};

const playAlertSound = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 800;
    gain.gain.value = 0.3;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {osc.stop();ctx.close();}, 400);
  } catch {}
};

export default function NotificationBell({ userId, userType }: {userId: string;userType: string;}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase.
    from("notifications").
    select("*").
    eq("user_id", userId).
    eq("user_type", userType).
    order("created_at", { ascending: false }).
    limit(20);
    if (data) setNotifications(data as Notification[]);
  }, [userId, userType]);

  useEffect(() => {
    fetchNotifications();
    const channel = supabase.
    channel(`notif-${userId}`).
    on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${userId}`
    }, (payload: any) => {
      const n = payload.new as Notification;
      setNotifications((prev) => [n, ...prev]);
      if (n.type === "emergency") playAlertSound();
    }).
    subscribe();
    return () => {supabase.removeChannel(channel);};
  }, [userId, fetchNotifications]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return `${days}d ago`;
  };

  const notifTypeIcon = (type: string | null) => {
    switch (type) {
      case 'emergency':case 'emergency_confirmed':case 'emergency_call':return '🚨';
      case 'ambulance_dispatched':return '🚑';
      case 'incoming_call':return '📹';
      case 'call_declined':return '❌';
      case 'prescription':return '💊';
      case 'appointment':return '📅';
      case 'warning':return '⚠️';
      default:return '🔔';
    }
  };

  const notifIconBg = (type: string | null) => {
    if (type === 'emergency' || type === 'emergency_confirmed' || type === 'emergency_call') return 'rgba(255,71,87,0.15)';
    if (type === 'ambulance_dispatched') return 'rgba(0,232,122,0.15)';
    if (type === 'incoming_call') return 'rgba(0,184,217,0.15)';
    return 'rgba(0,232,122,0.1)';
  };

  const bellRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      const panelWidth = Math.min(340, window.innerWidth - 24);
      // Try to align left edge with bell's left edge
      let left = rect.left;
      // If it would overflow right, shift left
      if (left + panelWidth > window.innerWidth - 12) {
        left = window.innerWidth - panelWidth - 12;
      }
      // Never go off left edge
      if (left < 12) left = 12;
      setDropdownPos({
        top: rect.bottom + 8,
        left
      });
    }
  }, [open]);

  return (
    <div className="relative">
      <motion.button
        ref={bellRef}
        onClick={() => setOpen(!open)}
        whileTap={{ scale: 0.92 }}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl border-border bg-transparent cursor-pointer text-muted-foreground hover:bg-secondary/50 transition-colors border-0">
        
        <Bell className="h-5 w-5" />
        {unreadCount > 0 &&
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center px-1"
          style={{ border: '2px solid hsl(var(--background))' }}>
          
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        }
      </motion.button>

      {createPortal(
        <AnimatePresence>
          {open &&
          <>
              <div
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 99998 }} />
            
              <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                position: 'fixed',
                top: `${dropdownPos.top}px`,
                left: `${dropdownPos.left}px`,
                width: 'min(340px, calc(100vw - 24px))',
                zIndex: 99999,
                background: 'hsl(var(--card))',
                borderRadius: '16px',
                border: '1px solid hsl(var(--border))',
                boxShadow: '0 16px 48px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.15)',
                transformOrigin: 'top right',
                overflow: 'hidden'
              }}>
              
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-foreground">Notifications</span>
                  {unreadCount > 0 &&
                  <span className="text-[11px] font-bold text-destructive-foreground bg-destructive px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  }
                </div>
                {unreadCount > 0 &&
                <button
                  onClick={markAllRead}
                  className="text-[13px] font-semibold text-primary hover:text-primary/80 transition-colors bg-transparent border-none cursor-pointer px-2 py-1 rounded-md">
                  
                    Mark all read
                  </button>
                }
              </div>

              {/* List */}
              <div className="max-h-[400px] overflow-y-auto overflow-x-hidden">
                {notifications.length === 0 ?
                <div className="py-12 px-5 text-center">
                    <div className="text-3xl mb-2">🔔</div>
                    <div className="text-sm text-muted-foreground">No notifications yet</div>
                  </div> :

                <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }}>
                    {notifications.map((n) =>
                  <motion.button
                    key={n.id}
                    variants={{ hidden: { opacity: 0, x: 10 }, visible: { opacity: 1, x: 0 } }}
                    onClick={() => {markRead(n.id);setOpen(false);}}
                    className="w-full text-left flex gap-3 px-5 py-3.5 border-b border-border/40 cursor-pointer transition-colors hover:bg-secondary/40"
                    style={{ background: !n.read ? 'hsl(var(--primary) / 0.06)' : 'transparent' }}>
                    
                        <div
                      className="w-9 h-9 rounded-[10px] flex-shrink-0 flex items-center justify-center text-lg"
                      style={{ background: notifIconBg(n.type) }}>
                      
                          {notifTypeIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <span className={`text-[13px] leading-tight text-foreground ${!n.read ? 'font-bold' : 'font-medium'}`}>
                              {n.title}
                            </span>
                            {!n.read &&
                        <div className="w-[7px] h-[7px] rounded-full bg-primary flex-shrink-0 mt-1" />
                        }
                          </div>
                          {n.message &&
                      <p className="text-xs text-muted-foreground m-0 leading-relaxed line-clamp-2">{n.message}</p>
                      }
                          <span className="text-[11px] text-muted-foreground mt-1 block">{formatTimeAgo(n.created_at)}</span>
                        </div>
                      </motion.button>
                  )}
                  </motion.div>
                }
              </div>
            </motion.div>
          </>
          }
      </AnimatePresence>,
        document.body
      )}
    </div>);

}