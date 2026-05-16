import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { authService } from '../../services/authService';
import './Auth.css';

const OAuthSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const finishLogin = async () => {
      const oauthError = searchParams.get('error');
      const token = searchParams.get('token');

      if (oauthError) {
        setError('Google login failed. Please try again.');
        return;
      }

      if (!token) {
        setError('Google login did not return a StockPro token.');
        return;
      }

      try {
        await authService.completeOAuthLogin(token);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        authService.logout();
        setError(err.response?.data?.message || err.response?.data || 'Unable to complete Google login.');
      }
    };

    finishLogin();
  }, [navigate, searchParams]);

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card auth-card">
        <div className="card-body p-4 text-center">
          {error ? (
            <>
              <h4 className="fw-bold mb-2">Google login failed</h4>
              <p className="text-muted">{error}</p>
              <Link to="/login" className="btn btn-primary">Back to Login</Link>
            </>
          ) : (
            <>
              <Loader className="text-primary mb-3" size={32} />
              <h4 className="fw-bold mb-2">Completing Google login</h4>
              <p className="text-muted mb-0">Please wait while StockPro prepares your session.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OAuthSuccessPage;
