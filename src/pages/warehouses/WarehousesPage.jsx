import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, X, Loader, Search, Package, ArrowRightLeft, Phone, User, MapPin, Building2, TrendingUp, BarChart3, AlertTriangle } from 'lucide-react';
import { warehouseService } from '../../services/warehouseService';
import { productService } from '../../services/productService';
import { authService } from '../../services/authService';
import { canCallEndpoint } from '../../utils/permissions';

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  const listKeys = ['content', 'data', 'items', 'results', 'records', 'warehouses', 'stockLevels', 'products'];
  for (const key of listKeys) {
    if (Array.isArray(value[key])) return value[key];
  }

  if (value.data && typeof value.data === 'object') return normalizeList(value.data);
  return [];
};

const isActiveRecord = (record) => record?.isActive ?? record?.active ?? true;

const WarehousesPage = () => {
  const userRole = authService.getCurrentUser()?.role;
  const canWriteWarehouses = canCallEndpoint(userRole, 'POST', '/warehouse');
  const canMoveStock = canCallEndpoint(userRole, 'POST', '/warehouse/stock/transfer');
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseStockUsage, setWarehouseStockUsage] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [saving, setSaving] = useState(false);

  // Stock modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockItems, setStockItems] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockWarehouse, setStockWarehouse] = useState(null);

  // Transfer modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transfering, setTransfering] = useState(false);
  const [transferData, setTransferData] = useState({ fromWarehouseId: '', toWarehouseId: '', productId: '', quantity: 1 });
  const [transferStockItems, setTransferStockItems] = useState([]);
  const [transferStockLoading, setTransferStockLoading] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [allProducts, setAllProducts] = useState([]); 

  // Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form
  const emptyForm = { name: '', location: '', address: '', managerId: '', capacity: '', phone: '' };
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  // Fetch warehouses
  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const data = await warehouseService.getAllWarehouses({ suppressForbiddenRedirect: true });
      const warehouseList = normalizeList(data);
      setWarehouses(warehouseList);
      await fetchWarehouseStockUsage(warehouseList);
      setError(null);
    } catch (err) {
      console.error('Error:', err);
      const status = err.response?.status;
      const serverMessage = err.response?.data?.message || err.response?.data?.error;
      setWarehouses([]);
      setError(
        serverMessage ||
        (status ? `Failed to load warehouses. Server returned ${status}.` : 'Failed to load warehouses. Make sure warehouse-service and api-gateway are running.')
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouseStockUsage = async (warehouseList) => {
    const usageEntries = await Promise.all(
      warehouseList.map(async (warehouse) => {
        try {
          const stockItems = normalizeList(await warehouseService.getStockByWarehouse(warehouse.warehouseId, { suppressForbiddenRedirect: true }));
          const totalQuantity = stockItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
          return [warehouse.warehouseId, totalQuantity];
        } catch (err) {
          console.warn(`Could not load stock usage for warehouse ${warehouse.warehouseId}`, err);
          return [warehouse.warehouseId, Number(warehouse.usedCapacity || 0)];
        }
      })
    );
    setWarehouseStockUsage(Object.fromEntries(usageEntries));
  };

  const fetchProducts = async () => {
    try {
      const data = await productService.getAllProducts({ suppressForbiddenRedirect: true });
      setAllProducts(normalizeList(data));
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  useEffect(() => { 
    fetchWarehouses(); 
    fetchProducts();
  }, []);

  useEffect(() => {
    if (successMsg) { const t = setTimeout(() => setSuccessMsg(null), 4000); return () => clearTimeout(t); }
  }, [successMsg]);

  // Validation
  const validateForm = () => {
    const errors = {};
    const capacity = Number(formData.capacity);
    const currentStoredQuantity = modalMode === 'edit' && selectedWarehouse
      ? getStoredQuantity(selectedWarehouse)
      : 0;
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.location.trim()) errors.location = 'Location is required';
    if (!formData.capacity || capacity < 1) {
      errors.capacity = 'Capacity must be > 0';
    } else if (modalMode === 'edit' && capacity < currentStoredQuantity) {
      errors.capacity = `Capacity cannot be less than current stock (${currentStoredQuantity} items).`;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
  };

  const openAddModal = () => { setFormData(emptyForm); setFormErrors({}); setModalMode('add'); setShowModal(true); };
  const openEditModal = (wh) => {
    setFormData({ name: wh.name||'', location: wh.location||'', address: wh.address||'', managerId: wh.managerId||'', capacity: wh.capacity||'', phone: wh.phone||'' });
    setFormErrors({}); setSelectedWarehouse(wh); setModalMode('edit'); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setSelectedWarehouse(null); setFormData(emptyForm); };

  const openStockView = async (wh) => {
    setStockWarehouse(wh);
    setShowStockModal(true);
    setStockLoading(true);
    try {
      const data = await warehouseService.getStockByWarehouse(wh.warehouseId, { suppressForbiddenRedirect: true });
      setStockItems(normalizeList(data));
    } catch (err) {
      console.error('Stock fetch error:', err);
      setStockItems([]);
    } finally {
      setStockLoading(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (modalMode === 'add') {
        await warehouseService.createWarehouse(formData);
        setSuccessMsg('Warehouse registered successfully!');
      } else {
        await warehouseService.updateWarehouse(selectedWarehouse.warehouseId, formData);
        setSuccessMsg('Warehouse updated successfully!');
      }
      closeModal();
      await fetchWarehouses();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.response?.data?.error || 'Failed to save.';
      setFormErrors({ _server: msg });
    } finally { setSaving(false); }
  };

  const openTransferModal = (fromWhId = '') => {
    setTransferData({ fromWarehouseId: fromWhId, toWarehouseId: '', productId: '', quantity: 1 });
    setTransferStockItems([]);
    setTransferError('');
    setShowTransferModal(true);
    if (fromWhId) fetchTransferStock(fromWhId);
  };

  const fetchTransferStock = async (warehouseId) => {
    if (!warehouseId) {
      setTransferStockItems([]);
      return;
    }
    setTransferStockLoading(true);
    setTransferError('');
    try {
      const data = await warehouseService.getStockByWarehouse(warehouseId, { suppressForbiddenRedirect: true });
      setTransferStockItems(normalizeList(data).filter(item => Number(item.availableQuantity ?? item.quantity ?? 0) > 0));
    } catch (err) {
      console.error('Transfer stock fetch error:', err);
      setTransferStockItems([]);
      setTransferError('Could not load stock for the selected source warehouse.');
    } finally {
      setTransferStockLoading(false);
    }
  };

  const handleTransferSourceChange = (warehouseId) => {
    setTransferData(prev => ({ ...prev, fromWarehouseId: warehouseId, toWarehouseId: '', productId: '', quantity: 1 }));
    fetchTransferStock(warehouseId);
  };

  const getSelectedTransferStock = () => {
    return transferStockItems.find(item => Number(item.productId) === Number(transferData.productId));
  };

  const getTransferAvailableQty = () => {
    const item = getSelectedTransferStock();
    return Number(item?.availableQuantity ?? item?.quantity ?? 0);
  };

  const handleTransfer = async () => {
    if (!transferData.fromWarehouseId || !transferData.toWarehouseId || !transferData.productId || transferData.quantity < 1) {
      alert('Please fill all transfer fields');
      return;
    }
    if (transferData.fromWarehouseId === transferData.toWarehouseId) {
      alert('Source and Destination warehouses must be different.');
      return;
    }
    const availableQty = getTransferAvailableQty();
    if (availableQty < 1) {
      alert('This product is not available in the selected source warehouse.');
      return;
    }
    if (Number(transferData.quantity) > availableQty) {
      alert(`Only ${availableQty} units are available in the selected source warehouse.`);
      return;
    }
    setTransfering(true);
    try {
      await warehouseService.transferStock({
        ...transferData,
        fromWarehouseId: Number(transferData.fromWarehouseId),
        toWarehouseId: Number(transferData.toWarehouseId),
        productId: Number(transferData.productId),
        quantity: Number(transferData.quantity)
      });
      setSuccessMsg('Stock transferred successfully!');
      setShowTransferModal(false);
      await fetchWarehouses();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      alert(`Transfer failed: ${errorMsg}`);
    } finally { setTransfering(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await warehouseService.deleteWarehouse(deleteTarget.warehouseId);
      setSuccessMsg(`Warehouse deleted.`);
      setShowDeleteModal(false); setDeleteTarget(null);
      await fetchWarehouses();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      setError(`Delete failed: ${errorMsg}`);
      setShowDeleteModal(false);
    } finally { setDeleting(false); }
  };

  const getUtilization = (wh) => {
    if (!wh.capacity) return 0;
    return Math.round((getStoredQuantity(wh) / wh.capacity) * 100);
  };

  const getStoredQuantity = (wh) => Number(warehouseStockUsage[wh.warehouseId] ?? wh.usedCapacity ?? 0);

  const getUtilColor = (pct) => {
    if (pct >= 90) return 'text-danger';
    if (pct >= 70) return 'text-warning';
    return 'text-primary';
  };

  const getUtilBg = (pct) => {
    if (pct >= 90) return 'bg-danger';
    if (pct >= 70) return 'bg-warning';
    return 'bg-primary';
  };

  const getProduct = (id) => allProducts.find(p => Number(p.productId) === Number(id));
  const getProductName = (id) => getProduct(id)?.name || `Product #${id}`;
  const getProductSku = (id) => getProduct(id)?.sku || `PRD-${String(id).padStart(6, '0')}`;
  const selectedTransferStock = getSelectedTransferStock();
  const transferAvailableQty = getTransferAvailableQty();

  return (
    <div className="p-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Premium Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-5 gap-3">
        <div>
          <h1 className="fw-bold display-6 mb-1" style={{ color: '#1e293b' }}>Warehouses</h1>
          <div className="d-flex align-items-center gap-2 text-muted">
            <Building2 size={18} />
            <span>Manage inventory distribution across {warehouses.length} locations</span>
          </div>
        </div>
        <div className="d-flex gap-3">
          {canMoveStock && (
            <button className="btn btn-white shadow-sm border d-flex align-items-center gap-2 px-4 py-2" 
              style={{ borderRadius: '12px', fontWeight: '600' }}
              onClick={() => openTransferModal()}>
              <ArrowRightLeft size={18} className="text-primary" /> Transfer Stock
            </button>
          )}
          {canWriteWarehouses && (
            <button className="btn btn-primary shadow-sm d-flex align-items-center gap-2 px-4 py-2" 
              style={{ borderRadius: '12px', fontWeight: '600', backgroundColor: '#4f46e5', border: 'none' }}
              onClick={openAddModal}>
              <Plus size={18} /> Register Warehouse
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats Banner */}
      {!loading && warehouses.length > 0 && (
        <div className="row g-4 mb-5">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm p-3" style={{ borderRadius: '16px' }}>
              <div className="d-flex align-items-center gap-3">
                <div className="p-3 rounded-4 bg-primary-subtle text-primary">
                  <BarChart3 size={24} />
                </div>
                <div>
                  <div className="small text-muted fw-bold text-uppercase">Total Capacity</div>
                  <div className="h4 mb-0 fw-bold">{warehouses.reduce((acc, w) => acc + (w.capacity || 0), 0).toLocaleString()} units</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm p-3" style={{ borderRadius: '16px' }}>
              <div className="d-flex align-items-center gap-3">
                <div className="p-3 rounded-4 bg-success-subtle text-success">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div className="small text-muted fw-bold text-uppercase">Overall Utilization</div>
                  <div className="h4 mb-0 fw-bold">
                    {Math.round((warehouses.reduce((acc, w) => acc + getStoredQuantity(w), 0) / 
                     warehouses.reduce((acc, w) => acc + (w.capacity || 1), 0)) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm p-3" style={{ borderRadius: '16px' }}>
              <div className="d-flex align-items-center gap-3">
                <div className="p-3 rounded-4 bg-warning-subtle text-warning">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <div className="small text-muted fw-bold text-uppercase">High Capacity</div>
                  <div className="h4 mb-0 fw-bold">{warehouses.filter(w => getUtilization(w) > 80).length} Locations</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Alerts */}
      {successMsg && (
        <div className="alert alert-success border-0 shadow-sm mb-4 fade show d-flex align-items-center gap-2 py-3 px-4" 
          style={{ borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
          <div className="p-2 bg-success text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
            <Package size={16} />
          </div>
          <span className="fw-bold">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger border-0 shadow-sm mb-4 d-flex align-items-center justify-content-between gap-3 py-3 px-4"
          style={{ borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
          <span className="fw-semibold">{error}</span>
          <button className="btn btn-sm btn-light flex-shrink-0" onClick={fetchWarehouses}>Retry</button>
        </div>
      )}

      {/* Content Section */}
      {loading ? (
        <div className="d-flex flex-column align-items-center justify-content-center py-5">
          <div className="spinner-grow text-primary mb-3" role="status"></div>
          <p className="text-muted fw-medium">Loading warehouse network...</p>
        </div>
      ) : warehouses.length === 0 ? (
        <div className="text-center py-5 bg-white rounded-4 border-dashed border-2 shadow-sm">
          <Building2 size={64} className="mb-3 text-muted opacity-25" />
          <h3 className="fw-bold">No Warehouses Registered</h3>
          <p className="text-muted">Start by adding your first distribution center to manage stock.</p>
          {canWriteWarehouses && <button className="btn btn-primary mt-2 px-4" onClick={openAddModal}>Register Warehouse</button>}
        </div>
      ) : (
        <div className="row g-4">
          {warehouses.map(wh => {
            const util = getUtilization(wh);
            const utilColor = getUtilColor(util);
            const utilBg = getUtilBg(util);
            return (
              <div className="col-md-6 col-lg-4" key={wh.warehouseId}>
                <div className="card border-0 shadow-sm h-100 transition-hover" 
                  style={{ borderRadius: '20px', overflow: 'hidden', transition: 'all 0.3s ease' }}>
                  
                  {/* Card Body */}
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h4 className="fw-bold mb-1" style={{ color: '#1e293b' }}>{wh.name}</h4>
                        <div className="d-flex align-items-center gap-1 text-muted small">
                          <MapPin size={14} /> {wh.location}
                        </div>
                      </div>
                      <span className={`badge ${isActiveRecord(wh) ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'} rounded-pill px-3 py-2`}>
                        {isActiveRecord(wh) ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <p className="text-secondary small mb-4" style={{ minHeight: '40px' }}>{wh.address}</p>

                    {/* Utilization Progress */}
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small fw-bold text-muted text-uppercase">Capacity Usage</span>
                        <span className={`fw-bold ${utilColor}`}>{util}%</span>
                      </div>
                      <div className="progress rounded-pill shadow-inner" style={{ height: '10px', backgroundColor: '#f1f5f9' }}>
                        <div className={`progress-bar rounded-pill ${utilBg}`} 
                          style={{ width: `${util}%`, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                      </div>
                      <div className="d-flex justify-content-between mt-2 small">
                        <span className="text-muted">{getStoredQuantity(wh).toLocaleString()} items stored</span>
                        <span className="fw-medium">Max: {(wh.capacity || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="row g-2 mb-4 bg-light p-3 rounded-4">
                      <div className="col-6">
                        <div className="d-flex align-items-center gap-2 small text-muted">
                          <Phone size={14} /> <span>{wh.phone || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="col-6 text-end">
                        <div className="d-flex align-items-center justify-content-end gap-2 small text-muted">
                          <User size={14} /> <span>Manager: {wh.managerId}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="d-flex gap-2">
                      <button className="btn btn-indigo flex-grow-1 d-flex align-items-center justify-content-center gap-2 py-2"
                        style={{ borderRadius: '12px', backgroundColor: '#eff6ff', color: '#2563eb', border: 'none', fontWeight: '600' }}
                        onClick={() => openStockView(wh)}>
                        <Package size={16} /> View Stock
                      </button>
                      {canWriteWarehouses && (
                        <>
                          <button className="btn btn-light shadow-sm border-0 p-2" 
                            style={{ borderRadius: '12px', width: '42px', height: '42px' }}
                            title="Edit" onClick={() => openEditModal(wh)}>
                            <Edit size={18} className="text-secondary" />
                          </button>
                          <button className="btn btn-light shadow-sm border-0 p-2" 
                            style={{ borderRadius: '12px', width: '42px', height: '42px' }}
                            title="Delete" onClick={() => { setDeleteTarget(wh); setShowDeleteModal(true); }}>
                            <Trash2 size={18} className="text-danger" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== STOCK VIEW MODAL (Redesigned) ===== */}
      {showStockModal && stockWarehouse && (
        <div className="modal fade show d-block" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(15, 23, 42, 0.4)' }} onClick={() => setShowStockModal(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '24px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header border-0 p-4 pb-0">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-3 rounded-4 bg-primary text-white">
                    <Package size={24} />
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold h4 mb-0">Stock Levels</h5>
                    <p className="text-muted small mb-0">{stockWarehouse.name} — {stockWarehouse.location}</p>
                  </div>
                </div>
                <button className="btn btn-light rounded-circle shadow-sm" onClick={() => setShowStockModal(false)}><X size={20} /></button>
              </div>
              <div className="modal-body p-4 pt-4">
                {stockLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="text-muted mt-3 fw-medium">Analyzing inventory records...</p>
                  </div>
                ) : stockItems.length === 0 ? (
                  <div className="text-center py-5 bg-light rounded-4 border-dashed">
                    <Package size={48} className="mb-3 text-muted opacity-25" />
                    <h5 className="fw-bold">No Stock Found</h5>
                    <p className="text-muted small mb-0">This warehouse currently has no inventory recorded.</p>
                  </div>
                ) : (
                  <div className="table-responsive rounded-4 border">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="bg-light">
                        <tr className="small text-uppercase fw-bold text-muted">
                          <th className="ps-4 py-3">Product Information</th>
                          <th className="text-end">Quantity</th>
                          <th className="text-end">Status</th>
                          <th className="text-end pe-4">Last Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockItems.map((item, i) => (
                          <tr key={i}>
                            <td className="ps-4">
                              <div className="fw-bold">{getProductName(item.productId)}</div>
                              <div className="text-primary small font-monospace">{getProductSku(item.productId)}</div>
                            </td>
                            <td className="text-end fw-bold">{item.quantity.toLocaleString()}</td>
                            <td className="text-end">
                              <div className="d-flex flex-column align-items-end">
                                <span className={`badge ${item.availableQuantity > 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} rounded-pill mb-1`}>
                                  {item.availableQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                                </span>
                                {item.reservedQuantity > 0 && <span className="small text-warning" style={{ fontSize: '10px' }}>{item.reservedQuantity} Reserved</span>}
                              </div>
                            </td>
                            <td className="pe-4 text-end text-muted small">
                              {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer border-0 p-4 pt-0">
                <div className="me-auto text-muted small">Showing {stockItems.length} categories</div>
                <button className="btn btn-light px-4 py-2 fw-bold" style={{ borderRadius: '12px' }} onClick={() => setShowStockModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD/EDIT MODAL (Redesigned) ===== */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(15, 23, 42, 0.4)' }} onClick={closeModal}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '24px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header border-0 p-4">
                <h5 className="modal-title fw-bold h4">
                  {modalMode === 'add' ? '🏭 New Location' : '✏️ Edit Location'}
                </h5>
                <button className="btn btn-light rounded-circle shadow-sm" onClick={closeModal}><X size={20} /></button>
              </div>
              <div className="modal-body p-4 pt-0">
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted text-uppercase">Warehouse Name</label>
                  <input type="text" className="form-control form-control-lg border-light bg-light" name="name" 
                    value={formData.name} onChange={handleInputChange} style={{ borderRadius: '12px' }} placeholder="e.g. Northern Hub" />
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted text-uppercase">City</label>
                    <input type="text" className="form-control border-light bg-light" name="location" 
                      value={formData.location} onChange={handleInputChange} style={{ borderRadius: '12px' }} placeholder="e.g. Mumbai" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted text-uppercase">Capacity</label>
                    <input type="number" className="form-control border-light bg-light" name="capacity" 
                      value={formData.capacity} onChange={handleInputChange} style={{ borderRadius: '12px' }} placeholder="10000" />
                    {modalMode === 'edit' && selectedWarehouse && (
                      <div className="form-text">
                        Current stock: {getStoredQuantity(selectedWarehouse).toLocaleString()} items
                      </div>
                    )}
                    {formErrors.capacity && <div className="text-danger small mt-1">{formErrors.capacity}</div>}
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted text-uppercase">Address</label>
                  <textarea className="form-control border-light bg-light" name="address" rows="2"
                    value={formData.address} onChange={handleInputChange} style={{ borderRadius: '12px' }} placeholder="Street details..."></textarea>
                </div>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted text-uppercase">Manager ID</label>
                    <input type="text" className="form-control border-light bg-light" name="managerId" 
                      value={formData.managerId} onChange={handleInputChange} style={{ borderRadius: '12px' }} placeholder="101" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted text-uppercase">Phone</label>
                    <input type="text" className="form-control border-light bg-light" name="phone" 
                      value={formData.phone} onChange={handleInputChange} style={{ borderRadius: '12px' }} placeholder="+91..." />
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 p-4">
                <button className="btn btn-light px-4 py-2 fw-bold" style={{ borderRadius: '12px' }} onClick={closeModal}>Cancel</button>
                <button className="btn btn-primary px-4 py-2 fw-bold shadow-sm" 
                  style={{ borderRadius: '12px', backgroundColor: '#4f46e5' }}
                  onClick={handleSave} disabled={saving}>
                  {saving ? 'Processing...' : modalMode === 'add' ? 'Register' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== TRANSFER MODAL (Redesigned) ===== */}
      {showTransferModal && (
        <div className="modal fade show d-block" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(15, 23, 42, 0.4)' }} onClick={() => setShowTransferModal(false)}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '24px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header border-0 p-4">
                <h5 className="modal-title fw-bold h4">🔄 Transfer Stock</h5>
                <button className="btn btn-light rounded-circle shadow-sm" onClick={() => setShowTransferModal(false)}><X size={20} /></button>
              </div>
              <div className="modal-body p-4 pt-0">
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted text-uppercase">Source Warehouse</label>
                  <select className="form-select form-select-lg border-light bg-light" 
                    value={transferData.fromWarehouseId}
                    onChange={e => handleTransferSourceChange(e.target.value)}
                    style={{ borderRadius: '12px' }}>
                    <option value="">Select source...</option>
                    {warehouses.map(wh => <option key={wh.warehouseId} value={wh.warehouseId}>{wh.name}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-muted text-uppercase">Destination Warehouse</label>
                  <select className="form-select form-select-lg border-light bg-light" 
                    value={transferData.toWarehouseId}
                    onChange={e => setTransferData({ ...transferData, toWarehouseId: e.target.value })}
                    style={{ borderRadius: '12px' }}>
                    <option value="">Select destination...</option>
                    {warehouses.map(wh => (
                      wh.warehouseId != transferData.fromWarehouseId && <option key={wh.warehouseId} value={wh.warehouseId}>{wh.name}</option>
                    ))}
                  </select>
                </div>
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label small fw-bold text-muted text-uppercase">Product</label>
                    <select className="form-select border-light bg-light" 
                      value={transferData.productId}
                      onChange={e => setTransferData({ ...transferData, productId: e.target.value, quantity: 1 })}
                      disabled={!transferData.fromWarehouseId || transferStockLoading || transferStockItems.length === 0}
                      style={{ borderRadius: '12px' }}>
                      <option value="">{transferData.fromWarehouseId ? 'Choose stocked product...' : 'Select source first...'}</option>
                      {transferStockItems.map(item => (
                        <option key={item.productId} value={item.productId}>
                          {getProductName(item.productId)} - {getProductSku(item.productId)} (Available: {Number(item.availableQuantity ?? item.quantity ?? 0)})
                        </option>
                      ))}
                    </select>
                    {transferStockLoading && <div className="form-text">Loading source warehouse stock...</div>}
                    {transferError && <div className="text-danger small mt-1">{transferError}</div>}
                    {transferData.fromWarehouseId && !transferStockLoading && transferStockItems.length === 0 && !transferError && (
                      <div className="text-muted small mt-1">No transferable stock found in this warehouse.</div>
                    )}
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-bold text-muted text-uppercase">Quantity</label>
                    <input type="number" className="form-control border-light bg-light" min="1"
                      max={transferAvailableQty || 1}
                      value={transferData.quantity} 
                      onChange={e => {
                        const rawValue = e.target.value;
                        const numericValue = Number(rawValue);
                        const nextValue = rawValue === '' ? '' : Math.min(Math.max(numericValue || 1, 1), transferAvailableQty || 1);
                        setTransferData({ ...transferData, quantity: nextValue });
                      }}
                      disabled={!transferData.productId}
                      style={{ borderRadius: '12px' }} />
                    {transferData.productId && (
                      <div className="form-text">Available: {transferAvailableQty} units</div>
                    )}
                  </div>
                </div>
                {selectedTransferStock && (
                  <div className="mt-3 p-3 bg-light rounded-4 border">
                    <div className="d-flex justify-content-between gap-3 flex-wrap">
                      <div>
                        <div className="small text-muted fw-bold text-uppercase">Selected Product</div>
                        <div className="fw-bold">{getProductName(selectedTransferStock.productId)}</div>
                        <div className="text-primary small font-monospace">{getProductSku(selectedTransferStock.productId)}</div>
                      </div>
                      <div>
                        <div className="small text-muted fw-bold text-uppercase">Total Stock</div>
                        <div className="fw-bold">{Number(selectedTransferStock.quantity || 0)}</div>
                      </div>
                      <div>
                        <div className="small text-muted fw-bold text-uppercase">Available to Transfer</div>
                        <div className="fw-bold text-success">{transferAvailableQty}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer border-0 p-4">
                <button className="btn btn-light px-4 py-2 fw-bold" style={{ borderRadius: '12px' }} onClick={() => setShowTransferModal(false)}>Cancel</button>
                <button className="btn btn-primary px-4 py-2 fw-bold shadow-sm" 
                  style={{ borderRadius: '12px', backgroundColor: '#4f46e5' }}
                  onClick={handleTransfer} disabled={transfering || transferStockLoading || transferStockItems.length === 0}>
                  {transfering ? 'Transferring...' : 'Execute Transfer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ===== DELETE MODAL (Redesigned) ===== */}
      {showDeleteModal && deleteTarget && (
        <div className="modal fade show d-block" style={{ backdropFilter: 'blur(5px)', backgroundColor: 'rgba(15, 23, 42, 0.4)' }} onClick={() => setShowDeleteModal(false)}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-body text-center p-4">
                <div className="p-3 bg-danger-subtle text-danger rounded-circle d-inline-flex mb-3">
                  <Trash2 size={32} />
                </div>
                <h5 className="fw-bold mb-2">Delete Warehouse?</h5>
                <p className="text-muted small">This action will remove <strong>{deleteTarget.name}</strong> from the active network.</p>
                <div className="d-flex gap-2 mt-4">
                  <button className="btn btn-light flex-grow-1" style={{ borderRadius: '10px' }} onClick={() => setShowDeleteModal(false)}>Cancel</button>
                  <button className="btn btn-danger flex-grow-1" style={{ borderRadius: '10px' }} onClick={handleDelete} disabled={deleting}>
                    {deleting ? '...' : 'Delete'}
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

export default WarehousesPage;
