import { LockKeyhole } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';

const AccessDeniedPage = () => {
  const location = useLocation();
  const user = authService.getCurrentUser();

  if (!location.state?.deniedFrom) {
    return <Navigate to={user ? '/dashboard' : '/login'} replace />;
  }

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light px-3">
      <div className="text-center bg-white border shadow-sm rounded-3 p-5" style={{ maxWidth: '460px' }}>
        <div className="bg-danger-subtle text-danger rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 64, height: 64 }}>
          <LockKeyhole size={30} />
        </div>
        <h1 className="h4 fw-bold mb-2">Access denied</h1>
        <p className="text-muted mb-4">
          Your role does not have permission to open this area. Contact an admin if you need access.
        </p>
        <Link to="/dashboard" className="btn btn-primary">Back to dashboard</Link>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
