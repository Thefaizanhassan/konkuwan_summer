import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AuthProvider from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Layouts
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout';

// Public pages are eager: they are the first paint for anyone arriving from a
// search result, and they are small.
import Home from './pages/Home';
import Products from './pages/Products';
import Supply from './pages/Supply';
import Impact from './pages/Impact';
import Partners from './pages/Partners';
import About from './pages/About';
import Contact from './pages/Contact';
import SetPassword from './pages/SetPassword';
import Login from './pages/admin/Login';

// Admin pages are lazy. They pull in Recharts, jsPDF and PapaParse — roughly a
// megabyte that a visitor reading the public site was downloading and never
// using. Splitting here keeps that cost on the screens that need it.
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const ProductManagement = lazy(() => import('./pages/admin/ProductManagement'));
const OrderManagement = lazy(() => import('./pages/admin/OrderManagement'));
const CustomerManagement = lazy(() => import('./pages/admin/CustomerManagement'));
const CustomerProfile = lazy(() => import('./pages/admin/CustomerProfile'));
const DeliveryChallan = lazy(() => import('./pages/admin/DeliveryChallan'));
const WarehouseManagement = lazy(() => import('./pages/admin/WarehouseManagement'));
const Finance = lazy(() => import('./pages/admin/Finance'));
const Account = lazy(() => import('./pages/admin/Account'));
const ContactInbox = lazy(() => import('./pages/admin/ContactInbox'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const FarmDashboard = lazy(() => import('./pages/admin/Farm/index'));
 
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A dashboard figure that is a minute old is fine; refetching every list
      // on every window focus is not.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // One retry catches a blip. Retrying a 401 or a 403 three times just
      // delays the error the user needs to see.
      retry: (count, error) => {
        const status = error?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return count < 1;
      },
    },
  },
});
 
// Shown while a lazy admin chunk downloads.
function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-forest border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* ================= PUBLIC ROUTES ================= */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/supply" element={<Supply />} />
              <Route path="/impact" element={<Impact />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
            </Route>

            {/* ================= ADMIN LOGIN / SET PASSWORD ================= */}
            <Route path="/admin/login" element={<Login />} />
            <Route path="/set-password" element={<SetPassword />} />

            {/* ================= PROTECTED ADMIN ROUTES =================
                Each screen carries the same role list the server enforces on the
                endpoints it calls — see client/src/lib/accessControl.js. The
                outer route only checks that someone is signed in; the inner
                ones check the role, so an unauthorised deep link redirects
                instead of rendering a page whose every request will 403. */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route element={<ProtectedRoute routeKey="dashboard" />}>
                  <Route index element={<Dashboard />} />
                </Route>
                <Route element={<ProtectedRoute routeKey="products" />}>
                  <Route path="products" element={<ProductManagement />} />
                </Route>
                <Route element={<ProtectedRoute routeKey="orders" />}>
                  <Route path="orders" element={<OrderManagement />} />
                </Route>
                <Route element={<ProtectedRoute routeKey="customers" />}>
                  <Route path="customers" element={<CustomerManagement />} />
                  <Route path="customers/:id" element={<CustomerProfile />} />
                </Route>
                <Route element={<ProtectedRoute routeKey="challans" />}>
                  <Route path="challans" element={<DeliveryChallan />} />
                </Route>
                <Route element={<ProtectedRoute routeKey="warehouses" />}>
                  <Route path="warehouses" element={<WarehouseManagement />} />
                </Route>
                <Route element={<ProtectedRoute routeKey="finance" />}>
                  <Route path="finance" element={<Finance />} />
                </Route>
                <Route element={<ProtectedRoute routeKey="inquiries" />}>
                  <Route path="inquiries" element={<ContactInbox />} />
                </Route>
                <Route element={<ProtectedRoute routeKey="account" />}>
                  <Route path="account" element={<Account />} />
                </Route>
                <Route element={<ProtectedRoute routeKey="users" />}>
                  <Route path="users" element={<UserManagement />} />
                </Route>
                <Route element={<ProtectedRoute routeKey="auditLogs" />}>
                  <Route path="audit-logs" element={<AuditLogs />} />
                </Route>
                <Route element={<ProtectedRoute routeKey="settings" />}>
                  <Route path="settings" element={<Settings />} />
                </Route>
                <Route element={<ProtectedRoute routeKey="farm" />}>
                  <Route path="farm/*" element={<FarmDashboard />} />
                </Route>
              </Route>
            </Route>
          </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}