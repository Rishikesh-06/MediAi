import { Outlet } from "react-router-dom";
import PortalLayout from "@/components/PortalLayout";
import EmergencyCallOverlay from "@/components/EmergencyCallOverlay";
import {
  LayoutDashboard, Users, Pill, BarChart3, MapPin
} from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/doctor", icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: "Patient Queue", path: "/doctor/queue", icon: <Users className="h-5 w-5" /> },
  { label: "Prescriptions", path: "/doctor/prescriptions", icon: <Pill className="h-5 w-5" /> },
  { label: "Analytics", path: "/doctor/analytics", icon: <BarChart3 className="h-5 w-5" /> },
  { label: "Village Map", path: "/doctor/village-map", icon: <MapPin className="h-5 w-5" /> },
];

const DoctorLayout = () => (
  <PortalLayout portalName="Doctor" accentColor="hsl(190, 90%, 59%)" navItems={navItems}>
    <EmergencyCallOverlay />
    <Outlet />
  </PortalLayout>
);

export default DoctorLayout;
