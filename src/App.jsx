import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const OAuthSuccessPage = lazy(() => import('./pages/auth/OAuthSuccessPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const ProductsPage = lazy(() => import('./pages/products/ProductsPage'));
const WarehousesPage = lazy(() => import('./pages/warehouses/WarehousesPage'));
const PurchasesPage = lazy(() => import('./pages/purchases/PurchasesPage'));
const MovementsPage = lazy(() => import('./pages/movements/MovementsPage'));
const SuppliersPage = lazy(() => import('./pages/suppliers/SuppliersPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const PaymentsPage = lazy(() => import('./pages/payments/PaymentsPage'));
const SupplierDashboard = lazy(() => import('./pages/suppliers/SupplierDashboard'));
const AccessDeniedPage = lazy(() => import('./pages/auth/AccessDeniedPage'));

const FallbackLoader = () => (
  <div className="d-flex justify-content-center align-items-center vh-100">
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

function App() {
  return (
    <div className="app">
      <Suspense fallback={<FallbackLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/oauth-success" element={<OAuthSuccessPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />

          {/* Protected Dashboard Routes wrapped in MainLayout */}
          <Route element={<MainLayout />}>
            {/* Base Protected Route (All Authenticated Users) */}
            <Route element={<ProtectedRoute requiredPermission="dashboard:view" />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            <Route element={<ProtectedRoute endpointMethod="GET" endpointPath="/movements" />}>
              <Route path="/movements" element={<MovementsPage />} />
            </Route>

            <Route element={<ProtectedRoute endpointMethod="GET" endpointPath="/products" />}>
              <Route path="/products" element={<ProductsPage />} />
            </Route>

            <Route element={<ProtectedRoute endpointMethod="GET" endpointPath="/warehouse" deniedRedirectTo="/dashboard" />}>
              <Route path="/warehouses" element={<WarehousesPage />} />
            </Route>

            <Route element={<ProtectedRoute endpointMethod="GET" endpointPath="/purchase-orders" />}>
              <Route path="/purchases" element={<PurchasesPage />} />
            </Route>

            <Route element={<ProtectedRoute endpointMethod="GET" endpointPath="/payments" />}>
              <Route path="/payments" element={<PaymentsPage />} />
            </Route>

            <Route element={<ProtectedRoute endpointMethod="GET" endpointPath="/suppliers" />}>
              <Route path="/suppliers" element={<SuppliersPage />} />
            </Route>

            <Route element={<ProtectedRoute endpointMethod="GET" endpointPath="/suppliers" deniedRedirectTo="/dashboard" />}>
              <Route path="/suppliers/dashboard" element={<SupplierDashboard />} />
            </Route>

            <Route element={<ProtectedRoute endpointMethod="GET" endpointPath="/reports" />}>
              <Route path="/reports" element={<ReportsPage />} />
            </Route>

            <Route element={<ProtectedRoute endpointMethod="GET" endpointPath="/auth/users" />}>
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </div>
  )
}

export default App
