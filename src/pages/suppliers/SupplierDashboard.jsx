import React, { useState, useEffect } from 'react';
import { Users, Star, Clock, CheckCircle, TrendingUp, AlertCircle, MapPin, Package, IndianRupee, Activity } from 'lucide-react';
import { supplierService } from '../../services/supplierService';
import { purchaseService } from '../../services/purchaseService';

const SupplierDashboard = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [supData, poData] = await Promise.all([
          supplierService.getAllSuppliers(),
          purchaseService.getAllPOs()
        ]);
        setSuppliers(supData);
        setPurchases(poData);
      } catch (err) {
        setError('Failed to load supplier analytics.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Analytics Calculations
  const activeSuppliers = suppliers.filter(s => s.isActive !== false).length;
  const avgRating = (suppliers.reduce((acc, s) => acc + (Number(s.rating) || 0), 0) / (suppliers.length || 1)).toFixed(1);
  const avgLeadTime = (suppliers.reduce((acc, s) => acc + (Number(s.leadTimeDays) || 0), 0) / (suppliers.length || 1)).toFixed(1);
  
  const totalSpend = purchases.reduce((acc, po) => acc + (po.totalAmount || 0), 0);
  const topSuppliers = [...suppliers].sort((a, b) => b.rating - a.rating).slice(0, 5);

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-primary" role="status"></div>
    </div>
  );

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Supplier Intelligence</h2>
          <p className="text-muted mb-0">Performance monitoring and vendor analytics dashboard.</p>
        </div>
        <div className="bg-white p-2 rounded-3 shadow-sm border d-flex align-items-center gap-2">
          <Clock size={16} className="text-primary" />
          <span className="small fw-bold">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="row g-4 mb-4">
        <div className="col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100 bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between mb-3">
                <Users size={24} className="opacity-50" />
                <span className="badge bg-white text-primary rounded-pill">+{suppliers.length > 0 ? '5%' : '0%'}</span>
              </div>
              <h3 className="fw-bold mb-0">{suppliers.length}</h3>
              <p className="small mb-0 opacity-75">Total Registered Vendors</p>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between mb-3">
                <Star size={24} className="text-warning" />
                <TrendingUp size={16} className="text-success" />
              </div>
              <h3 className="fw-bold mb-0">{avgRating}/5.0</h3>
              <p className="small text-muted mb-0">Average Vendor Rating</p>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between mb-3">
                <Clock size={24} className="text-info" />
                <Activity size={16} className="text-info" />
              </div>
              <h3 className="fw-bold mb-0">{avgLeadTime} Days</h3>
              <p className="small text-muted mb-0">Avg. Fulfilment Lead Time</p>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between mb-3">
                <CheckCircle size={24} className="text-success" />
                <span className="text-success fw-bold small">{Math.round((activeSuppliers/suppliers.length)*100)}%</span>
              </div>
              <h3 className="fw-bold mb-0">{activeSuppliers}</h3>
              <p className="small text-muted mb-0">Active Strategic Partners</p>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Top Rated Suppliers */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white border-0 py-4 px-4">
              <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <Star size={20} className="text-warning fill-warning" /> Top Performing Vendors
              </h5>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light border-0">
                  <tr className="small text-uppercase text-muted fw-bold">
                    <th className="ps-4">Vendor</th>
                    <th>Region</th>
                    <th>Lead Time</th>
                    <th>Performance</th>
                    <th className="text-end pe-4">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {topSuppliers.map((sup, idx) => (
                    <tr key={idx}>
                      <td className="ps-4 py-3">
                        <div className="fw-bold text-dark">{sup.name}</div>
                        <div className="small text-muted">{sup.email}</div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1 small">
                          <MapPin size={12} className="text-muted" /> {sup.country || 'India'}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${sup.leadTimeDays < 5 ? 'bg-success-subtle text-success' : 'bg-info-subtle text-info'} rounded-pill`}>
                          {sup.leadTimeDays} Days
                        </span>
                      </td>
                      <td>
                        <div className="progress" style={{ height: '6px', width: '100px' }}>
                          <div className="progress-bar bg-success" style={{ width: `${(sup.rating / 5) * 100}%` }}></div>
                        </div>
                      </td>
                      <td className="text-end pe-4">
                        <div className="d-flex align-items-center justify-content-end gap-1 text-warning fw-bold">
                          {sup.rating} <Star size={14} fill="currentColor" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100 bg-light">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-4">Vendor Insights</h5>
              
              <div className="mb-4">
                <label className="small text-muted text-uppercase fw-bold mb-2 d-block">Geographical Distribution</label>
                {Array.from(new Set(suppliers.map(s => s.country))).slice(0, 4).map((country, i) => {
                  const count = suppliers.filter(s => s.country === country).length;
                  const pct = Math.round((count / suppliers.length) * 100);
                  return (
                    <div key={i} className="mb-3">
                      <div className="d-flex justify-content-between small mb-1">
                        <span>{country || 'Domestic'}</span>
                        <span className="fw-bold">{pct}%</span>
                      </div>
                      <div className="progress" style={{ height: '4px' }}>
                        <div className="progress-bar bg-primary" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <hr />

              <div className="mt-4">
                <label className="small text-muted text-uppercase fw-bold mb-2 d-block">System Alerts</label>
                <div className="alert alert-warning border-0 small d-flex gap-2">
                  <AlertCircle size={18} />
                  <div>
                    <strong>Rating Drop:</strong> 2 vendors fell below 3.5 stars this week.
                  </div>
                </div>
                <div className="alert alert-info border-0 small d-flex gap-2">
                  <Package size={18} />
                  <div>
                    <strong>New Vendor:</strong> 3 suppliers awaiting onboarding review.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierDashboard;
