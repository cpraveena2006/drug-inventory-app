import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { Toaster } from "react-hot-toast";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Drugs = lazy(() => import("./pages/Drugs"));
const Batches = lazy(() => import("./pages/Batches"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Orders = lazy(() => import("./pages/Orders"));
const DrugDetail = lazy(() => import("./pages/DrugDetail"));
const BatchDetail = lazy(() => import("./pages/BatchDetail"));
const SupplierDetail = lazy(() => import("./pages/SupplierDetail"));
const Incidents = lazy(() => import("./pages/Incidents"));
const Requests = lazy(() => import("./pages/Requests"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Portal = lazy(() => import("./pages/Portal"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Suspense fallback={<div className="page-loading" role="status">Loading page...</div>}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/drugs" element={<Drugs />} />
              <Route path="/drugs/:id" element={<ProtectedRoute allowedRoles={["admin", "pharmacist"]}><DrugDetail /></ProtectedRoute>} />
              <Route path="/batches" element={<Batches />} />
              <Route path="/batches/:id" element={<BatchDetail />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/suppliers/:id" element={<SupplierDetail />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/incidents" element={<ProtectedRoute allowedRoles={["admin", "pharmacist"]}><Incidents /></ProtectedRoute>} />
              <Route path="/requests" element={<ProtectedRoute allowedRoles={["admin", "pharmacist"]}><Requests /></ProtectedRoute>} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/portal" element={<ProtectedRoute allowedRoles={["supplier"]}><Portal /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/audit" element={<ProtectedRoute allowedRoles={["admin"]}><AuditLogs /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<div className="not-found"><span>404</span><h1>Page not found</h1><p>The page you’re looking for doesn’t exist or may have moved.</p></div>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
