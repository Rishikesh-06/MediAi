import { Outlet } from "react-router-dom";
import PortalLayout from "@/components/PortalLayout";
import AdminEmergencyOverlay from "@/components/AdminEmergencyOverlay";
import {
  LayoutDashboard, AlertTriangle, BedDouble, Truck, Users, Package, BarChart3, MapPin, UserPlus
} from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/admin", icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: "Emergencies", path: "/admin/emergencies", icon: <AlertTriangle className="h-5 w-5" /> },
  { label: "Bed Mgmt", path: "/admin/beds", icon: <BedDouble className="h-5 w-5" /> },
  { label: "Ambulances", path: "/admin/ambulances", icon: <Truck className="h-5 w-5" /> },
  { label: "Doctor Load", path: "/admin/doctors", icon: <Users className="h-5 w-5" /> },
  { label: "Register Dr", path: "/admin/register-doctor", icon: <UserPlus className="h-5 w-5" /> },
  { label: "Inventory", path: "/admin/inventory", icon: <Package className="h-5 w-5" /> },
  { label: "Analytics", path: "/admin/analytics", icon: <BarChart3 className="h-5 w-5" /> },
  { label: "Heatmap", path: "/admin/heatmap", icon: <MapPin className="h-5 w-5" /> },
];

const AdminLayout = () => (
  <PortalLayout portalName="Admin" accentColor="hsl(37, 100%, 56%)" navItems={navItems}>
    <AdminEmergencyOverlay />
    <Outlet />
  </PortalLayout>
);

export default AdminLayout;
