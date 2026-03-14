import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  village: string;
  aadhaar_last4?: string;
  health_score: number;
  language?: string;
  is_pregnant?: boolean;
  phone?: string;
  blood_group?: string;
  preferred_language?: string;
  district?: string;
  medical_history?: any;
  emergency_contacts?: any;
  auth_user_id?: string;
}

interface Doctor {
  id: string;
  name: string;
  reg_number: string;
  specialty: string;
  hospital_id: string;
  rating: number;
  is_online: boolean;
  earnings_today: number;
  patients_today: number;
  auth_id?: string;
  qualification?: string;
  languages?: string[];
  consultation_fee?: number;
  created_at?: string;
  email?: string;
}

interface Hospital {
  id: string;
  name: string;
  location: string;
  district: string;
  state: string;
  total_beds: number;
  available_beds: number;
  icu_available: number;
  ambulances_total: number;
  ambulances_available: number;
  oxygen_count: number;
  reg_number?: string;
  lat?: number;
  lng?: number;
  admin_auth_id?: string;
}

interface AppStore {
  currentPatient: Patient | null;
  currentDoctor: Doctor | null;
  currentHospital: Hospital | null;
  language: string;
  setPatient: (p: Patient | null) => void;
  setDoctor: (d: Doctor | null) => void;
  setHospital: (h: Hospital | null) => void;
  setLanguage: (l: string) => void;
  logout: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      currentPatient: null,
      currentDoctor: null,
      currentHospital: null,
      language: 'en',
      setPatient: (p) => set({ currentPatient: p }),
      setDoctor: (d) => set({ currentDoctor: d }),
      setHospital: (h) => set({ currentHospital: h }),
      setLanguage: (l) => set({ language: l }),
      logout: () => set({ currentPatient: null, currentDoctor: null, currentHospital: null }),
    }),
    { name: 'mediai-store' }
  )
);
