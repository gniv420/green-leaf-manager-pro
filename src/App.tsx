
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { MainLayout } from "@/components/MainLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Members from "@/pages/Members";
import MemberForm from "@/pages/MemberForm";
import MemberDetails from "@/pages/MemberDetails";
import Dispensary from "@/pages/Dispensary";
import CashRegister from "@/pages/CashRegister";
import CashManagement from "@/pages/CashManagement";
import Inventory from "@/pages/Inventory";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import Users from "@/pages/Users";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "@/pages/Index";

import './App.css';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="members" element={<Members />} />
              <Route path="members/new" element={<MemberForm />} />
              <Route path="members/:id" element={<MemberDetails />} />
              <Route path="dispensary" element={<Dispensary />} />
              <Route path="cash-register" element={<CashRegister />} />
              <Route path="cash-management" element={<CashManagement />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="users" element={<Users />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
