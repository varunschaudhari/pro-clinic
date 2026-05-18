import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-destructive">403</h1>
        <p className="text-xl font-semibold">Access Denied</p>
        <p className="text-muted-foreground">You do not have permission to access this page.</p>
        <Link to="/" className="text-primary hover:underline">Go to Dashboard</Link>
      </div>
    </div>
  );
}
