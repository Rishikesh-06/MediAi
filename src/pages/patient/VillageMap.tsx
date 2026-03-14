import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { MapPin, Trophy, Search, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const zoneColors: Record<string, string> = { red: "#ff4757", orange: "#ffb830", green: "#00e87a" };

const VillageMap = () => {
  const [villages, setVillages] = useState<any[]>([]);
  const [symptomTabs, setSymptomTabs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [zoneFilter, setZoneFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [userLocation, setUserLocation] = useState({ lat: 26.5, lng: 75.0 });
  const [locationName, setLocationName] = useState("Detecting location...");
  const [detectingGPS, setDetectingGPS] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: 26.5, lng: 75.0 });
  const [mapZoom, setMapZoom] = useState(3);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          setMapCenter(loc);
          setLocationName("Your Current Location");
          setDetectingGPS(false);
        },
        () => {
          setUserLocation({ lat: 26.9124, lng: 75.7873 });
          setMapCenter({ lat: 26.5, lng: 75.0 });
          setLocationName("Default Location");
          setDetectingGPS(false);
        }
      );
    } else {
      setDetectingGPS(false);
      setLocationName("Default Location");
    }
  }, []);

  const loadVillages = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading real villages from patients table...');
      
      // Query ONLY the patients table - the ONLY source of truth
      const { data: patients, error: patientError } = await supabase
        .from('patients')
        .select('id, village, district, health_checks(id, ai_triage, symptoms, created_at)')
        .not('village', 'is', null)
        .neq('village', '');

      if (patientError) {
        console.error('Patient query error:', patientError);
        setVillages([]);
        setSymptomTabs([]);
        return;
      }

      console.log('Real patients found:', patients?.length);

      // If no patients have villages yet
      if (!patients || patients.length === 0) {
        console.log('No villages yet');
        setVillages([]);
        setSymptomTabs([]);
        setLastUpdated(new Date());
        return;
      }

      // Group patients by village name (case-insensitive, trimmed)
      const villageMap: Record<string, any> = {};
      const allSymptoms = new Set<string>();

      patients.forEach((p: any) => {
        if (!p.village) return;
        
        const villageKey = p.village.trim().toLowerCase();
        const villageName = p.village.trim();
        
        if (!villageMap[villageKey]) {
          villageMap[villageKey] = {
            village_name: villageName,
            district: p.district?.trim() || 'Unknown District',
            patient_count: 0,
            total_cases: 0,
            emergency_count: 0,
            symptoms: {} as Record<string, number>,
            patientIds: [],
          };
        }
        
        villageMap[villageKey].patient_count++;
        villageMap[villageKey].patientIds.push(p.id);
        villageMap[villageKey].total_cases += p.health_checks?.length || 0;
        villageMap[villageKey].emergency_count += (p.health_checks || []).filter((hc: any) => hc.ai_triage === 'emergency').length;

        (p.health_checks || []).forEach((hc: any) => {
          const syms = Array.isArray(hc.symptoms) ? hc.symptoms : [];
          syms.forEach((s: string) => {
            const sym = typeof s === 'string' ? s.toLowerCase() : '';
            if (sym) {
              villageMap[villageKey].symptoms[sym] = (villageMap[villageKey].symptoms[sym] || 0) + 1;
              allSymptoms.add(sym.charAt(0).toUpperCase() + sym.slice(1));
            }
          });
        });
      });

      console.log('Villages grouped:', Object.keys(villageMap));

      const villageList = Object.values(villageMap).map((v: any) => ({
        ...v,
        zone_color: v.emergency_count >= 3 ? 'red' : v.emergency_count >= 1 ? 'orange' : 'green',
      }));

      // Sort: red first, then orange, green
      villageList.sort((a: any, b: any) => {
        const order = { red: 0, orange: 1, green: 2 };
        return order[a.zone_color] - order[b.zone_color];
      });

      console.log('Final villages:', villageList.map((v: any) => v.village_name));

      setVillages(villageList);
      setSymptomTabs([...allSymptoms]);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Failed to load villages", e);
      setVillages([]);
      setSymptomTabs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVillages();
  }, [loadVillages]);

  const filtered = villages.filter(v => {
    if (zoneFilter !== "All" && v.zone_color !== zoneFilter.toLowerCase()) return false;
    if (filter !== "All") {
      if (!v.symptoms?.[filter.toLowerCase()]) return false;
    }
    if (search && !v.village_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const healthiest = [...villages].sort((a, b) => (a.total_cases || 0) - (b.total_cases || 0))[0];
  const leaderboard = [...villages].sort((a, b) => (a.total_cases || 0) - (b.total_cases || 0)).slice(0, 5);

  const redCount = villages.filter(v => v.zone_color === 'red').length;
  const orangeCount = villages.filter(v => v.zone_color === 'orange').length;
  const greenCount = villages.filter(v => v.zone_color === 'green').length;

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.lng - mapZoom},${mapCenter.lat - mapZoom},${mapCenter.lng + mapZoom},${mapCenter.lat + mapZoom}&layer=mapnik&marker=${userLocation.lat},${userLocation.lng}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (villages.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground">Village Health Map 🗺️</h2>
        <div className="glass-card p-12 text-center">
          <p className="text-4xl mb-4">🗺️</p>
          <p className="text-foreground font-bold text-lg">No villages registered yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Villages appear automatically as patients from different areas complete health checks.<br/>
            <span className="text-xs opacity-75">Currently showing only real patient data - no mock villages.</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-2xl font-bold text-foreground">Village Health Map 🗺️</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Updated • {lastUpdated.toLocaleTimeString()}
          </span>
          {detectingGPS && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Detecting GPS...</span>}
          {!detectingGPS && <span className="text-xs">📍 {locationName}</span>}
        </div>
      </div>

      {symptomTabs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {["All", ...symptomTabs].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-accent"}`}>
              {f}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        <div className="glass-card p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{villages.length}</p>
          <p className="text-xs text-muted-foreground">Total Villages</p>
        </div>
        <div className="glass-card p-3 text-center border-l-4" style={{ borderColor: '#ff4757' }}>
          <p className="text-2xl font-bold" style={{ color: '#ff4757' }}>{redCount}</p>
          <p className="text-xs text-muted-foreground">Red Zone</p>
        </div>
        <div className="glass-card p-3 text-center border-l-4" style={{ borderColor: '#ffb830' }}>
          <p className="text-2xl font-bold" style={{ color: '#ffb830' }}>{orangeCount}</p>
          <p className="text-xs text-muted-foreground">Orange Zone</p>
        </div>
        <div className="glass-card p-3 text-center border-l-4" style={{ borderColor: '#00e87a' }}>
          <p className="text-2xl font-bold" style={{ color: '#00e87a' }}>{greenCount}</p>
          <p className="text-xs text-muted-foreground">Green Zone</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="lg:w-[60%] w-full">
          <div className="glass-card overflow-hidden rounded-2xl relative" style={{ height: 450 }}>
            <iframe src={mapUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Village Health Map" loading="lazy" />
          </div>
          <div className="flex gap-2 mt-2">
            <a href={`https://www.google.com/maps?q=${mapCenter.lat},${mapCenter.lng}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
              📍 Open in Google Maps <ExternalLink className="h-3 w-3" />
            </a>
            <button onClick={() => { setMapCenter({ lat: 26.5, lng: 75.0 }); setMapZoom(3); }}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent transition-colors">
              <RefreshCw className="h-3 w-3" /> Reset View
            </button>
          </div>
        </div>

        <div className="lg:w-[40%] w-full space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search village..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-secondary text-foreground text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          <div className="flex gap-1">
            {["All", "Red", "Orange", "Green"].map(z => (
              <button key={z} onClick={() => setZoneFilter(z)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${zoneFilter === z ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-accent'}`}>
                {z}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">No villages found</div>
            )}
            {filtered.map((v, i) => (
              <motion.div key={v.village_name + i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors border-l-4"
                style={{ borderColor: zoneColors[v.zone_color] || '#00e87a' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {v.village_name} {healthiest?.village_name === v.village_name ? "🏆" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{v.district} • {v.patient_count} patients</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-sm font-bold text-foreground">{v.total_cases}</span>
                  <p className="text-[10px] text-muted-foreground">checks</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                  style={{ background: `${zoneColors[v.zone_color]}20`, color: zoneColors[v.zone_color] }}>
                  {v.zone_color}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4 justify-center flex-wrap">
        <span className="flex items-center gap-2 text-xs text-muted-foreground"><span className="w-3 h-3 rounded-full" style={{ background: "#ff4757" }} /> Red: 3+ emergencies</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground"><span className="w-3 h-3 rounded-full" style={{ background: "#ffb830" }} /> Orange: 1-2 emergencies</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground"><span className="w-3 h-3 rounded-full" style={{ background: "#00e87a" }} /> Green: No emergencies</span>
      </div>

      {leaderboard.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2"><Trophy className="h-5 w-5 text-urgent" /> Healthiest Villages</h3>
          <div className="space-y-3">
            {leaderboard.map((v, i) => (
              <div key={v.village_name + i} className="flex items-center gap-3">
                <span className={`font-mono text-lg font-bold w-8 ${i === 0 ? "text-urgent" : "text-muted-foreground"}`}>
                  {i === 0 ? "🏆" : `#${i + 1}`}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{v.village_name}</p>
                  <p className="text-xs text-muted-foreground">{v.district}</p>
                </div>
                <span className="font-mono text-sm text-foreground">{v.patient_count} patients</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase"
                  style={{ background: `${zoneColors[v.zone_color]}20`, color: zoneColors[v.zone_color] }}>
                  {v.zone_color}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VillageMap;
