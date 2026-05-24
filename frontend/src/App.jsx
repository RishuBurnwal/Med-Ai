import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoadingSkeleton from './components/LoadingSkeleton'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import Patients from './pages/Patients'
import PatientDetail from './pages/PatientDetail'
import Appointments from './pages/Appointments'
import Chatbot from './pages/Chatbot'
import ReportAnalyzer from './pages/ReportAnalyzer'
import DrugChecker from './pages/DrugChecker'
import ClinicalSupport from './pages/ClinicalSupport'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

// Hospital Management Pages
import Staff from './pages/Staff'
import Departments from './pages/Departments'
import Wards from './pages/Wards'
import Billing from './pages/Billing'
import LabTests from './pages/LabTests'
import Users from './pages/Users'

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingSkeleton type="full" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function PublicOnly({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingSkeleton type="full" />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="card max-w-md p-8 text-center">
        <h1 className="font-heading text-3xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>The hospital workspace you requested is not available.</p>
        <button className="btn-primary mt-6" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
        <Route path="/reset-password" element={<PublicOnly><ResetPassword /></PublicOnly>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/doctor-dashboard" element={<PrivateRoute><DoctorDashboard /></PrivateRoute>} />
        <Route path="/patients" element={<PrivateRoute><Patients /></PrivateRoute>} />
        <Route path="/patients/:id" element={<PrivateRoute><PatientDetail /></PrivateRoute>} />
        <Route path="/appointments" element={<PrivateRoute><Appointments /></PrivateRoute>} />
        <Route path="/chatbot" element={<PrivateRoute><Chatbot /></PrivateRoute>} />
        <Route path="/report-analyzer" element={<PrivateRoute><ReportAnalyzer /></PrivateRoute>} />
        <Route path="/drug-checker" element={<PrivateRoute><DrugChecker /></PrivateRoute>} />
        <Route path="/clinical-support" element={<PrivateRoute><ClinicalSupport /></PrivateRoute>} />
        <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        {/* Hospital Management Routes */}
        <Route path="/staff" element={<PrivateRoute><Staff /></PrivateRoute>} />
        <Route path="/departments" element={<PrivateRoute><Departments /></PrivateRoute>} />
        <Route path="/wards" element={<PrivateRoute><Wards /></PrivateRoute>} />
        <Route path="/billing" element={<PrivateRoute><Billing /></PrivateRoute>} />
        <Route path="/lab-tests" element={<PrivateRoute><LabTests /></PrivateRoute>} />
        <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="top-right" toastOptions={{
        style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
        success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
        error: { iconTheme: { primary: '#ef4444', secondary: 'white' } }
      }} />
    </AuthProvider>
  )
}
