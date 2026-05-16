import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { authService } from '../../services/authService';
import './Auth.css';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!token) {
      setError('Reset token is missing. Please request a new reset link.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password must match.');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.resetPassword(token, newPassword);
      setMessage(response.message || 'Password reset successfully. Please login with your new password.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset password. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card auth-card">
        <div className="card-header auth-header-bg text-center py-4">
          <h2 className="mb-0 fw-bold">Reset Password</h2>
          <p className="mb-0 mt-2 opacity-75">Create a new password for your account.</p>
        </div>
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            {message && <div className="alert alert-success py-2 small">{message}</div>}
            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            <div className="mb-4">
              <label className="form-label auth-label small fw-bold">New password</label>
              <div className="input-icon-wrapper">
                <Lock className="icon" />
                <input
                  type="password"
                  className="form-control form-control-lg"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength="6"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label auth-label small fw-bold">Confirm password</label>
              <div className="input-icon-wrapper">
                <Lock className="icon" />
                <input
                  type="password"
                  className="form-control form-control-lg"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength="6"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-100 mb-3" disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm me-2" role="status"></span> : null}
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <div className="text-center text-muted small">
              <Link to="/login" className="text-decoration-none fw-bold">Back to login</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
