import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { Spinner } from '@/components/ui/Spinner';

interface AuthLayoutProps {
  /** Redirect here once authenticated. Defaults to '/' */
  redirectTo?: string;
}

export const AuthLayout = ({ redirectTo = '/' }: AuthLayoutProps) => {
  const { isAuthenticated, isLoading } = useAppSelector((s) => s.auth);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Spinner size="lg" />
      </div>
    );
  }

  // Already logged in → redirect away from auth pages
  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
      {/* Top bar */}
      <header className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-bold text-xl text-foreground">ClinixIndia</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium ml-1">
            Beta
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Outlet />
      </main>

      <footer className="text-center py-4 text-xs text-muted-foreground">
        © {new Date().getFullYear()} ClinixIndia · Made with ❤️ for Indian clinics
      </footer>
    </div>
  );
};
