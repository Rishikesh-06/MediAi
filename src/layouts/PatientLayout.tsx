import { Outlet, useNavigate } from "react-router-dom";
import PortalLayout from "@/components/PortalLayout";
import {
  LayoutDashboard, HeartPulse, MessageSquare, Pill, Stethoscope,
  Heart, Brain, Salad, FileBarChart, CalendarCheck, MapPin, Bell, LogOut
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";

const PatientLayout = () => {
  const { t } = useTranslation();

  const navItems = [
    { label: t("dashboard"), path: "/patient", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: t("healthCheck"), path: "/patient/health-check", icon: <HeartPulse className="h-5 w-5" /> },
    { label: t("aiAssistant"), path: "/patient/assistant", icon: <MessageSquare className="h-5 w-5" /> },
    { label: t("prescriptionDecoder"), path: "/patient/prescriptions", icon: <Pill className="h-5 w-5" /> },
    { label: t("bookDoctor"), path: "/patient/book-doctor", icon: <Stethoscope className="h-5 w-5" /> },
    { label: t("wellness"), path: "/patient/wellness", icon: <Salad className="h-5 w-5" /> },
    { label: t("appointments"), path: "/patient/appointments", icon: <CalendarCheck className="h-5 w-5" /> },
    { label: t("villageMap"), path: "/patient/village-map", icon: <MapPin className="h-5 w-5" /> },
    { label: t("reminders"), path: "/patient/reminders", icon: <Bell className="h-5 w-5" /> },
  ];

  return (
    <PortalLayout portalName="Patient" accentColor="hsl(152, 100%, 45%)" navItems={navItems}>
      <Outlet />
    </PortalLayout>
  );
};

export default PatientLayout;
