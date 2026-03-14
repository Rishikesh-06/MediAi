import { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Menu, X, Trophy, Settings, Settings2 } from "lucide-react";
import { useState, useEffect } from "react";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import { useAppStore } from "@/lib/store";

interface PortalLayoutProps {
  children: ReactNode;
  portalName: string;
  accentColor: string;
  navItems: Array<{label: string;path: string;icon: ReactNode;}>;
}

const PortalLayout = ({ children, portalName, accentColor, navItems }: PortalLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentPatient, currentDoctor, currentHospital } = useAppStore();

  const userId = currentPatient?.id || currentDoctor?.id || currentHospital?.id || "";
  const userType = currentPatient ? "patient" : currentDoctor ? "doctor" : "admin";

  const portalBase = portalName === "Patient" ? "/patient" : portalName === "Doctor" ? "/doctor" : "/admin";
  const allNavItems = portalName === "Doctor" ? navItems : [
  ...navItems,
  { label: "Leaderboard", path: `${portalBase}/leaderboard`, icon: <Trophy className="h-5 w-5" /> }];


  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);


  return (
    <div className="min-h-screen bg-background dot-grid flex transition-colors duration-300">
      {/* Desktop Sidebar (>1024px: full, 641-1024: collapsed icons) */}
      <aside
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className="sidebar hidden md:flex flex-col border-r border-border/50 bg-card/50 backdrop-blur-xl fixed h-full z-30 transition-all duration-300 ease-in-out"
        style={{
          background: 'var(--sidebar-bg)',
          borderColor: 'var(--border-default)',
          width: sidebarHovered ? '240px' : undefined
        }}>
        
        {/* Use CSS to control width at different breakpoints */}
        <style>{`
          @media (min-width: 768px) and (max-width: 1024px) {
            .sidebar { width: ${sidebarHovered ? '240px' : '64px'} !important; }
            .sidebar .nav-label { opacity: ${sidebarHovered ? '1' : '0'}; width: ${sidebarHovered ? 'auto' : '0'}; overflow: hidden; white-space: nowrap; transition: opacity 0.2s ease, width 0.2s ease; }
            .sidebar .sidebar-header-text { display: ${sidebarHovered ? 'flex' : 'none'}; }
            .sidebar .sidebar-footer { opacity: ${sidebarHovered ? '1' : '0'}; transition: opacity 0.2s ease; }
            .main-content { margin-left: 64px !important; }
          }
          @media (min-width: 1025px) {
            .sidebar { width: 240px !important; }
            .main-content { margin-left: 240px !important; }
          }
        `}</style>

        <div className="p-3 lg:p-4 flex items-center gap-2 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <Activity className="h-5 w-5 flex-shrink-0" style={{ color: accentColor }} />
          <div className="sidebar-header-text flex items-center gap-1.5 flex-1 min-w-0">
            <span className="font-display text-base font-bold logo-text whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
              Medi<span style={{ color: accentColor }}>AI</span>
            </span>
            <span className="text-xs whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.6)' }}>{portalName}</span>
            <div className="ml-auto flex items-center gap-1.5">
              <motion.button
                onClick={() => navigate(`${portalBase}/settings`)}
                whileHover={{ scale: 1.08, rotate: 45 }}
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.2 }}
                style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  background: 'transparent', border: '1px solid var(--border-default)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0
                }} className="border-0">
                
                <Settings2 size={14} className="w-[25px] h-[20px]" />
              </motion.button>
              {userId && <NotificationBell userId={userId} userType={userType} />}
            </div>
          </div>
        </div>

        <motion.nav
          className="flex-1 p-2 lg:p-3 space-y-0.5 overflow-y-auto scrollbar-thin"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } }
          }}>
          
          {allNavItems.map((item) => {
            const isActive = location.pathname === item.path || item.path === portalBase && location.pathname === portalBase || item.path !== portalBase && location.pathname.startsWith(item.path + '/');
            return (
              <motion.div
                key={item.path}
                variants={{
                  hidden: { opacity: 0, x: -12 },
                  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } }
                }}>
                
                <NavLink to={item.path} end={item.path === portalBase}
                className="relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm cursor-pointer select-none"
                style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.6)' }}
                title={item.label}>
                  
                  {/* Sliding background pill */}
                  {isActive &&
                  <motion.div
                    layoutId={`nav-active-bg-${portalName}`}
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: `${accentColor}18`,
                      border: `1px solid ${accentColor}30`
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }} />

                  }
                  {/* Sliding left accent bar */}
                  {isActive &&
                  <motion.div
                    layoutId={`nav-active-bar-${portalName}`}
                    className="absolute rounded-r-sm"
                    style={{
                      left: 0, top: '22%', bottom: '22%', width: 3,
                      background: accentColor,
                      boxShadow: `0 0 10px ${accentColor}90`
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }} />

                  }
                  {/* Glow */}
                  {isActive &&
                  <motion.div
                    layoutId={`nav-glow-${portalName}`}
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{ background: `radial-gradient(circle at left, ${accentColor}12, transparent 70%)` }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }} />

                  }
                  <motion.span
                    className="relative z-10 flex-shrink-0"
                    animate={{ color: isActive ? accentColor : 'rgba(255,255,255,0.6)', scale: isActive ? 1.1 : 1 }}
                    transition={{ duration: 0.2 }}>
                    
                    {item.icon}
                  </motion.span>
                  <motion.span
                    className="relative z-10 nav-label"
                    animate={{ fontWeight: isActive ? 600 : 400 }}
                    transition={{ duration: 0.2 }}
                    style={{ fontSize: '14px', letterSpacing: '0.01em' }}>
                    
                    {item.label}
                  </motion.span>
                </NavLink>
              </motion.div>);

          })}
        </motion.nav>

        <motion.div
          className="sidebar-footer p-4 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}>
          
          <div className="flex items-center justify-between">
            <span className="text-xs nav-label" style={{ color: 'rgba(255,255,255,0.5)' }}>Theme</span>
            <ThemeToggle />
          </div>
        </motion.div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 border-b bg-card/90 backdrop-blur-xl flex items-center justify-between px-4 py-3"
      style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" style={{ color: accentColor }} />
          <span className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>MediAI</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <motion.button
            onClick={() => navigate(`${portalBase}/settings`)}
            whileHover={{ scale: 1.08, rotate: 45 }}
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.2 }}
            style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'transparent', border: '1px solid var(--border-default)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-secondary)'
            }}>
            
            <Settings size={17} />
          </motion.button>
          {userId && <NotificationBell userId={userId} userType={userType} />}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex justify-around py-2 px-1 safe-bottom"
      style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border-default)' }}>
        {navItems.slice(0, 4).map((item) => {
          const active = location.pathname === item.path;
          return (
            <NavLink key={item.path} to={item.path} className="flex flex-col items-center gap-1 p-2 min-w-[48px]">
              <div className="p-1.5 rounded-xl transition-all"
              style={active ? { background: `${accentColor}20`, color: accentColor } : { color: "rgba(255,255,255,0.6)" }}>
                {item.icon}
              </div>
              <span className={`text-[10px] leading-tight ${active ? "font-semibold" : ""}`} style={active ? { color: accentColor } : { color: "rgba(255,255,255,0.6)" }}>
                {item.label.split(" ")[0]}
              </span>
            </NavLink>);

        })}
        <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center gap-1 p-2 min-w-[48px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <Menu className="h-5 w-5" />
          <span className="text-[10px] leading-tight">More</span>
        </button>
      </nav>

      {/* Mobile Slide-out Drawer */}
      <AnimatePresence>
        {sidebarOpen &&
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="fixed left-0 top-0 h-full w-[280px] max-w-[85vw] border-r z-50 md:hidden p-4 overflow-y-auto"
          style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border-default)' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Activity className="h-6 w-6" style={{ color: accentColor }} />
                  <span className="font-display text-lg font-bold" style={{ color: 'white' }}>MediAI</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg" style={{ color: 'rgba(255,255,255,0.6)' }}><X className="h-5 w-5" /></button>
              </div>
              <nav className="space-y-1">
                {allNavItems.map((item) =>
              <NavLink key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
              `nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all`
              }
              style={({ isActive }) => isActive ?
              { background: `${accentColor}20`, color: 'white' } :
              { color: 'rgba(255,255,255,0.7)' }}>
                    {item.icon}
                    {item.label}
                  </NavLink>
              )}
              </nav>

              <div className="mt-6 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <div className="flex items-center justify-between px-4">
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Theme</span>
                  <ThemeToggle />
                </div>
              </div>
            </motion.aside>
          </>
        }
      </AnimatePresence>

      {/* Content */}
      <main className="main-content flex-1 md:ml-64 pb-24 md:pb-0 pt-14 md:pt-0 min-w-0">
        <motion.div key={location.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }} className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
          {children}
        </motion.div>
      </main>
    </div>);

};

export default PortalLayout;