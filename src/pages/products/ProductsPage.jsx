import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Loader, X, Eye, ChevronDown } from 'lucide-react';
import FocusLock from 'react-focus-lock';
import { productService } from '../../services/productService';
import { authService } from '../../services/authService';
import { canCallEndpoint } from '../../utils/permissions';

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  return [];
};

const isActiveRecord = (record) => record?.isActive ?? record?.active ?? true;

const ProductsPage = () => {
  const userRole = authService.getCurrentUser()?.role;
  const canWriteProducts = canCallEndpoint(userRole, 'POST', '/products');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const emptyForm = {
    sku: '', name: '', description: '', category: '', brand: '',
    unitOfMeasure: '', costPrice: '', sellingPrice: '', reorderLevel: '',
    maxStockLevel: '', leadTimeDays: '', barcode: ''
  };
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  // Track which select fields are showing custom text input
  const [customInputFields, setCustomInputFields] = useState({});

  // ---------- DATA FETCHING ----------
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getAllProducts();
      setProducts(normalizeList(data));
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Make sure the backend is running and api-gateway is on port 8080.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Auto-hide success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // ---------- DROPDOWN OPTIONS (from existing data) ----------
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
  const units = [...new Set(products.map(p => p.unitOfMeasure).filter(Boolean))].sort();
  const getNextSku = () => {
    const maxProductId = products.reduce((max, product) => Math.max(max, Number(product.productId) || 0), 0);
    return `PRD-${String(maxProductId + 1).padStart(6, '0')}`;
  };

  // ---------- FILTERS ----------

  const filteredProducts = products.filter(product => {
    const matchesSearch =
      (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // ---------- FORM VALIDATION ----------
  const validateForm = () => {
    const errors = {};
    if (!formData.sku.trim()) errors.sku = 'SKU is required';
    if (!formData.name.trim()) errors.name = 'Product name is required';
    if (!formData.category.trim()) errors.category = 'Category is required';
    if (!formData.brand.trim()) errors.brand = 'Brand is required';
    if (!formData.unitOfMeasure.trim()) errors.unitOfMeasure = 'Unit of measure is required';
    if (!formData.barcode.trim()) errors.barcode = 'Barcode is required';

    const costPrice = Number(formData.costPrice);
    const sellingPrice = Number(formData.sellingPrice);
    if (formData.costPrice === '' || formData.costPrice === null || formData.costPrice === undefined) {
      errors.costPrice = 'Cost price is required';
    } else if (Number.isNaN(costPrice)) {
      errors.costPrice = 'Cost price must be a valid number';
    } else if (costPrice < 0) {
      errors.costPrice = 'Cost price cannot be negative';
    }
    if (formData.sellingPrice === '' || formData.sellingPrice === null || formData.sellingPrice === undefined) {
      errors.sellingPrice = 'Selling price is required';
    } else if (Number.isNaN(sellingPrice)) {
      errors.sellingPrice = 'Selling price must be a valid number';
    } else if (sellingPrice < 0) {
      errors.sellingPrice = 'Selling price cannot be negative';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ---------- MODAL HANDLERS ----------
  const openAddModal = () => {
    setFormData({ ...emptyForm, sku: getNextSku() });
    setFormErrors({});
    setCustomInputFields({});
    setModalMode('add');
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setFormData({
      sku: product.sku || '',
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      brand: product.brand || '',
      unitOfMeasure: product.unitOfMeasure || '',
      costPrice: product.costPrice || '',
      sellingPrice: product.sellingPrice || '',
      reorderLevel: product.reorderLevel || '',
      maxStockLevel: product.maxStockLevel || '',
      leadTimeDays: product.leadTimeDays || '',
      barcode: product.barcode || ''
    });
    setFormErrors({});
    setCustomInputFields({});
    setSelectedProduct(product);
    setModalMode('edit');
    setShowModal(true);
  };

  const openViewModal = (product) => {
    setSelectedProduct(product);
    setModalMode('view');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
    setFormData(emptyForm);
    setFormErrors({});
  };

  // ---------- FORM INPUT HANDLER ----------
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user types
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // ---------- SAVE (CREATE / UPDATE) ----------
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (modalMode === 'add') {
        await productService.createProduct(formData);
        setSuccessMsg('Product created successfully!');
      } else {
        await productService.updateProduct(selectedProduct.productId, formData);
        setSuccessMsg('Product updated successfully!');
      }
      closeModal();
      await fetchProducts(); // Refresh list
    } catch (err) {
      console.error('Save error:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to save product. Check your input.';
      setFormErrors({ _server: msg });
    } finally {
      setSaving(false);
    }
  };

  // ---------- DELETE ----------
  const openDeleteModal = (product) => {
    setDeleteTarget(product);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await productService.deleteProduct(deleteTarget.productId);
      setSuccessMsg(`Product "${deleteTarget.name}" deleted successfully.`);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      await fetchProducts();
    } catch (err) {
      console.error('Delete error:', err);
      setError(`Failed to delete product: ${err.response?.data?.message || err.message}`);
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  // ---------- RENDER: FORM FIELD HELPER ----------
  const renderField = (label, name, type = 'text', placeholder = '', required = false) => (
    <div className="mb-3">
      <label className="form-label small fw-bold text-secondary">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          className={`form-control ${formErrors[name] ? 'is-invalid' : ''}`}
          name={name}
          value={formData[name]}
          onChange={handleInputChange}
          placeholder={placeholder}
          rows={3}
          disabled={modalMode === 'view'}
        />
      ) : (
        <input
          type={type}
          className={`form-control ${formErrors[name] ? 'is-invalid' : ''}`}
          name={name}
          value={formData[name]}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={modalMode === 'view'}
          step={type === 'number' ? '0.01' : undefined}
        />
      )}
      {formErrors[name] && <div className="invalid-feedback">{formErrors[name]}</div>}
    </div>
  );

  // ---------- RENDER: DROPDOWN SELECT FIELD ----------
  const renderSelectField = (label, name, options, placeholder = 'Select...', required = false) => {
    const isShowingCustom = customInputFields[name] || false;
    const currentValueInOptions = options.includes(formData[name]);
    const isCustom = formData[name] && !currentValueInOptions;

    return (
      <div className="mb-3">
        <label className="form-label small fw-bold text-secondary">
          {label} {required && <span className="text-danger">*</span>}
        </label>
        {(isShowingCustom || isCustom) && modalMode !== 'view' ? (
          <div className="input-group">
            <input
              type="text"
              className={`form-control ${formErrors[name] ? 'is-invalid' : ''}`}
              name={name}
              value={formData[name]}
              onChange={handleInputChange}
              placeholder={`Type new ${label.toLowerCase()}...`}
              autoFocus
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              title="Show dropdown"
              onClick={() => setCustomInputFields(prev => ({ ...prev, [name]: false }))}
            >
              ▼
            </button>
            {formErrors[name] && <div className="invalid-feedback">{formErrors[name]}</div>}
          </div>
        ) : (
          <>
            <select
              className={`form-select ${formErrors[name] ? 'is-invalid' : ''}`}
              name={name}
              value={formData[name]}
              onChange={(e) => {
                if (e.target.value === '__NEW__') {
                  setCustomInputFields(prev => ({ ...prev, [name]: true }));
                  setFormData(prev => ({ ...prev, [name]: '' }));
                } else {
                  handleInputChange(e);
                }
              }}
              disabled={modalMode === 'view'}
            >
              <option value="">{placeholder}</option>
              {options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
              {modalMode !== 'view' && (
                <option value="__NEW__">＋ Add new {label.toLowerCase()}...</option>
              )}
            </select>
            {formErrors[name] && <div className="invalid-feedback">{formErrors[name]}</div>}
          </>
        )}
      </div>
    );
  };

  // ===================== RENDER =====================
  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Products</h2>
          <p className="text-muted mb-0">
            Manage your product catalog and inventory levels.
            {!loading && <span className="ms-1 text-primary fw-medium">({products.length} total)</span>}
          </p>
        </div>
        {canWriteProducts && (
          <button className="btn btn-primary d-flex align-items-center gap-2 shadow-sm" onClick={openAddModal}>
            <Plus size={18} /> Add Product
          </button>
        )}
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div className="alert alert-success border-0 shadow-sm mb-4 d-flex align-items-center justify-content-between" role="alert" aria-live="polite">
          <div className="d-flex align-items-center gap-2">
            <span className="material-symbols-outlined text-success" aria-hidden="true">check_circle</span>
            {successMsg}
          </div>
          <button className="btn btn-sm btn-close" onClick={() => setSuccessMsg(null)} aria-label="Close alert"></button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger border-0 shadow-sm mb-4 d-flex align-items-center justify-content-between" role="alert" aria-live="assertive">
          <div>{error}</div>
          <button className="btn btn-sm btn-close" onClick={() => setError(null)} aria-label="Close alert"></button>
        </div>
      )}

      {/* Products Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom-0 pt-4 pb-3 d-flex justify-content-between align-items-center flex-wrap gap-3">
          {/* Search */}
          <div className="input-group" style={{ maxWidth: '320px' }}>
            <span className="input-group-text bg-white border-end-0"><Search size={18} className="text-muted" /></span>
            <input
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder="Search by name, SKU, or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div className="d-flex align-items-center gap-2">
            <select
              className="form-select form-select-sm"
              style={{ minWidth: '160px' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">SKU</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th className="text-end">Cost Price</th>
                  <th className="text-end">Sell Price</th>
                  <th className="text-center">Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5">
                      <Loader className="animate-spin text-primary mx-auto mb-2" />
                      <p className="text-muted small mb-0">Loading products from backend...</p>
                    </td>
                  </tr>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map(product => (
                    <tr key={product.productId}>
                      <td className="ps-4">
                        <span className="text-primary fw-medium font-monospace">{product.sku}</span>
                      </td>
                      <td className="fw-medium">
                        <div>
                          {product.name}
                          <div className="small text-muted">{product.barcode}</div>
                        </div>
                      </td>
                      <td><span className="badge bg-light text-dark border">{product.category}</span></td>
                      <td className="text-muted">{product.brand}</td>
                      <td className="text-end font-monospace">₹{product.costPrice?.toFixed(2)}</td>
                      <td className="text-end font-monospace fw-medium">₹{product.sellingPrice?.toFixed(2)}</td>
                      <td className="text-center">
                        <span className={`badge ${isActiveRecord(product) ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'} rounded-pill px-3`}>
                          {isActiveRecord(product) ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <button
                          className="btn btn-sm btn-light me-1"
                          title="View Details"
                          onClick={() => openViewModal(product)}
                        >
                          <Eye size={15} className="text-info" />
                        </button>
                        {canWriteProducts && (
                          <>
                            <button
                              className="btn btn-sm btn-light me-1"
                              title="Edit Product"
                              onClick={() => openEditModal(product)}
                            >
                              <Edit size={15} className="text-secondary" />
                            </button>
                            <button
                              className="btn btn-sm btn-light"
                              title="Delete Product"
                              onClick={() => openDeleteModal(product)}
                            >
                              <Trash2 size={15} className="text-danger" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      {searchTerm || categoryFilter
                        ? 'No products match your search criteria.'
                        : 'No products found. Click "Add Product" to create one.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer with count */}
        {!loading && filteredProducts.length > 0 && (
          <div className="card-footer bg-white text-muted small d-flex justify-content-between align-items-center">
            <span>Showing {filteredProducts.length} of {products.length} products</span>
            {(searchTerm || categoryFilter) && (
              <button className="btn btn-sm btn-outline-secondary" onClick={() => { setSearchTerm(''); setCategoryFilter(''); }}>
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* =================== ADD/EDIT/VIEW MODAL =================== */}
      {showModal && (
        <FocusLock>
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeModal} role="dialog" aria-modal="true" aria-labelledby="productModalTitle">
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content border-0 shadow">
                {/* Modal Header */}
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold" id="productModalTitle">
                    {modalMode === 'add' && '➕ Add New Product'}
                    {modalMode === 'edit' && '✏️ Edit Product'}
                    {modalMode === 'view' && '📦 Product Details'}
                  </h5>
                  <button className="btn btn-sm btn-light rounded-circle" onClick={closeModal} aria-label="Close modal">
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>

                <div className="modal-body pt-2">
                  {/* Server Error */}
                  {formErrors._server && (
                    <div className="alert alert-danger small py-2 mb-3">{formErrors._server}</div>
                  )}

                  {modalMode === 'view' ? (
                    /* ---------- VIEW MODE ---------- */
                    <div>
                      <div className="row g-3">
                        <div className="col-6">
                          <div className="text-muted small">SKU</div>
                          <div className="fw-bold font-monospace">{selectedProduct.sku}</div>
                        </div>
                        <div className="col-6">
                          <div className="text-muted small">Barcode</div>
                          <div className="fw-bold font-monospace">{selectedProduct.barcode}</div>
                        </div>
                        <div className="col-12"><hr className="my-1" /></div>
                        <div className="col-12">
                          <div className="text-muted small">Product Name</div>
                          <div className="fw-bold fs-5">{selectedProduct.name}</div>
                        </div>
                        <div className="col-12">
                          <div className="text-muted small">Description</div>
                          <div>{selectedProduct.description || 'No description'}</div>
                        </div>
                        <div className="col-6">
                          <div className="text-muted small">Category</div>
                          <div><span className="badge bg-primary-subtle text-primary">{selectedProduct.category}</span></div>
                        </div>
                        <div className="col-6">
                          <div className="text-muted small">Brand</div>
                          <div className="fw-medium">{selectedProduct.brand}</div>
                        </div>
                        <div className="col-12"><hr className="my-1" /></div>
                        <div className="col-4">
                          <div className="text-muted small">Cost Price</div>
                          <div className="fw-bold text-success font-monospace">₹{selectedProduct.costPrice?.toFixed(2)}</div>
                        </div>
                        <div className="col-4">
                          <div className="text-muted small">Selling Price</div>
                          <div className="fw-bold text-primary font-monospace">₹{selectedProduct.sellingPrice?.toFixed(2)}</div>
                        </div>
                        <div className="col-4">
                          <div className="text-muted small">Margin</div>
                          <div className="fw-bold font-monospace">
                            {selectedProduct.sellingPrice > 0
                              ? `${(((selectedProduct.sellingPrice - selectedProduct.costPrice) / selectedProduct.sellingPrice) * 100).toFixed(1)}%`
                              : 'N/A'}
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="text-muted small">Unit</div>
                          <div>{selectedProduct.unitOfMeasure}</div>
                        </div>
                        <div className="col-4">
                          <div className="text-muted small">Reorder Level</div>
                          <div className="fw-bold">{selectedProduct.reorderLevel}</div>
                        </div>
                        <div className="col-4">
                          <div className="text-muted small">Max Stock</div>
                          <div className="fw-bold">{selectedProduct.maxStockLevel}</div>
                        </div>
                        <div className="col-6">
                          <div className="text-muted small">Lead Time</div>
                          <div>{selectedProduct.leadTimeDays} days</div>
                        </div>
                        <div className="col-6">
                          <div className="text-muted small">Status</div>
                          <div>
                            <span className={`badge ${isActiveRecord(selectedProduct) ? 'bg-success' : 'bg-secondary'} rounded-pill`}>
                              {isActiveRecord(selectedProduct) ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ---------- ADD/EDIT FORM ---------- */
                    <div>
                      <div className="row">
                        <div className="col-md-6">
                          {renderField('SKU', 'sku', 'text', 'e.g. PRD-001', true)}
                        </div>
                        <div className="col-md-6">
                          {renderField('Barcode', 'barcode', 'text', 'e.g. 8901234567890', true)}
                        </div>
                      </div>
                      {renderField('Product Name', 'name', 'text', 'Enter product name', true)}
                      {renderField('Description', 'description', 'textarea', 'Enter product description')}
                      <div className="row">
                        <div className="col-md-4">
                          {renderSelectField('Category', 'category', categories, 'Select category...', true)}
                        </div>
                        <div className="col-md-4">
                          {renderSelectField('Brand', 'brand', brands, 'Select brand...', true)}
                        </div>
                        <div className="col-md-4">
                          {renderSelectField('Unit of Measure', 'unitOfMeasure', units, 'Select unit...', true)}
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-6">
                          {renderField('Cost Price (₹)', 'costPrice', 'number', '0.00', true)}
                        </div>
                        <div className="col-md-6">
                          {renderField('Selling Price (₹)', 'sellingPrice', 'number', '0.00', true)}
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-4">
                          {renderField('Reorder Level', 'reorderLevel', 'number', '0')}
                        </div>
                        <div className="col-md-4">
                          {renderField('Max Stock Level', 'maxStockLevel', 'number', '0')}
                        </div>
                        <div className="col-md-4">
                          {renderField('Lead Time (days)', 'leadTimeDays', 'number', '0')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="modal-footer border-0 pt-0">
                  <button className="btn btn-light" onClick={closeModal}>
                    {modalMode === 'view' ? 'Close' : 'Cancel'}
                  </button>
                  {modalMode === 'view' && canWriteProducts && (
                    <button className="btn btn-primary" onClick={() => { closeModal(); openEditModal(selectedProduct); }}>
                      <Edit size={16} className="me-1" /> Edit Product
                    </button>
                  )}
                  {modalMode !== 'view' && (
                    <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <><Loader size={16} className="animate-spin" /> Saving...</>
                      ) : (
                        <>{modalMode === 'add' ? 'Create Product' : 'Save Changes'}</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </FocusLock>
      )}

      {/* =================== DELETE CONFIRMATION MODAL =================== */}
      {showDeleteModal && deleteTarget && (
        <FocusLock>
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowDeleteModal(false)} role="dialog" aria-modal="true" aria-labelledby="deleteModalTitle">
            <div className="modal-dialog modal-dialog-centered modal-sm" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content border-0 shadow">
                <div className="modal-body text-center py-4">
                  <div className="mb-3">
                    <div className="bg-danger-subtle rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px' }}>
                      <Trash2 size={28} className="text-danger" aria-hidden="true" />
                    </div>
                  </div>
                  <h5 className="fw-bold mb-2" id="deleteModalTitle">Delete Product?</h5>
                  <p className="text-muted small mb-0">
                    Are you sure you want to delete <strong>"{deleteTarget.name}"</strong> ({deleteTarget.sku})?
                    This action cannot be undone.
                  </p>
                </div>
                <div className="modal-footer border-0 justify-content-center pt-0 gap-2">
                  <button className="btn btn-light px-4" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                  <button className="btn btn-danger px-4 d-flex align-items-center gap-2" onClick={handleDelete} disabled={deleting}>
                    {deleting ? <><Loader size={16} className="animate-spin" /> Deleting...</> : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </FocusLock>
      )}
    </div>
  );
};

export default ProductsPage;
