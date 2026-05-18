import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageLoader } from '@/components/ui/Spinner';
import { ProtectedRoute } from './ProtectedRoute';

// ── Auth pages (public) ─────────────────────────────────────
const LoginPage        = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage     = lazy(() => import('@/pages/auth/RegisterPage'));
const AcceptInvitePage = lazy(() => import('@/pages/auth/AcceptInvitePage'));

// ── App pages (protected) ───────────────────────────────────
const DashboardPage      = lazy(() => import('@/pages/dashboard/DashboardPage'));
const ProfilePage        = lazy(() => import('@/pages/profile/ProfilePage'));
const StaffPage          = lazy(() => import('@/pages/staff/StaffPage'));
const PatientsPage          = lazy(() => import('@/pages/patients/PatientsPage'));
const NewPatientPage        = lazy(() => import('@/pages/patients/NewPatientPage'));
const EditPatientPage       = lazy(() => import('@/pages/patients/EditPatientPage'));
const PatientDetailPage     = lazy(() => import('@/pages/patients/PatientDetailPage'));
const AppointmentsPage      = lazy(() => import('@/pages/appointments/AppointmentsPage'));
const NewAppointmentPage    = lazy(() => import('@/pages/appointments/NewAppointmentPage'));
const PrescriptionsPage     = lazy(() => import('@/pages/prescriptions/PrescriptionsPage'));
const NewPrescriptionPage   = lazy(() => import('@/pages/prescriptions/NewPrescriptionPage'));
const EditPrescriptionPage  = lazy(() => import('@/pages/prescriptions/EditPrescriptionPage'));
const PrescriptionDetailPage = lazy(() => import('@/pages/prescriptions/PrescriptionDetailPage'));
const BillingPage            = lazy(() => import('@/pages/billing/BillingPage'));
const NewInvoicePage         = lazy(() => import('@/pages/billing/NewInvoicePage'));
const InvoiceDetailPage      = lazy(() => import('@/pages/billing/InvoiceDetailPage'));
const LabPage                = lazy(() => import('@/pages/lab/LabPage'));
const NewLabReportPage       = lazy(() => import('@/pages/lab/NewLabReportPage'));
const EditLabReportPage      = lazy(() => import('@/pages/lab/EditLabReportPage'));
const LabReportDetailPage    = lazy(() => import('@/pages/lab/LabReportDetailPage'));
const PharmacyPage           = lazy(() => import('@/pages/pharmacy/PharmacyPage'));
const NewDrugPage            = lazy(() => import('@/pages/pharmacy/NewDrugPage'));
const EditDrugPage           = lazy(() => import('@/pages/pharmacy/EditDrugPage'));
const DrugDetailPage         = lazy(() => import('@/pages/pharmacy/DrugDetailPage'));
const SettingsPage              = lazy(() => import('@/pages/settings/SettingsPage'));
const ReportsPage               = lazy(() => import('@/pages/reports/ReportsPage'));
const ScheduleManagementPage    = lazy(() => import('@/pages/schedule/ScheduleManagementPage'));
const TemplatesPage             = lazy(() => import('@/pages/prescriptions/TemplatesPage'));
const UnauthorizedPage          = lazy(() => import('@/pages/UnauthorizedPage'));
const PortalPage                = lazy(() => import('@/pages/portal/PortalPage'));


const wrap = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
);

const router = createBrowserRouter([
  // ── Auth shell (redirects away if already logged in) ──
  {
    element: <AuthLayout />,
    children: [
      { path: '/login',          element: wrap(<LoginPage />) },
      { path: '/register',       element: wrap(<RegisterPage />) },
      { path: '/invite/accept',  element: wrap(<AcceptInvitePage />) },
    ],
  },

  // ── App shell (redirects to /login if not authenticated) ──
  {
    element: <AppLayout />,
    children: [
      // All authenticated roles
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/',                            element: wrap(<DashboardPage />) },
          { path: '/profile',                     element: wrap(<ProfilePage />) },
          { path: '/patients',                    element: wrap(<PatientsPage />) },
          { path: '/patients/new',                element: wrap(<NewPatientPage />) },
          { path: '/patients/:patientId',         element: wrap(<PatientDetailPage />) },
          { path: '/patients/:patientId/edit',    element: wrap(<EditPatientPage />) },
          { path: '/appointments',     element: wrap(<AppointmentsPage />) },
          { path: '/appointments/new', element: wrap(<NewAppointmentPage />) },
          { path: '/prescriptions',              element: wrap(<PrescriptionsPage />) },
          { path: '/prescriptions/new',          element: wrap(<NewPrescriptionPage />) },
          { path: '/prescriptions/templates',    element: wrap(<TemplatesPage />) },
          { path: '/prescriptions/:id',          element: wrap(<PrescriptionDetailPage />) },
          { path: '/prescriptions/:id/edit',     element: wrap(<EditPrescriptionPage />) },
          { path: '/lab',             element: wrap(<LabPage />) },
          { path: '/lab/new',         element: wrap(<NewLabReportPage />) },
          { path: '/lab/:id',         element: wrap(<LabReportDetailPage />) },
          { path: '/lab/:id/edit',    element: wrap(<EditLabReportPage />) },
          { path: '/billing',         element: wrap(<BillingPage />) },
          { path: '/billing/new',     element: wrap(<NewInvoicePage />) },
          { path: '/billing/:id',     element: wrap(<InvoiceDetailPage />) },
          { path: '/pharmacy',            element: wrap(<PharmacyPage />) },
          { path: '/pharmacy/new',        element: wrap(<NewDrugPage />) },
          { path: '/pharmacy/:id',        element: wrap(<DrugDetailPage />) },
          { path: '/pharmacy/:id/edit',   element: wrap(<EditDrugPage />) },
          { path: '/settings',   element: wrap(<SettingsPage />) },
          { path: '/reports',    element: wrap(<ReportsPage />) },
        ],
      },
      // ClinicAdmin only
      {
        element: <ProtectedRoute allowedRoles={['ClinicAdmin']} />,
        children: [
          { path: '/staff',    element: wrap(<StaffPage />) },
          { path: '/schedule', element: wrap(<ScheduleManagementPage />) },
        ],
      },
    ],
  },

  // ── Public portal (no auth, no app shell) ────────────────
  { path: '/portal/:token', element: wrap(<PortalPage />) },

  // ── Misc ──────────────────────────────────────────────────
  { path: '/unauthorized', element: wrap(<UnauthorizedPage />) },
  { path: '*',             element: wrap(<UnauthorizedPage />) },
], { future: { v7_startTransition: true } });

export const AppRouter = () => <RouterProvider router={router} />;
