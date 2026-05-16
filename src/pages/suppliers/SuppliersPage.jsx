import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Star, Edit, Mail, Loader, X, Trash2, Phone, MapPin, Globe, CreditCard, Clock, AlertCircle } from 'lucide-react';
import { supplierService } from '../../services/supplierService';
import { authService } from '../../services/authService';
import { canCallEndpoint } from '../../utils/permissions';

const SuppliersPage = () => {
  const userRole = authService.getCurrentUser()?.role;
  const canWriteSuppliers = canCallEndpoint(userRole, 'POST', '/suppliers');
  const canDeleteSuppliers = canCallEndpoint(userRole, 'DELETE', '/suppliers/1');
  const canViewReports = canCallEndpoint(userRole, 'GET', '/reports');
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const emptyForm = {
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    taxId: '',
    paymentTerms: '',
    leadTimeDays: '',
    rating: '5.0',
    isActive: true
  };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await supplierService.getAllSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openAddModal = () => {
    setFormData(emptyForm);
    setModalMode('add');
    setShowModal(true);
  };

  const openEditModal = (sup) => {
    setFormData({ ...sup });
    setSelectedSupplier(sup);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      alert('Name and Email are required.');
      return;
    }
    setSaving(true);
    try {
      if (modalMode === 'add') {
        await supplierService.createSupplier(formData);
        setSuccessMsg('Supplier added successfully!');
      } else {
        await supplierService.updateSupplier(selectedSupplier.supplierId, formData);
        setSuccessMsg('Supplier updated successfully!');
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err) {
      alert('Failed to save supplier.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await supplierService.deleteSupplier(deleteTarget.supplierId);
      setSuccessMsg(`Supplier ${deleteTarget.name} deleted.`);
      setShowDeleteModal(false);
      fetchSuppliers();
    } catch (err) {
      alert('Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container-fluid py-2">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Suppliers</h2>
          <p className="text-muted mb-0">Manage vendor relationships and performance metrics.</p>
        </div>
        {canWriteSuppliers && (
          <button className="btn btn-primary d-flex align-items-center gap-2 shadow-sm" onClick={openAddModal}>
            <Plus size={18} /> Add Supplier
          </button>
        )}
      </div>

      {successMsg && (
        <div className="alert alert-success border-0 shadow-sm mb-4 d-flex align-items-center gap-2">
          <Star size={18} /> {successMsg}
        </div>
      )}

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      <div className="card border-0 shadow-sm overflow-hidden">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">Supplier Info</th>
                  <th>Contact Person</th>
                  <th>Contact Details</th>
                  <th>Terms & Lead Time</th>
                  <th>Rating</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-5"><Loader className="animate-spin mx-auto text-primary" /></td></tr>
                ) : suppliers.map(sup => (
                  <tr key={sup.supplierId}>
                    <td className="ps-4">
                      <div className="fw-bold text-primary">{sup.name}</div>
                      <div className="text-muted small d-flex align-items-center gap-1">
                        <MapPin size={12} /> {sup.city}, {sup.country}
                      </div>
                    </td>
                    <td>{sup.contactPerson}</td>
                    <td>
                      <div className="small d-flex align-items-center gap-2">
                        <Mail size={14} className="text-muted" /> {sup.email}
                      </div>
                      <div className="small d-flex align-items-center gap-2 mt-1">
                        <Phone size={14} className="text-muted" /> {sup.phone || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div className="small d-flex align-items-center gap-2">
                        <CreditCard size={14} className="text-muted" /> {sup.paymentTerms || 'Net 30'}
                      </div>
                      <div className="small d-flex align-items-center gap-2 mt-1 text-primary">
                        <Clock size={14} /> {sup.leadTimeDays} days lead
                      </div>
                    </td>
                    <td>
                      <div 
                        className="d-flex align-items-center gap-1 text-warning cursor-pointer" 
                        title={canViewReports ? 'Click to view performance reports' : 'Reports require manager access'}
                        onClick={() => canViewReports && navigate('/reports')}
                        style={{ cursor: canViewReports ? 'pointer' : 'default' }}
                      >
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} size={14} fill={i <= Math.round(sup.rating || 0) ? "currentColor" : "none"} />
                        ))}
                        <span className="text-dark fw-bold ms-1">{(Number(sup.rating) || 0).toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex justify-content-end gap-2">
                        {canWriteSuppliers && <button className="btn btn-sm btn-light" onClick={() => openEditModal(sup)}><Edit size={16} className="text-secondary" /></button>}
                        {canDeleteSuppliers && <button className="btn btn-sm btn-light" onClick={() => { setDeleteTarget(sup); setShowDeleteModal(true); }}><Trash2 size={16} className="text-danger" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ===== ADD/EDIT MODAL ===== */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 p-4">
                <h5 className="modal-title fw-bold">{modalMode === 'add' ? '🏢 Register New Supplier' : '✏️ Edit Supplier'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body p-4 pt-0">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Company Name *</label>
                    <input type="text" className="form-control" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Acme Corp" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Contact Person</label>
                    <input type="text" className="form-control" name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Email Address *</label>
                    <input type="email" className="form-control" name="email" value={formData.email} onChange={handleInputChange} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Phone Number</label>
                    <input type="text" className="form-control" name="phone" value={formData.phone} onChange={handleInputChange} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-bold">Street Address</label>
                    <input type="text" className="form-control" name="address" value={formData.address} onChange={handleInputChange} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">City</label>
                    <input type="text" className="form-control" name="city" value={formData.city} onChange={handleInputChange} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Country</label>
                    <input type="text" className="form-control" name="country" value={formData.country} onChange={handleInputChange} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-bold">Tax ID</label>
                    <input type="text" className="form-control" name="taxId" value={formData.taxId} onChange={handleInputChange} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-bold">Payment Terms</label>
                    <select className="form-select" name="paymentTerms" value={formData.paymentTerms} onChange={handleInputChange}>
                      <option value="">Select...</option>
                      <option value="Net 15">Net 15</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 60">Net 60</option>
                      <option value="COD">Cash on Delivery</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-bold">Lead Time (Days)</label>
                    <input type="number" className="form-control" name="leadTimeDays" value={formData.leadTimeDays} onChange={handleInputChange} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold d-flex justify-content-between">
                      Rating: {(Number(formData.rating) || 0).toFixed(1)}
                    </label>
                    <input type="range" className="form-range" name="rating" min="0" max="5" step="0.1" value={formData.rating} onChange={handleInputChange} />
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 p-4">
                <button className="btn btn-light px-4" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary px-5 d-flex align-items-center gap-2" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader size={16} className="animate-spin" /> : 'Save Supplier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE MODAL ===== */}
      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-body text-center py-4">
                <AlertCircle size={48} className="text-danger mb-3" />
                <h5 className="fw-bold">Delete Supplier?</h5>
                <p className="text-muted small">Are you sure you want to remove <strong>{deleteTarget?.name}</strong>?</p>
                <div className="d-flex gap-2 mt-4">
                  <button className="btn btn-light flex-grow-1" onClick={() => setShowDeleteModal(false)}>No, Keep</button>
                  <button className="btn btn-danger flex-grow-1" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
