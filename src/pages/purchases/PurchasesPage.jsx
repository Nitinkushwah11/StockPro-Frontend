import React, { useRef, useState, useEffect } from 'react';
import { Plus, Eye, CheckCircle, Package, Loader, X, Trash2, Calendar, FileText, AlertCircle, ShoppingCart } from 'lucide-react';
import { purchaseService } from '../../services/purchaseService';
import { supplierService } from '../../services/supplierService';
import { warehouseService } from '../../services/warehouseService';
import { productService } from '../../services/productService';
import { authService } from '../../services/authService';
import { canCallEndpoint } from '../../utils/permissions';

const getDefaultExpectedDate = () => {
  const expectedDate = new Date();
  expectedDate.setDate(expectedDate.getDate() + 7);
  return expectedDate.toISOString().split('T')[0];
};

const PurchasesPage = () => {
  const userRole = authService.getCurrentUser()?.role;
  const canCreatePurchase = canCallEndpoint(userRole, 'POST', '/purchase-orders');
  const canApprovePurchase = canCallEndpoint(userRole, 'PUT', '/purchase-orders/1/approve');
  const canReceivePurchase = canCallEndpoint(userRole, 'POST', '/purchase-orders/1/receive');
  const expectedDateInputRef = useRef(null);
  // Data state
  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states - Create PO
  const [poForm, setPoForm] = useState({
    supplierId: '',
    warehouseId: '',
    referenceNumber: '',
    expectedDate: '',
    notes: '',
    lineItems: []
  });

  // Form states - Partial Receipt
  const [receiptItems, setReceiptItems] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);

    // Fetch data independently so one failure doesn't block others
    const fetchPOs = async () => {
      try {
        const data = await purchaseService.getAllPOs();
        setPos(data);
      } catch (err) {
        console.error('PO Fetch Error:', err);
        setError('Failed to load purchase orders list.');
      }
    };

    const fetchSuppliers = async () => {
      try {
        const data = await supplierService.getAllSuppliers({ suppressForbiddenRedirect: true });
        setSuppliers(data);
      } catch (err) { console.error('Supplier Fetch Error:', err); }
    };

    const fetchWarehouses = async () => {
      try {
        const data = await warehouseService.getAllWarehouses();
        setWarehouses(data);
      } catch (err) { console.error('Warehouse Fetch Error:', err); }
    };

    const fetchProducts = async () => {
      try {
        const data = await productService.getAllProducts();
        setProducts(data);
      } catch (err) { console.error('Product Fetch Error:', err); }
    };

    await Promise.allSettled([
      fetchPOs(),
      fetchSuppliers(),
      fetchWarehouses(),
      fetchProducts()
    ]);

    setLoading(false);
  };

  // ===================== CREATE PO LOGIC =====================
  const openCreateModal = () => {
    setPoForm({
      supplierId: '',
      warehouseId: '',
      referenceNumber: getNextPOReference(),
      expectedDate: getDefaultExpectedDate(),
      notes: '',
      lineItems: []
    });
    setShowCreateModal(true);
  };

  const addLineItem = () => {
    setPoForm(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { productId: '', quantity: 1, unitCost: '' }]
    }));
  };

  const removeLineItem = (index) => {
    setPoForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  const updateLineItem = (index, field, value) => {
    const newList = [...poForm.lineItems];
    newList[index] = { ...newList[index], [field]: value };

    // Auto-fill cost if product is selected
    if (field === 'productId' && value) {
      const prod = products.find(p => p.productId == value);
      if (prod) newList[index].unitCost = prod.costPrice;
    }

    setPoForm(prev => ({ ...prev, lineItems: newList }));
  };

  const handleCreatePO = async () => {
    if (!poForm.supplierId || !poForm.warehouseId || poForm.lineItems.length === 0) {
      alert('Please fill all required fields and add at least one item.');
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        ...poForm,
        supplierId: parseInt(poForm.supplierId),
        warehouseId: parseInt(poForm.warehouseId),
        createdById: 1, // Hardcoded for now
        lineItems: poForm.lineItems.map(item => ({
          productId: parseInt(item.productId),
          quantity: parseInt(item.quantity),
          unitCost: parseFloat(item.unitCost)
        }))
      };
      await purchaseService.createPO(payload);
      setSuccessMsg('Purchase Order created successfully!');
      setShowCreateModal(false);
      fetchInitialData();
    } catch (err) {
      alert('Failed to create PO: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // ===================== DETAILS & ACTIONS =====================
  const openDetailsModal = async (po) => {
    try {
      setActionLoading(true);
      const fullPO = await purchaseService.getPOById(po.poId);
      setSelectedPO(fullPO);
      setShowDetailsModal(true);
    } catch (err) {
      alert('Failed to load PO details');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this purchase order?')) return;
    setActionLoading(true);
    try {
      await purchaseService.approvePO(id);
      setSuccessMsg('PO Approved!');
      setShowDetailsModal(false);
      fetchInitialData();
    } catch (err) {
      alert('Approval failed: ' + err.message);
    } finally { setActionLoading(false); }
  };

  const handleFullReceive = async (id) => {
    if (!window.confirm('Mark ALL items as received? This will update warehouse stock.')) return;
    setActionLoading(true);
    try {
      await purchaseService.receiveGoods(id);
      setSuccessMsg('Goods received and stock updated!');
      setShowDetailsModal(false);
      fetchInitialData();
    } catch (err) {
      alert('Receipt failed: ' + err.message);
    } finally { setActionLoading(false); }
  };

  // ===================== PARTIAL RECEIPT LOGIC =====================
  const openPartialModal = (po) => {
    setSelectedPO(po);
    setReceiptItems(po.lineItems.map(item => ({
      lineItemId: item.lineItemId,
      productId: item.productId,
      productName: item.productName || getProductLabel(item.productId),
      ordered: item.quantity,
      receivedToDate: item.receivedQty || 0,
      currentReceipt: item.quantity - (item.receivedQty || 0) // Default to remaining
    })));
    setShowPartialModal(true);
  };

  const handlePartialReceive = async () => {
    setActionLoading(true);
    try {
      const payload = receiptItems
        .filter(item => item.currentReceipt > 0)
        .map(item => ({
          lineItemId: item.lineItemId,
          receivedQty: parseInt(item.currentReceipt)
        }));

      if (payload.length === 0) {
        alert('Please enter at least one quantity to receive');
        return;
      }

      await purchaseService.receiveGoodsPartially(selectedPO.poId, payload);
      setSuccessMsg('Partial receipt processed!');
      setShowPartialModal(false);
      setShowDetailsModal(false);
      fetchInitialData();
    } catch (err) {
      alert('Partial receipt failed: ' + err.message);
    } finally { setActionLoading(false); }
  };

  // ===================== UI HELPERS =====================
  const getStatusBadge = (status) => {
    const badges = {
      'PENDING_APPROVAL': 'bg-warning-subtle text-warning-emphasis',
      'APPROVED': 'bg-primary-subtle text-primary-emphasis',
      'PARTIALLY_RECEIVED': 'bg-info-subtle text-info-emphasis',
      'RECEIVED': 'bg-success-subtle text-success-emphasis',
      'CANCELLED': 'bg-danger-subtle text-danger-emphasis'
    };
    return badges[status] || 'bg-secondary-subtle';
  };

  const getStatusText = (status) => {
    const texts = {
      'PENDING_APPROVAL': 'Pending',
      'APPROVED': 'Approved',
      'PARTIALLY_RECEIVED': 'Partial Receipt',
      'RECEIVED': 'Received',
      'CANCELLED': 'Cancelled'
    };
    return texts[status] || status;
  };

  const getSupplierName = (id) => suppliers.find(s => s.supplierId === id)?.name || `Supplier ${id}`;
  const getWarehouseName = (id) => warehouses.find(w => w.warehouseId === id)?.name || `Warehouse ${id}`;
  const getProduct = (id) => products.find(p => Number(p.productId) === Number(id));
  const getProductLabel = (id) => {
    const product = getProduct(id);
    return product ? `${product.name} (${product.sku})` : `Product PRD-${String(id).padStart(6, '0')}`;
  };
  const getPOReference = (po) => po?.referenceNumber || `PO-${String(po?.poId || '').padStart(6, '0')}`;
  const getNextPOReference = () => {
    const maxPoId = pos.reduce((max, po) => Math.max(max, Number(po.poId) || 0), 0);
    return `PO-${String(maxPoId + 1).padStart(6, '0')}`;
  };
  const formatPurchaseDate = (po) => {
    const rawDate = po.orderDate || po.createdAt || po.expectedDate;
    if (!rawDate) return 'Not set';
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1970) return 'Not set';
    return date.toLocaleDateString('en-IN');
  };

  return (
    <div className="container-fluid py-2">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Purchase Orders</h2>
          <p className="text-muted mb-0">Manage procurement, vendor approvals, and stock intake.</p>
        </div>
        {canCreatePurchase && (
          <button className="btn btn-primary d-flex align-items-center gap-2 shadow-sm" onClick={openCreateModal}>
            <Plus size={18} /> Create Purchase Order
          </button>
        )}
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="alert alert-success border-0 shadow-sm mb-4 d-flex align-items-center gap-2">
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}
      {error && <div className="alert alert-danger border-0 shadow-sm mb-4">{error}</div>}

      {/* PO Table */}
      <div className="card border-0 shadow-sm overflow-hidden">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">PO Reference</th>
                  <th>Supplier</th>
                  <th>Warehouse</th>
                  <th>Order Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-5"><Loader className="animate-spin mx-auto text-primary" /></td></tr>
                ) : pos.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-5 text-muted">No purchase orders found.</td></tr>
                ) : pos.map(po => (
                  <tr key={po.poId}>
                    <td className="ps-4">
                      <div className="fw-bold text-primary font-monospace">{getPOReference(po)}</div>
                      <div className="text-muted small">Created by User #{po.createdById}</div>
                    </td>
                    <td className="fw-medium">{getSupplierName(po.supplierId)}</td>
                    <td className="text-muted">{getWarehouseName(po.warehouseId)}</td>
                    <td>{formatPurchaseDate(po)}</td>
                    <td className="fw-bold font-monospace">₹{po.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>
                      <span className={`badge rounded-pill ${getStatusBadge(po.status)}`}>
                        {getStatusText(po.status)}
                      </span>
                    </td>
                    <td className="text-end pe-4">
                      <button className="btn btn-sm btn-light shadow-sm" onClick={() => openDetailsModal(po)}>
                        <Eye size={16} className="text-secondary" /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ===================== MODAL: CREATE PO ===================== */}
      {showCreateModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 bg-primary text-white p-4">
                <h5 className="modal-title fw-bold"><ShoppingCart className="me-2" /> New Purchase Order</h5>
                <button className="btn-close btn-close-white" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label small fw-bold text-secondary text-uppercase">Supplier</label>
                    <select className="form-select" value={poForm.supplierId} onChange={e => setPoForm({ ...poForm, supplierId: e.target.value })}>
                      <option value="">Select Supplier...</option>
                      {suppliers.map(s => <option key={s.supplierId} value={s.supplierId}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-bold text-secondary text-uppercase">Target Warehouse</label>
                    <select className="form-select" value={poForm.warehouseId} onChange={e => setPoForm({ ...poForm, warehouseId: e.target.value })}>
                      <option value="">Select Warehouse...</option>
                      {warehouses.map(w => <option key={w.warehouseId} value={w.warehouseId}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-bold text-secondary text-uppercase">Expected Date</label>
                    <div className="input-group">
                      <input
                        ref={expectedDateInputRef}
                        type="date"
                        className="form-control"
                        value={poForm.expectedDate}
                        onChange={e => setPoForm({ ...poForm, expectedDate: e.target.value })}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        title="Choose expected date"
                        onClick={() => {
                          const input = expectedDateInputRef.current;
                          if (input?.showPicker) {
                            input.showPicker();
                          } else {
                            input?.focus();
                          }
                        }}
                      >
                        <Calendar size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold mb-0">Order Items</h6>
                  <button className="btn btn-sm btn-outline-primary" onClick={addLineItem}>+ Add Product</button>
                </div>

                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead className="bg-light">
                      <tr>
                        <th>Product</th>
                        <th style={{ width: '120px' }}>Quantity</th>
                        <th style={{ width: '150px' }}>Unit Cost (₹)</th>
                        <th style={{ width: '150px' }}>Total</th>
                        <th style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {poForm.lineItems.length === 0 ? (
                        <tr><td colSpan="5" className="text-center py-4 text-muted">No items added yet. Click "+ Add Product"</td></tr>
                      ) : poForm.lineItems.map((item, i) => (
                        <tr key={i}>
                          <td>
                            <select className="form-select form-select-sm" value={item.productId} onChange={e => updateLineItem(i, 'productId', e.target.value)}>
                              <option value="">Select Product...</option>
                              {products.map(p => <option key={p.productId} value={p.productId}>{p.name} ({p.sku})</option>)}
                            </select>
                          </td>
                          <td>
                            <input type="number" className="form-control form-control-sm text-center" min="1" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', e.target.value)} />
                          </td>
                          <td>
                            <input type="number" className="form-control form-control-sm text-end" step="0.01" value={item.unitCost} onChange={e => updateLineItem(i, 'unitCost', e.target.value)} />
                          </td>
                          <td className="text-end fw-bold font-monospace">₹{(item.quantity * item.unitCost).toFixed(2)}</td>
                          <td>
                            <button className="btn btn-sm text-danger" onClick={() => removeLineItem(i)}><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {poForm.lineItems.length > 0 && (
                      <tfoot>
                        <tr>
                          <td colSpan="3" className="text-end fw-bold">Order Total:</td>
                          <td className="text-end fw-bold text-primary font-monospace h5">
                            ₹{poForm.lineItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitCost), 0).toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                <div className="mt-3">
                  <label className="form-label small fw-bold text-secondary text-uppercase">Notes / Instructions</label>
                  <textarea className="form-control" rows="2" value={poForm.notes} onChange={e => setPoForm({ ...poForm, notes: e.target.value })} placeholder="Any special instructions for the supplier..."></textarea>
                </div>
              </div>
              <div className="modal-footer border-0 p-4">
                <button className="btn btn-light px-4" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button className="btn btn-primary px-5 d-flex align-items-center gap-2" onClick={handleCreatePO} disabled={actionLoading}>
                  {actionLoading ? <Loader size={16} className="animate-spin" /> : 'Confirm Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: PO DETAILS & ACTIONS ===================== */}
      {showDetailsModal && selectedPO && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 p-4">
                <div>
                  <h5 className="modal-title fw-bold mb-1">Purchase Order: {getPOReference(selectedPO)}</h5>
                  <span className={`badge rounded-pill ${getStatusBadge(selectedPO.status)}`}>{getStatusText(selectedPO.status)}</span>
                </div>
                <button className="btn-close" onClick={() => setShowDetailsModal(false)}></button>
              </div>
              <div className="modal-body p-4 pt-0">
                <div className="row mb-4 g-3">
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3">
                      <div className="small text-muted text-uppercase fw-bold mb-1">Supplier Details</div>
                      <div className="fw-bold h6 mb-0">{getSupplierName(selectedPO.supplierId)}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3">
                      <div className="small text-muted text-uppercase fw-bold mb-1">Target Warehouse</div>
                      <div className="fw-bold h6 mb-0">{getWarehouseName(selectedPO.warehouseId)}</div>
                    </div>
                  </div>
                </div>

                <h6 className="fw-bold mb-3">Line Items</h6>
                <div className="table-responsive mb-4">
                  <table className="table table-sm align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Product</th>
                        <th className="text-center">Ordered</th>
                        <th className="text-center text-success">Received</th>
                        <th className="text-end">Unit Cost</th>
                        <th className="text-end">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPO.lineItems?.map((item, i) => (
                        <tr key={i}>
                          <td>
                            <div className="fw-semibold">{item.productName || getProduct(item.productId)?.name || `Product #${item.productId}`}</div>
                            <div className="text-primary small font-monospace">{getProduct(item.productId)?.sku || `PRD-${String(item.productId).padStart(6, '0')}`}</div>
                          </td>
                          <td className="text-center fw-bold">{item.quantity}</td>
                          <td className="text-center text-success fw-bold">{item.receivedQty || 0}</td>
                          <td className="text-end">₹{item.unitCost?.toFixed(2)}</td>
                          <td className="text-end fw-bold">₹{(item.quantity * item.unitCost).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="4" className="text-end fw-bold">Total Amount:</td>
                        <td className="text-end fw-bold h5 text-primary">₹{selectedPO.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {selectedPO.notes && (
                  <div className="mb-4">
                    <h6 className="fw-bold small text-muted text-uppercase">Notes</h6>
                    <p className="bg-light p-2 rounded small">{selectedPO.notes}</p>
                  </div>
                )}

                {/* Workflow Buttons */}
                <div className="d-flex flex-wrap gap-2 border-top pt-4 mt-2">
                  {selectedPO.status === 'PENDING_APPROVAL' && canApprovePurchase && (
                    <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => handleApprove(selectedPO.poId)} disabled={actionLoading}>
                      <CheckCircle size={18} /> Approve PO
                    </button>
                  )}

                  {(selectedPO.status === 'APPROVED' || selectedPO.status === 'PARTIALLY_RECEIVED') && canReceivePurchase && (
                    <>
                      <button className="btn btn-success d-flex align-items-center gap-2" onClick={() => handleFullReceive(selectedPO.poId)} disabled={actionLoading}>
                        <Package size={18} /> Full Receipt
                      </button>
                      <button className="btn btn-outline-success d-flex align-items-center gap-2" onClick={() => openPartialModal(selectedPO)} disabled={actionLoading}>
                        <ArrowRightLeft size={18} /> Partial Receipt
                      </button>
                    </>
                  )}

                  {selectedPO.status === 'PENDING_APPROVAL' && canApprovePurchase && (
                    <button className="btn btn-outline-danger ms-auto" onClick={async () => {
                      if (window.confirm('Cancel this PO?')) {
                        await purchaseService.cancelPO(selectedPO.poId);
                        setShowDetailsModal(false);
                        fetchInitialData();
                      }
                    }}>Cancel Order</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: PARTIAL RECEIPT ===================== */}
      {showPartialModal && selectedPO && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header border-0 bg-success text-white p-4">
                <h5 className="modal-title fw-bold"><Package className="me-2" /> Partial Goods Receipt</h5>
                <button className="btn-close btn-close-white" onClick={() => setShowPartialModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-muted small mb-4">
                  Enter the quantities actually received for each item below. Remaining items will stay in 'Partially Received' status.
                </p>

                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th className="text-center">Ordered</th>
                        <th className="text-center">Already Recv'd</th>
                        <th className="text-center" style={{ width: '180px' }}>Now Receiving</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptItems.map((item, i) => (
                        <tr key={i}>
                          <td>
                            <div className="fw-bold">{item.productName}</div>
                            <div className="text-primary small font-monospace">{getProduct(item.productId)?.sku || `PRD-${String(item.productId).padStart(6, '0')}`}</div>
                          </td>
                          <td className="text-center">{item.ordered}</td>
                          <td className="text-center text-success fw-bold">{item.receivedToDate}</td>
                          <td>
                            <div className="input-group input-group-sm">
                              <input
                                type="number"
                                className="form-control text-center fw-bold"
                                min="0"
                                max={item.ordered - item.receivedToDate}
                                value={item.currentReceipt}
                                onChange={e => {
                                  const valStr = e.target.value;
                                  const maxVal = item.ordered - item.receivedToDate;
                                  const val = valStr === '' ? '' : Math.min(parseInt(valStr) || 0, maxVal);
                                  const newList = [...receiptItems];
                                  newList[i].currentReceipt = val;
                                  setReceiptItems(newList);
                                }}
                              />
                              <span className="input-group-text">/ {item.ordered - item.receivedToDate} left</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer border-0 p-4">
                <button className="btn btn-light" onClick={() => setShowPartialModal(false)}>Cancel</button>
                <button className="btn btn-success px-5 d-flex align-items-center gap-2" onClick={handlePartialReceive} disabled={actionLoading}>
                  {actionLoading ? <Loader size={16} className="animate-spin" /> : 'Post Receipt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add required icons to your imports at the top
const ArrowRightLeft = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m16 3 4 4-4 4" /><path d="M20 7H4" /><path d="m8 21-4-4 4-4" /><path d="M4 17h16" />
  </svg>
);

export default PurchasesPage;
