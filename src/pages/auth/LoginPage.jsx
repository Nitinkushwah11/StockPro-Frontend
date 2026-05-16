import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { authService } from '../../services/authService';
import './Auth.css';

const GoogleIcon = () => (
  <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
    />
  </svg>
);

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.login(email, password);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    authService.startGoogleLogin();
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card auth-card">
        <div className="card-header auth-header-bg text-center py-4">
          <h2 className="mb-0 fw-bold">StockPro</h2>
          <p className="mb-0 mt-2 opacity-75">Welcome back! Please login.</p>
        </div>
        <div className="card-body p-4">
          <form onSubmit={handleLogin}>
            {error && <div className="alert alert-danger py-2 small">{error}</div>}
            <div className="mb-4">
              <label className="form-label auth-label small fw-bold">Email address</label>
              <div className="input-icon-wrapper">
                <Mail className="icon" />
                <input 
                  type="email" 
                  className="form-control form-control-lg" 
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center">
                <label className="form-label auth-label small fw-bold">Password</label>
                <Link to="/forgot-password" className="auth-small-link">Forgot password?</Link>
              </div>
              <div className="input-icon-wrapper">
                <Lock className="icon" />
                <input 
                  type="password" 
                  className="form-control form-control-lg" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-100 mb-3" disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm me-2" role="status"></span> : null}
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="d-flex align-items-center gap-3 my-3">
              <hr className="flex-grow-1" />
              <span className="text-muted small">or</span>
              <hr className="flex-grow-1" />
            </div>

            <button type="button" className="btn google-login-btn w-100 mb-3" onClick={handleGoogleLogin}>
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="text-center text-muted small">
              Don't have an account? <Link to="/register" className="text-decoration-none fw-bold">Sign up</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
