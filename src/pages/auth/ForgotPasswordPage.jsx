import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { authService } from '../../services/authService';
import './Auth.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await authService.requestPasswordReset(email);
      setMessage(response.message || 'If the email exists, a password reset link has been sent.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card auth-card">
        <div className="card-header auth-header-bg text-center py-4">
          <h2 className="mb-0 fw-bold">Forgot Password</h2>
          <p className="mb-0 mt-2 opacity-75">Enter your email to receive a reset link.</p>
        </div>
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            {message && <div className="alert alert-success py-2 small">{message}</div>}
            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            <div className="mb-4">
              <label className="form-label auth-label small fw-bold">Email address</label>
              <div className="input-icon-wrapper">
                <Mail className="icon" />
                <input
                  type="email"
                  className="form-control form-control-lg"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-100 mb-3" disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm me-2" role="status"></span> : null}
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="text-center text-muted small">
              Remember your password? <Link to="/login" className="text-decoration-none fw-bold">Back to login</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
