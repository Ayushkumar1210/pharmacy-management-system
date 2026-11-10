import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { PosBilling } from './pages/PosBilling';
import { Inventory } from './pages/Inventory';
import { SalesHistory } from './pages/SalesHistory';
import { Purchases } from './pages/Purchases';
import { ReturnsAdjustments } from './pages/ReturnsAdjustments';
import { AuditTrail } from './pages/AuditTrail';
import { Reports } from './pages/Reports';
import { Suppliers } from './pages/Suppliers';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(...(allowedRoles as any))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="pos" element={<PosBilling />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="sales" element={<SalesHistory />} />
            <Route
              path="purchases"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'PHARMACIST']}>
                  <Purchases />
                </ProtectedRoute>
              }
            />
            <Route
              path="adjustments"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'PHARMACIST']}>
                  <ReturnsAdjustments />
                </ProtectedRoute>
              }
            />
            <Route
              path="audit"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'PHARMACIST']}>
                  <AuditTrail />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'PHARMACIST']}>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="suppliers"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'PHARMACIST']}>
                  <Suppliers />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
