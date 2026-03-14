import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "@/i18n";
import LandingPage from "./pages/LandingPage";
import NotFound from "./pages/NotFound";
import PatientLayout from "./layouts/PatientLayout";
import DoctorLayout from "./layouts/DoctorLayout";
import AdminLayout from "./layouts/AdminLayout";
import PatientDashboard from "./pages/patient/PatientDashboard";
import HealthCheck from "./pages/patient/HealthCheck";
import AIAssistant from "./pages/patient/AIAssistant";
import DiagnosisResult from "./pages/patient/DiagnosisResult";
import PrescriptionDecoder from "./pages/patient/PrescriptionDecoder";
import BookDoctor from "./pages/patient/BookDoctor";
import MentalHealth from "./pages/patient/MentalHealth";
import Wellness from "./pages/patient/Wellness";
import MedicineReminders from "./pages/patient/MedicineReminders";
import WomensHealth from "./pages/patient/WomensHealth";
import HealthReport from "./pages/patient/HealthReport";
import VillageMap from "./pages/patient/VillageMap";
import VideoConsultation from "./pages/patient/VideoConsultation";
import EmergencyTrackingPage from "./pages/patient/EmergencyTrackingPage";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import PatientQueue from "./pages/doctor/PatientQueue";
import PatientReport from "./pages/doctor/PatientReport";
import WritePrescription from "./pages/doctor/WritePrescription";
import DoctorAnalytics from "./pages/doctor/DoctorAnalytics";
import DoctorLogin from "./pages/doctor/DoctorLogin";
import DoctorVideo from "./pages/doctor/DoctorVideo";
import DoctorSettings from "./pages/doctor/DoctorSettings";
import DoctorPrescriptions from "./pages/doctor/DoctorPrescriptions";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminSignup from "./pages/admin/AdminSignup";
import RegisterDoctor from "./pages/admin/RegisterDoctor";
import EmergencyAlerts from "./pages/admin/EmergencyAlerts";
import BedManagement from "./pages/admin/BedManagement";
import AmbulanceTracking from "./pages/admin/AmbulanceTracking";
import DoctorLoad from "./pages/admin/DoctorLoad";
import ResourceInventory from "./pages/admin/ResourceInventory";
import HospitalAnalytics from "./pages/admin/HospitalAnalytics";
import Leaderboard from "./pages/Leaderboard";
import HealthCheckHub from "./pages/patient/HealthCheckHub";
import PatientSettings from "./pages/patient/PatientSettings";
import PatientSignup from "./pages/patient/PatientSignup";
import PatientLogin from "./pages/patient/PatientLogin";
import AuthCallback from "./pages/auth/AuthCallback";
import Appointments from "./pages/patient/Appointments";

const queryClient = new QueryClient();

// Animated Routes wrapper - uses location for AnimatePresence
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/patient/signup" element={<PatientSignup />} />
        <Route path="/patient/login" element={<PatientLogin />} />

        {/* Patient Portal */}
        <Route path="/patient" element={<PatientLayout />}>
          <Route index element={<PatientDashboard />} />
          <Route path="health-check" element={<HealthCheckHub />} />
          <Route path="health-check/full-body" element={<HealthCheck />} />
          <Route path="health-check/womens-health" element={<WomensHealth />} />
          <Route path="health-check/mental-health" element={<MentalHealth />} />
          <Route path="assistant" element={<AIAssistant />} />
          <Route path="diagnosis" element={<DiagnosisResult />} />
          <Route path="prescriptions" element={<PrescriptionDecoder />} />
          <Route path="book-doctor" element={<BookDoctor />} />
          <Route path="womens-health" element={<WomensHealth />} />
          <Route path="mental-health" element={<MentalHealth />} />
          <Route path="wellness" element={<Wellness />} />
          <Route path="reports" element={<HealthReport />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="village-map" element={<VillageMap />} />
          <Route path="reminders" element={<MedicineReminders />} />
          <Route path="video" element={<VideoConsultation />} />
          <Route path="emergency-tracking/:emergencyId" element={<EmergencyTrackingPage />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="settings" element={<PatientSettings />} />
        </Route>

        {/* Doctor Portal */}
        <Route path="/doctor/login" element={<DoctorLogin />} />
        <Route path="/doctor" element={<DoctorLayout />}>
          <Route index element={<DoctorDashboard />} />
          <Route path="queue" element={<PatientQueue />} />
          <Route path="patient/:patientId" element={<PatientReport />} />
          <Route path="prescription/:patientId" element={<WritePrescription />} />
          <Route path="prescriptions" element={<DoctorPrescriptions />} />
          <Route path="video/:appointmentId" element={<DoctorVideo />} />
          <Route path="analytics" element={<DoctorAnalytics />} />
          <Route path="village-map" element={<VillageMap />} />
          <Route path="settings" element={<DoctorSettings />} />
        </Route>

        {/* Admin Portal */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/signup" element={<AdminSignup />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="emergencies" element={<EmergencyAlerts />} />
          <Route path="beds" element={<BedManagement />} />
          <Route path="ambulances" element={<AmbulanceTracking />} />
          <Route path="doctors" element={<DoctorLoad />} />
          <Route path="register-doctor" element={<RegisterDoctor />} />
          <Route path="inventory" element={<ResourceInventory />} />
          <Route path="analytics" element={<HospitalAnalytics />} />
          <Route path="heatmap" element={<VillageMap />} />
          <Route path="leaderboard" element={<Leaderboard />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary>
            <AnimatedRoutes />
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
