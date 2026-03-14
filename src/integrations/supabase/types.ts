export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          patient_id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          patient_id: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          patient_id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          language: string | null
          patient_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          language?: string | null
          patient_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          language?: string | null
          patient_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ambulances: {
        Row: {
          created_at: string
          current_emergency_id: string | null
          current_lat: number | null
          current_lng: number | null
          destination: string | null
          destination_lat: number | null
          destination_lng: number | null
          driver_name: string
          eta_minutes: number | null
          hospital_id: string
          id: string
          patient_id: string | null
          status: string | null
          vehicle_number: string
        }
        Insert: {
          created_at?: string
          current_emergency_id?: string | null
          current_lat?: number | null
          current_lng?: number | null
          destination?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          driver_name: string
          eta_minutes?: number | null
          hospital_id: string
          id?: string
          patient_id?: string | null
          status?: string | null
          vehicle_number: string
        }
        Update: {
          created_at?: string
          current_emergency_id?: string | null
          current_lat?: number | null
          current_lng?: number | null
          destination?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          driver_name?: string
          eta_minutes?: number | null
          hospital_id?: string
          id?: string
          patient_id?: string | null
          status?: string | null
          vehicle_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambulances_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulances_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          created_at: string
          date_time: string
          doctor_id: string
          ended_at: string | null
          hospital_id: string | null
          id: string
          patient_id: string
          payment_amount: number | null
          payment_status: string | null
          started_at: string | null
          status: string | null
          time_slot: string | null
          type: string | null
        }
        Insert: {
          created_at?: string
          date_time: string
          doctor_id: string
          ended_at?: string | null
          hospital_id?: string | null
          id?: string
          patient_id: string
          payment_amount?: number | null
          payment_status?: string | null
          started_at?: string | null
          status?: string | null
          time_slot?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string
          date_time?: string
          doctor_id?: string
          ended_at?: string | null
          hospital_id?: string | null
          id?: string
          patient_id?: string
          payment_amount?: number | null
          payment_status?: string | null
          started_at?: string | null
          status?: string | null
          time_slot?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      asha_workers: {
        Row: {
          asha_id: string
          auth_id: string | null
          created_at: string
          district: string | null
          email: string | null
          families_count: number | null
          id: string
          name: string
          password: string | null
          phone: string | null
          village: string
        }
        Insert: {
          asha_id: string
          auth_id?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          families_count?: number | null
          id?: string
          name: string
          password?: string | null
          phone?: string | null
          village: string
        }
        Update: {
          asha_id?: string
          auth_id?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          families_count?: number | null
          id?: string
          name?: string
          password?: string | null
          phone?: string | null
          village?: string
        }
        Relationships: []
      }
      beds: {
        Row: {
          bed_number: string
          condition: string | null
          created_at: string
          hospital_id: string
          id: string
          patient_name: string | null
          status: string | null
          ward: string
        }
        Insert: {
          bed_number: string
          condition?: string | null
          created_at?: string
          hospital_id: string
          id?: string
          patient_name?: string | null
          status?: string | null
          ward?: string
        }
        Update: {
          bed_number?: string
          condition?: string | null
          created_at?: string
          hospital_id?: string
          id?: string
          patient_name?: string | null
          status?: string | null
          ward?: string
        }
        Relationships: [
          {
            foreignKeyName: "beds_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          auth_id: string | null
          consultation_fee: number | null
          created_at: string
          earnings_today: number | null
          email: string | null
          hospital_id: string | null
          id: string
          is_online: boolean | null
          languages: string[] | null
          name: string
          password: string | null
          patients_today: number | null
          qualification: string | null
          rating: number | null
          reg_number: string
          specialty: string
        }
        Insert: {
          auth_id?: string | null
          consultation_fee?: number | null
          created_at?: string
          earnings_today?: number | null
          email?: string | null
          hospital_id?: string | null
          id?: string
          is_online?: boolean | null
          languages?: string[] | null
          name: string
          password?: string | null
          patients_today?: number | null
          qualification?: string | null
          rating?: number | null
          reg_number: string
          specialty: string
        }
        Update: {
          auth_id?: string | null
          consultation_fee?: number | null
          created_at?: string
          earnings_today?: number | null
          email?: string | null
          hospital_id?: string | null
          id?: string
          is_online?: boolean | null
          languages?: string[] | null
          name?: string
          password?: string | null
          patients_today?: number | null
          qualification?: string | null
          rating?: number | null
          reg_number?: string
          specialty?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctors_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      emergencies: {
        Row: {
          ambulance_dispatched_at: string | null
          ambulance_eta: number | null
          ambulance_id: string | null
          bed_assigned: string | null
          created_at: string
          dispatch_notes: string | null
          doctor_confirmed_at: string | null
          doctor_id: string | null
          health_check_id: string | null
          hospital_id: string | null
          hospital_notified_at: string | null
          id: string
          overridden_at: string | null
          overridden_by_doctor: string | null
          override_reason: string | null
          patient_id: string
          patient_lat: number | null
          patient_lng: number | null
          reached_at: string | null
          status: string | null
        }
        Insert: {
          ambulance_dispatched_at?: string | null
          ambulance_eta?: number | null
          ambulance_id?: string | null
          bed_assigned?: string | null
          created_at?: string
          dispatch_notes?: string | null
          doctor_confirmed_at?: string | null
          doctor_id?: string | null
          health_check_id?: string | null
          hospital_id?: string | null
          hospital_notified_at?: string | null
          id?: string
          overridden_at?: string | null
          overridden_by_doctor?: string | null
          override_reason?: string | null
          patient_id: string
          patient_lat?: number | null
          patient_lng?: number | null
          reached_at?: string | null
          status?: string | null
        }
        Update: {
          ambulance_dispatched_at?: string | null
          ambulance_eta?: number | null
          ambulance_id?: string | null
          bed_assigned?: string | null
          created_at?: string
          dispatch_notes?: string | null
          doctor_confirmed_at?: string | null
          doctor_id?: string | null
          health_check_id?: string | null
          hospital_id?: string | null
          hospital_notified_at?: string | null
          id?: string
          overridden_at?: string | null
          overridden_by_doctor?: string | null
          override_reason?: string | null
          patient_id?: string
          patient_lat?: number | null
          patient_lng?: number | null
          reached_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergencies_ambulance_id_fkey"
            columns: ["ambulance_id"]
            isOneToOne: false
            referencedRelation: "ambulances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergencies_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergencies_health_check_id_fkey"
            columns: ["health_check_id"]
            isOneToOne: false
            referencedRelation: "health_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergencies_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergencies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          asha_id: string
          created_at: string
          family_name: string
          health_status: string | null
          id: string
          last_visit: string | null
          members: Json | null
        }
        Insert: {
          asha_id: string
          created_at?: string
          family_name: string
          health_status?: string | null
          id?: string
          last_visit?: string | null
          members?: Json | null
        }
        Update: {
          asha_id?: string
          created_at?: string
          family_name?: string
          health_status?: string | null
          id?: string
          last_visit?: string | null
          members?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "families_asha_id_fkey"
            columns: ["asha_id"]
            isOneToOne: false
            referencedRelation: "asha_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      health_checks: {
        Row: {
          ai_condition: string | null
          ai_explanation: Json | null
          ai_first_aid: string | null
          ai_recommendations: Json | null
          ai_risk_score: number | null
          ai_triage: string | null
          assigned_doctor_id: string | null
          body_parts: Json | null
          created_at: string
          history: Json | null
          id: string
          patient_id: string
          symptoms: Json
          vitals: Json | null
        }
        Insert: {
          ai_condition?: string | null
          ai_explanation?: Json | null
          ai_first_aid?: string | null
          ai_recommendations?: Json | null
          ai_risk_score?: number | null
          ai_triage?: string | null
          assigned_doctor_id?: string | null
          body_parts?: Json | null
          created_at?: string
          history?: Json | null
          id?: string
          patient_id: string
          symptoms?: Json
          vitals?: Json | null
        }
        Update: {
          ai_condition?: string | null
          ai_explanation?: Json | null
          ai_first_aid?: string | null
          ai_recommendations?: Json | null
          ai_risk_score?: number | null
          ai_triage?: string | null
          assigned_doctor_id?: string | null
          body_parts?: Json | null
          created_at?: string
          history?: Json | null
          id?: string
          patient_id?: string
          symptoms?: Json
          vitals?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "health_checks_assigned_doctor_id_fkey"
            columns: ["assigned_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_checks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          admin_auth_id: string | null
          admin_email: string | null
          admin_name: string | null
          ambulances_available: number | null
          ambulances_total: number | null
          available_beds: number | null
          blood_bank: Json | null
          created_at: string
          district: string
          icu_available: number | null
          id: string
          is_registered: boolean | null
          lat: number | null
          lng: number | null
          location: string
          medicine_stock: Json | null
          name: string
          oxygen_count: number | null
          password: string | null
          reg_number: string | null
          state: string
          total_beds: number | null
          ventilators: number | null
        }
        Insert: {
          admin_auth_id?: string | null
          admin_email?: string | null
          admin_name?: string | null
          ambulances_available?: number | null
          ambulances_total?: number | null
          available_beds?: number | null
          blood_bank?: Json | null
          created_at?: string
          district: string
          icu_available?: number | null
          id?: string
          is_registered?: boolean | null
          lat?: number | null
          lng?: number | null
          location: string
          medicine_stock?: Json | null
          name: string
          oxygen_count?: number | null
          password?: string | null
          reg_number?: string | null
          state: string
          total_beds?: number | null
          ventilators?: number | null
        }
        Update: {
          admin_auth_id?: string | null
          admin_email?: string | null
          admin_name?: string | null
          ambulances_available?: number | null
          ambulances_total?: number | null
          available_beds?: number | null
          blood_bank?: Json | null
          created_at?: string
          district?: string
          icu_available?: number | null
          id?: string
          is_registered?: boolean | null
          lat?: number | null
          lng?: number | null
          location?: string
          medicine_stock?: Json | null
          name?: string
          oxygen_count?: number | null
          password?: string | null
          reg_number?: string | null
          state?: string
          total_beds?: number | null
          ventilators?: number | null
        }
        Relationships: []
      }
      medicine_reminders: {
        Row: {
          created_at: string
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean | null
          medicine_name: string
          patient_id: string
          start_date: string
          times: Json | null
        }
        Insert: {
          created_at?: string
          dosage: string
          end_date?: string | null
          frequency: string
          id?: string
          is_active?: boolean | null
          medicine_name: string
          patient_id: string
          start_date?: string
          times?: Json | null
        }
        Update: {
          created_at?: string
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          medicine_name?: string
          patient_id?: string
          start_date?: string
          times?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "medicine_reminders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      mental_health_logs: {
        Row: {
          ai_analysis: Json | null
          answers: Json | null
          created_at: string
          id: string
          mood_score: number | null
          patient_id: string
          risk_level: string | null
          stress_level: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          answers?: Json | null
          created_at?: string
          id?: string
          mood_score?: number | null
          patient_id: string
          risk_level?: string | null
          stress_level?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          answers?: Json | null
          created_at?: string
          id?: string
          mood_score?: number | null
          patient_id?: string
          risk_level?: string | null
          stress_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mental_health_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
          user_type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          aadhaar_last4: string | null
          age: number
          auth_user_id: string | null
          blood_group: string | null
          created_at: string
          district: string | null
          email: string | null
          emergency_contacts: Json | null
          gender: string
          health_score: number | null
          id: string
          is_pregnant: boolean | null
          language: string | null
          medical_history: Json | null
          name: string
          notification_preferences: Json | null
          phone: string | null
          preferred_language: string | null
          village: string
        }
        Insert: {
          aadhaar_last4?: string | null
          age: number
          auth_user_id?: string | null
          blood_group?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          emergency_contacts?: Json | null
          gender: string
          health_score?: number | null
          id?: string
          is_pregnant?: boolean | null
          language?: string | null
          medical_history?: Json | null
          name: string
          notification_preferences?: Json | null
          phone?: string | null
          preferred_language?: string | null
          village: string
        }
        Update: {
          aadhaar_last4?: string | null
          age?: number
          auth_user_id?: string | null
          blood_group?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          emergency_contacts?: Json | null
          gender?: string
          health_score?: number | null
          id?: string
          is_pregnant?: boolean | null
          language?: string | null
          medical_history?: Json | null
          name?: string
          notification_preferences?: Json | null
          phone?: string | null
          preferred_language?: string | null
          village?: string
        }
        Relationships: []
      }
      prescription_history: {
        Row: {
          created_at: string | null
          date_on_prescription: string | null
          decoded_result: Json | null
          diagnosis: string | null
          doctor_name: string | null
          id: string
          image_url: string | null
          medicines_count: number | null
          patient_id: string
          patient_name: string | null
          raw_text: string | null
          total_branded_cost: string | null
          total_generic_cost: string | null
          total_savings: string | null
        }
        Insert: {
          created_at?: string | null
          date_on_prescription?: string | null
          decoded_result?: Json | null
          diagnosis?: string | null
          doctor_name?: string | null
          id?: string
          image_url?: string | null
          medicines_count?: number | null
          patient_id: string
          patient_name?: string | null
          raw_text?: string | null
          total_branded_cost?: string | null
          total_generic_cost?: string | null
          total_savings?: string | null
        }
        Update: {
          created_at?: string | null
          date_on_prescription?: string | null
          decoded_result?: Json | null
          diagnosis?: string | null
          doctor_name?: string | null
          id?: string
          image_url?: string | null
          medicines_count?: number | null
          patient_id?: string
          patient_name?: string | null
          raw_text?: string | null
          total_branded_cost?: string | null
          total_generic_cost?: string | null
          total_savings?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string
          doctor_id: string | null
          doctor_notes: string | null
          follow_up_date: string | null
          health_check_id: string | null
          id: string
          medicines: Json
          patient_id: string
          rx_number: string | null
        }
        Insert: {
          created_at?: string
          doctor_id?: string | null
          doctor_notes?: string | null
          follow_up_date?: string | null
          health_check_id?: string | null
          id?: string
          medicines?: Json
          patient_id: string
          rx_number?: string | null
        }
        Update: {
          created_at?: string
          doctor_id?: string | null
          doctor_notes?: string | null
          follow_up_date?: string | null
          health_check_id?: string | null
          id?: string
          medicines?: Json
          patient_id?: string
          rx_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_health_check_id_fkey"
            columns: ["health_check_id"]
            isOneToOne: false
            referencedRelation: "health_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      village_health: {
        Row: {
          district: string
          id: string
          lat: number | null
          lng: number | null
          state: string
          symptom_counts: Json | null
          total_cases: number | null
          updated_at: string
          village_name: string
          zone_color: string | null
        }
        Insert: {
          district: string
          id?: string
          lat?: number | null
          lng?: number | null
          state: string
          symptom_counts?: Json | null
          total_cases?: number | null
          updated_at?: string
          village_name: string
          zone_color?: string | null
        }
        Update: {
          district?: string
          id?: string
          lat?: number | null
          lng?: number | null
          state?: string
          symptom_counts?: Json | null
          total_cases?: number | null
          updated_at?: string
          village_name?: string
          zone_color?: string | null
        }
        Relationships: []
      }
      women_health: {
        Row: {
          created_at: string | null
          cycle_length: number | null
          cycle_number: number | null
          due_date: string | null
          flow_intensity: string | null
          id: string
          last_period_date: string | null
          lmp_date: string | null
          mood: string | null
          notes: string | null
          patient_id: string
          period_duration: number | null
          period_end_date: string | null
          symptoms: string[] | null
          type: string
          updated_at: string | null
          week_number: number | null
        }
        Insert: {
          created_at?: string | null
          cycle_length?: number | null
          cycle_number?: number | null
          due_date?: string | null
          flow_intensity?: string | null
          id?: string
          last_period_date?: string | null
          lmp_date?: string | null
          mood?: string | null
          notes?: string | null
          patient_id: string
          period_duration?: number | null
          period_end_date?: string | null
          symptoms?: string[] | null
          type: string
          updated_at?: string | null
          week_number?: number | null
        }
        Update: {
          created_at?: string | null
          cycle_length?: number | null
          cycle_number?: number | null
          due_date?: string | null
          flow_intensity?: string | null
          id?: string
          last_period_date?: string | null
          lmp_date?: string | null
          mood?: string | null
          notes?: string | null
          patient_id?: string
          period_duration?: number | null
          period_end_date?: string | null
          symptoms?: string[] | null
          type?: string
          updated_at?: string | null
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "women_health_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
