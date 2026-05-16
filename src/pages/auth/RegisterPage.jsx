import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, Shield, Building, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services/authService';
import './Auth.css';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };



  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.register(formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: 0, padding: 0, overflowX: 'hidden', width: '100vw' }}>
      <div className="w-100 d-flex justify-content-center align-items-center min-vh-100 py-4">
        <div className="card auth-card">
          <div className="card-header auth-header-bg text-center py-4">
            <h2 className="mb-0 fw-bold">Join StockPro</h2>
            <p className="mb-0 mt-2 opacity-75">Create an account to manage your inventory.</p>
          </div>
          <div className="card-body p-4">
            <form onSubmit={handleRegister}>
              {error && <div className="alert alert-danger py-2 small">{error}</div>}
              <div className="mb-3">
                <label className="form-label text-muted small fw-bold">Full Name</label>
                <div className="input-icon-wrapper">
                  <User className="icon" />
                  <input
                    type="text"
                    className="form-control"
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label text-muted small fw-bold">Email address</label>
                <div className="input-icon-wrapper">
                  <Mail className="icon" />
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label text-muted small fw-bold">Phone Number</label>
                <div className="input-icon-wrapper">
                  <Phone className="icon" />
                  <input
                    type="tel"
                    className="form-control"
                    id="phone"
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={handleChange}
                    pattern="^[6-9]\d{9}$"
                    maxLength="10"
                    title="Please enter a valid 10-digit Indian mobile number starting with 6-9"
                    required
                  />
                </div>
              </div>


              <div className="mb-4">
                <label className="form-label text-muted small fw-bold">Password</label>
                <div className="input-icon-wrapper">
                  <Lock className="icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    id="password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    className="btn border-0 p-0 position-absolute end-0 top-50 translate-middle-y me-2"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ color: '#6c757d', zIndex: 10 }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-100 mb-3" disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm me-2" role="status"></span> : null}
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
              <div className="text-center text-muted small">
                Already have an account? <Link to="/login" className="text-decoration-none fw-bold">Sign in</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;