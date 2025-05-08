
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { MainLayout } from "@/components/MainLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SidebarProvider } from "@/components/ui/sidebar";

import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Members from "@/pages/Members";
import MemberForm from "@/pages/MemberForm";
import MemberDetails from "@/pages/MemberDetails";
import Dispensary from "@/pages/Dispensary";
import CashRegister from "@/pages/CashRegister";
import Inventory from "@/pages/Inventory";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import Users from "@/pages/Users";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";

// Initialize the database schema for RFID
import { db } from '@/lib/db';

import './App.css';

// Make sure the schema is updated
db.version(db.verno + 1).stores({
  members: '++id, memberCode, dni, firstName, lastName, rfidCode, createdAt'
}).upgrade(tx => {
  // Add rfidCode to existing members
  return tx.table('members').toCollection().modify(member => {
    if (!member.rfidCode) {
      member.rfidCode = '';
    }
  });
});

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Router>
        <AuthProvider>
          <SettingsProvider>
            <SidebarProvider defaultOpen={true}>
              <Routes>
                {/* Redirect from root to login */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                
                <Route path="/" element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="members" element={<Members />} />
                  <Route path="members/new" element={<MemberForm />} />
                  <Route path="members/:id" element={<MemberDetails />} />
                  <Route path="dispensary" element={<Dispensary />} />
                  <Route path="cash-register" element={<CashRegister />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="users" element={<Users />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
            </SidebarProvider>
          </SettingsProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
