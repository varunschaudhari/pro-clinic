import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { SuperAdminLayout } from '@/layouts/SuperAdminLayout';
import { PageLoader } from '@/components/ui/Spinner';
import { ProtectedRoute } from './ProtectedRoute';

// ── Auth pages (public) ─────────────────────────────────────
const LoginPage          = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage       = lazy(() => import('@/pages/auth/RegisterPage'));
const AcceptInvitePage   = lazy(() => import('@/pages/auth/AcceptInvitePage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('@/pages/auth/ResetPasswordPage'));

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
const EditAppointmentPage   = lazy(() => import('@/pages/appointments/AppointmentEditPage'));
const PrescriptionsPage     = lazy(() => import('@/pages/prescriptions/PrescriptionsPage'));
const NewPrescriptionPage   = lazy(() => import('@/pages/prescriptions/NewPrescriptionPage'));
const EditPrescriptionPage  = lazy(() => import('@/pages/prescriptions/EditPrescriptionPage'));
const PrescriptionDetailPage = lazy(() => import('@/pages/prescriptions/PrescriptionDetailPage'));
const BillingPage            = lazy(() => import('@/pages/billing/BillingPage'));
const NewInvoicePage         = lazy(() => import('@/pages/billing/NewInvoicePage'));
const InvoiceDetailPage      = lazy(() => import('@/pages/billing/InvoiceDetailPage'));
const EditInvoicePage        = lazy(() => import('@/pages/billing/EditInvoicePage'));
const CreditNotePage         = lazy(() => import('@/pages/billing/CreditNotePage'));
const LabPage                = lazy(() => import('@/pages/lab/LabPage'));
const NewLabReportPage       = lazy(() => import('@/pages/lab/NewLabReportPage'));
const EditLabReportPage      = lazy(() => import('@/pages/lab/EditLabReportPage'));
const LabReportDetailPage    = lazy(() => import('@/pages/lab/LabReportDetailPage'));
const PharmacyPage           = lazy(() => import('@/pages/pharmacy/PharmacyPage'));
const NewDrugPage            = lazy(() => import('@/pages/pharmacy/NewDrugPage'));
const EditDrugPage           = lazy(() => import('@/pages/pharmacy/EditDrugPage'));
const DrugDetailPage         = lazy(() => import('@/pages/pharmacy/DrugDetailPage'));
const PharmacyLedgerPage     = lazy(() => import('@/pages/pharmacy/PharmacyLedgerPage'));
const SettingsPage              = lazy(() => import('@/pages/settings/SettingsPage'));
const ReportsPage               = lazy(() => import('@/pages/reports/ReportsPage'));
const ScheduleManagementPage    = lazy(() => import('@/pages/schedule/ScheduleManagementPage'));
const TemplatesPage             = lazy(() => import('@/pages/prescriptions/TemplatesPage'));
const UnauthorizedPage          = lazy(() => import('@/pages/UnauthorizedPage'));
const PortalPage                = lazy(() => import('@/pages/portal/PortalPage'));
const AuditLogPage              = lazy(() => import('@/pages/audit/AuditLogPage'));

// ── SuperAdmin pages ──────────────────────────────────────────────────────
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminClinicsPage   = lazy(() => import('@/pages/admin/ClinicsPage'));
const AdminNewClinicPage = lazy(() => import('@/pages/admin/NewClinicPage'));
const AdminClinicDetailPage = lazy(() => import('@/pages/admin/ClinicDetailPage'));

// ── Public booking page ───────────────────────────────────────────────────
const BookingPage         = lazy(() => import('@/pages/booking/BookingPage'));
const ConsultationPage    = lazy(() => import('@/pages/appointments/ConsultationPage'));
const PharmacyBillingPage = lazy(() => import('@/pages/pharmacy/PharmacyBillingPage'));


const wrap = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
);

const router = createBrowserRouter([
  // ── Auth shell (redirects away if already logged in) ──
  {
    element: <AuthLayout />,
    children: [
      { path: '/login',             element: wrap(<LoginPage />) },
      { path: '/register',          element: wrap(<RegisterPage />) },
      { path: '/invite/accept',     element: wrap(<AcceptInvitePage />) },
      { path: '/forgot-password',   element: wrap(<ForgotPasswordPage />) },
      { path: '/reset-password',    element: wrap(<ResetPasswordPage />) },
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
          { path: '/appointments',                    element: wrap(<AppointmentsPage />) },
          { path: '/appointments/new',               element: wrap(<NewAppointmentPage />) },
          { path: '/appointments/:id/edit',          element: wrap(<EditAppointmentPage />) },
          { path: '/consult/:appointmentId',         element: wrap(<ConsultationPage />) },
          { path: '/prescriptions',              element: wrap(<PrescriptionsPage />) },
          { path: '/prescriptions/new',          element: wrap(<NewPrescriptionPage />) },
          { path: '/prescriptions/templates',    element: wrap(<TemplatesPage />) },
          { path: '/prescriptions/:id',          element: wrap(<PrescriptionDetailPage />) },
          { path: '/prescriptions/:id/edit',     element: wrap(<EditPrescriptionPage />) },
          { path: '/lab',             element: wrap(<LabPage />) },
          { path: '/lab/new',         element: wrap(<NewLabReportPage />) },
          { path: '/lab/:id',         element: wrap(<LabReportDetailPage />) },
          { path: '/lab/:id/edit',    element: wrap(<EditLabReportPage />) },
          { path: '/billing',           element: wrap(<BillingPage />) },
          { path: '/billing/new',       element: wrap(<NewInvoicePage />) },
          { path: '/billing/:id',       element: wrap(<InvoiceDetailPage />) },
          { path: '/billing/:id/edit',              element: wrap(<EditInvoicePage />) },
          { path: '/billing/credit-notes/:cnId',   element: wrap(<CreditNotePage />) },
          { path: '/pharmacy',                 element: wrap(<PharmacyPage />) },
          { path: '/pharmacy/bill',            element: wrap(<PharmacyBillingPage />) },
          { path: '/pharmacy/new',             element: wrap(<NewDrugPage />) },
          { path: '/pharmacy/transactions',    element: wrap(<PharmacyLedgerPage />) },
          { path: '/pharmacy/:id',             element: wrap(<DrugDetailPage />) },
          { path: '/pharmacy/:id/edit',        element: wrap(<EditDrugPage />) },
          { path: '/settings',   element: wrap(<SettingsPage />) },
          { path: '/reports',    element: wrap(<ReportsPage />) },
        ],
      },
      // ClinicAdmin only
      {
        element: <ProtectedRoute allowedRoles={['ClinicAdmin']} />,
        children: [
          { path: '/staff',      element: wrap(<StaffPage />) },
          { path: '/schedule',   element: wrap(<ScheduleManagementPage />) },
          { path: '/audit-logs', element: wrap(<AuditLogPage />) },
        ],
      },
    ],
  },

  // ── Public portal (no auth, no app shell) ────────────────
  { path: '/portal/:token', element: wrap(<PortalPage />) },

  // ── Public booking page (no auth, no app shell) ───────────
  { path: '/book/:clinicSlug', element: wrap(<BookingPage />) },

  // ── SuperAdmin panel (separate layout) ───────────────────
  {
    element: <SuperAdminLayout />,
    children: [
      { path: '/admin',              element: wrap(<AdminDashboardPage />) },
      { path: '/admin/clinics',      element: wrap(<AdminClinicsPage />) },
      { path: '/admin/clinics/new',  element: wrap(<AdminNewClinicPage />) },
      { path: '/admin/clinics/:id',  element: wrap(<AdminClinicDetailPage />) },
    ],
  },

  // ── Misc ──────────────────────────────────────────────────
  { path: '/unauthorized', element: wrap(<UnauthorizedPage />) },
  { path: '*',             element: wrap(<UnauthorizedPage />) },
], { future: { v7_startTransition: true } });

export const AppRouter = () => <RouterProvider router={router} />;
