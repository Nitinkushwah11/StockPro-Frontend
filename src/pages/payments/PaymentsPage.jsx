import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Loader, X, Eye, CheckCircle, RefreshCw } from 'lucide-react';

import { paymentService } from '../../services/paymentService';
import { purchaseService } from '../../services/purchaseService';
import { supplierService } from '../../services/supplierService';
import { warehouseService } from '../../services/warehouseService';
import { authService } from '../../services/authService';
import { canCallEndpoint } from '../../utils/permissions';

const METHODS = ['CASH','UPI','BANK_TRANSFER','CREDIT_CARD','DEBIT_CARD','CHEQUE','NET_BANKING'];
const STATUSES = ['PENDING','COMPLETED','FAILED','REFUNDED','PARTIALLY_PAID','CANCELLED'];
const badge = s => ({PENDING:'bg-warning-subtle text-warning',COMPLETED:'bg-success-subtle text-success',FAILED:'bg-danger-subtle text-danger',REFUNDED:'bg-info-subtle text-info',PARTIALLY_PAID:'bg-primary-subtle text-primary',CANCELLED:'bg-secondary-subtle text-secondary'}[s]||'bg-light text-dark');
const fmt = m => m ? m.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) : '';
const asList = value => Array.isArray(value) ? value : Array.isArray(value?.content) ? value.content : [];

const PaymentsPage = () => {
  const userRole = authService.getCurrentUser()?.role;
  const canWritePayments = canCallEndpoint(userRole, 'POST', '/payments');
  const [payments, setPayments] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [updStatus, setUpdStatus] = useState(false);

  const empty = {purchaseOrderId:'',supplierId:'',amount:'',paymentMethod:'',transactionReference:'',notes:'',paymentDate:'',createdBy:''};
  const [form, setForm] = useState(empty);
  const [errs, setErrs] = useState({});

  const fetch_ = async () => {
    try {
      setLoading(true);
      const [paymentsResult, poResult, suppliersResult, warehousesResult] = await Promise.allSettled([
        paymentService.getAllPayments({ suppressForbiddenRedirect: true }),
        purchaseService.getAllPOs({ suppressForbiddenRedirect: true }),
        supplierService.getAllSuppliers({ suppressForbiddenRedirect: true }),
        warehouseService.getAllWarehouses({ suppressForbiddenRedirect: true })
      ]);

      if (paymentsResult.status !== 'fulfilled') {
        throw new Error('Payment data failed to load');
      }

      setPayments(asList(paymentsResult.value));
      setPurchaseOrders(poResult.status === 'fulfilled' ? asList(poResult.value) : []);
      setSuppliers(suppliersResult.status === 'fulfilled' ? asList(suppliersResult.value) : []);
      setWarehouses(warehousesResult.status === 'fulfilled' ? asList(warehousesResult.value) : []);
      setError(null);
    } catch (e) {
      setPayments([]);
      setPurchaseOrders([]);
      setSuppliers([]);
      setWarehouses([]);
      setError('Failed to load payment data.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(()=>{fetch_();},[]);
  useEffect(()=>{if(successMsg){const t=setTimeout(()=>setSuccessMsg(null),4000);return()=>clearTimeout(t);}},[successMsg]);

  const money = value => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const getPO = id => purchaseOrders.find(po => Number(po.poId) === Number(id));
  const getSupplier = id => suppliers.find(s => Number(s.supplierId) === Number(id));
  const getWarehouse = id => warehouses.find(w => Number(w.warehouseId) === Number(id));
  const getPOReference = po => po?.poNumber || po?.poReference || po?.referenceNumber || (po?.poId ? `PO-${String(po.poId).padStart(6, '0')}` : '-');
  const getSupplierName = id => getSupplier(id)?.name || `Supplier #${id || '-'}`;
  const getWarehouseName = id => getWarehouse(id)?.name || `Warehouse #${id || '-'}`;
  const getPaymentPO = payment => getPO(payment.purchaseOrderId);
  const getPaymentSupplierName = payment => getSupplierName(getPaymentPO(payment)?.supplierId || payment.supplierId);
  const selectedPO = form.purchaseOrderId ? getPO(form.purchaseOrderId) : null;

  const filtered = payments.filter(p=>{
    const po = getPaymentPO(p);
    const supplierName = getPaymentSupplierName(p).toLowerCase();
    const haystack = [
      p.paymentNumber,
      p.transactionReference,
      p.purchaseOrderId,
      getPOReference(po),
      supplierName,
      p.supplierId
    ].join(' ').toLowerCase();
    const ms = haystack.includes(searchTerm.toLowerCase());
    return ms&&(!statusFilter||p.status===statusFilter);
  });

  const validate=()=>{const e={};if(!form.purchaseOrderId)e.purchaseOrderId='Required';if(!form.supplierId)e.supplierId='Required';if(!form.amount||parseFloat(form.amount)<=0)e.amount='Must be > 0';if(!form.paymentMethod)e.paymentMethod='Required';setErrs(e);return !Object.keys(e).length;};
  const onChange=e=>{setForm(p=>({...p,[e.target.name]:e.target.value}));if(errs[e.target.name])setErrs(p=>({...p,[e.target.name]:null}));};
  
  const handlePOChange = (e) => {
    const poId = e.target.value;
    const selectedPO = purchaseOrders.find(po => po.poId === parseInt(poId));
    if (selectedPO) {
      setForm(prev => ({
        ...prev,
        purchaseOrderId: poId,
        supplierId: selectedPO.supplierId,
        amount: selectedPO.totalAmount
      }));
    } else {
      setForm(prev => ({ ...prev, purchaseOrderId: poId }));
    }
  };
  const openAdd=()=>{setForm(empty);setErrs({});setModalMode('add');setShowModal(true);};
  const openEdit=p=>{setForm({purchaseOrderId:p.purchaseOrderId||'',supplierId:p.supplierId||'',amount:p.amount||'',paymentMethod:p.paymentMethod||'',transactionReference:p.transactionReference||'',notes:p.notes||'',paymentDate:p.paymentDate?p.paymentDate.substring(0,16):'',createdBy:p.createdBy||''});setErrs({});setSelected(p);setModalMode('edit');setShowModal(true);};
  const openView=p=>{setSelected(p);setModalMode('view');setShowModal(true);};
  const close=()=>{setShowModal(false);setSelected(null);setForm(empty);setErrs({});};

  const save=async()=>{if(!validate())return;setSaving(true);try{const pl={...form,purchaseOrderId:parseInt(form.purchaseOrderId),supplierId:parseInt(form.supplierId),amount:parseFloat(form.amount),paymentDate:form.paymentDate?form.paymentDate+':00':null};if(modalMode==='add'){await paymentService.createPayment(pl);setSuccessMsg('Payment created!');}else{await paymentService.updatePayment(selected.paymentId,pl);setSuccessMsg('Payment updated!');}close();await fetch_();}catch(e){setErrs({_server:e.response?.data?.message||'Failed to save.'});}finally{setSaving(false);}};

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpay = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await loadRazorpay();
      if (!res) {
        setError("Razorpay SDK failed to load. Check your connection.");
        setSaving(false);
        return;
      }
      const orderData = {
        amount: parseFloat(form.amount),
        purchaseOrderId: parseInt(form.purchaseOrderId),
        supplierId: parseInt(form.supplierId),
        notes: form.notes,
        createdBy: form.createdBy || 'User'
      };
      const orderRes = await paymentService.createRazorpayOrder(orderData);
      const options = {
        key: orderRes.keyId,
        amount: orderRes.amount * 100,
        currency: orderRes.currency,
        name: "StockPro",
        description: `Purchase Order ${getPOReference(selectedPO)}`,
        order_id: orderRes.razorpayOrderId,
        handler: async (response) => {
          try {
            await paymentService.verifyRazorpayPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              internalPaymentId: orderRes.paymentId
            });
            setSuccessMsg("Payment Successful!");
            close();
            fetch_();
          } catch (err) {
            setError("Payment verification failed.");
          }
        },
        prefill: { name: "Admin", email: "admin@stockpro.com", contact: "9999999999" },
        theme: { color: "#0d6efd" }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      setErrs({ _server: e.response?.data?.message || 'Failed to initialize Razorpay.' });
    } finally {
      setSaving(false);
    }
  };

  const del=async()=>{if(!delTarget)return;setDeleting(true);try{await paymentService.deletePayment(delTarget.paymentId);setSuccessMsg('Payment deleted.');setShowDel(false);setDelTarget(null);await fetch_();}catch(e){setError(e.response?.data?.message||e.message);setShowDel(false);}finally{setDeleting(false);}};
  const updSt=async()=>{if(!statusTarget)return;setUpdStatus(true);try{await paymentService.updatePaymentStatus(statusTarget.paymentId,newStatus);setSuccessMsg(`Status → ${newStatus}`);setShowStatus(false);await fetch_();}catch(e){setError(e.response?.data?.message||e.message);setShowStatus(false);}finally{setUpdStatus(false);}};

  const field=(l,n,t='text',ph='',req=false)=>(<div className="mb-3"><label className="form-label small fw-bold text-secondary">{l} {req&&<span className="text-danger">*</span>}</label>{t==='textarea'?<textarea className={`form-control ${errs[n]?'is-invalid':''}`} name={n} value={form[n]} onChange={onChange} placeholder={ph} rows={3}/>:<input type={t} className={`form-control ${errs[n]?'is-invalid':''}`} name={n} value={form[n]} onChange={onChange} placeholder={ph} step={t==='number'?'0.01':undefined}/>}{errs[n]&&<div className="invalid-feedback">{errs[n]}</div>}</div>);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div><h2 className="fw-bold mb-0">Payments</h2><p className="text-muted mb-0">Track and manage supplier payments.{!loading&&<span className="ms-1 text-primary fw-medium">({payments.length} total)</span>}</p></div>
        {canWritePayments && <button className="btn btn-primary d-flex align-items-center gap-2 shadow-sm" onClick={openAdd}><Plus size={18}/>New Payment</button>}
      </div>
      {successMsg&&<div className="alert alert-success border-0 shadow-sm mb-4 d-flex align-items-center justify-content-between"><div className="d-flex align-items-center gap-2"><CheckCircle size={18} className="text-success"/>{successMsg}</div><button className="btn btn-sm btn-close" onClick={()=>setSuccessMsg(null)}/></div>}
      {error&&<div className="alert alert-danger border-0 shadow-sm mb-4 d-flex align-items-center justify-content-between"><div>{error}</div><button className="btn btn-sm btn-close" onClick={()=>setError(null)}/></div>}

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom-0 pt-4 pb-3 d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="input-group" style={{maxWidth:'360px'}}><span className="input-group-text bg-white border-end-0"><Search size={18} className="text-muted"/></span><input type="text" className="form-control border-start-0 ps-0" placeholder="Search payment, PO, or supplier..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>
          <select className="form-select form-select-sm" style={{minWidth:'160px'}} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">All Statuses</option>{STATUSES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}</select>
        </div>
        <div className="card-body p-0"><div className="table-responsive"><table className="table table-hover align-middle mb-0"><thead className="table-light"><tr><th className="ps-4">Payment #</th><th>Purchase Order</th><th>Supplier</th><th className="text-end">Amount</th><th>Method</th><th className="text-center">Status</th><th>Date</th><th className="text-end pe-4">Actions</th></tr></thead>
        <tbody>{loading?<tr><td colSpan="8" className="text-center py-5"><Loader className="animate-spin text-primary mx-auto mb-2"/><p className="text-muted small mb-0">Loading...</p></td></tr>:filtered.length>0?filtered.map(p=>(
          <tr key={p.paymentId}><td className="ps-4"><span className="text-primary fw-medium font-monospace">{p.paymentNumber}</span></td><td><div className="fw-semibold text-primary font-monospace">{getPOReference(getPaymentPO(p))}</div></td><td><div className="fw-semibold">{getPaymentSupplierName(p)}</div></td><td className="text-end font-monospace fw-medium">₹{money(p.amount)}</td><td><span className="badge bg-light text-dark border">{fmt(p.paymentMethod)}</span></td><td className="text-center"><span className={`badge ${badge(p.status)} rounded-pill px-3`}>{p.status?.replace(/_/g,' ')}</span></td><td className="text-muted small">{p.paymentDate?new Date(p.paymentDate).toLocaleDateString('en-IN'):'-'}</td>
          <td className="text-end pe-4">
            <button className="btn btn-sm btn-light me-1" onClick={()=>openView(p)}><Eye size={15} className="text-info"/></button>
            {canWritePayments && (
              <>
                <button className="btn btn-sm btn-light me-1" onClick={()=>{setStatusTarget(p);setNewStatus(p.status);setShowStatus(true);}}><RefreshCw size={15} className="text-warning"/></button>
                <button className="btn btn-sm btn-light me-1" onClick={()=>openEdit(p)} disabled={p.status==='COMPLETED'||p.status==='REFUNDED'}><Edit size={15} className="text-secondary"/></button>
                <button className="btn btn-sm btn-light" onClick={()=>{setDelTarget(p);setShowDel(true);}} disabled={p.status==='COMPLETED'}><Trash2 size={15} className="text-danger"/></button>
              </>
            )}
          </td></tr>)):<tr><td colSpan="8" className="text-center py-5 text-muted">{searchTerm||statusFilter?'No results.':'No payments yet.'}</td></tr>}</tbody></table></div></div>
        {!loading&&filtered.length>0&&<div className="card-footer bg-white text-muted small d-flex justify-content-between"><span>Showing {filtered.length} of {payments.length}</span>{(searchTerm||statusFilter)&&<button className="btn btn-sm btn-outline-secondary" onClick={()=>{setSearchTerm('');setStatusFilter('');}}>Clear</button>}</div>}
      </div>

      {showModal&&<div className="modal fade show d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}} onClick={close}><div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={e=>e.stopPropagation()}><div className="modal-content border-0 shadow">
        <div className="modal-header border-0 pb-0"><h5 className="modal-title fw-bold">{modalMode==='add'?'💳 New Payment':modalMode==='edit'?'✏️ Edit Payment':'📄 Payment Details'}</h5><button className="btn btn-sm btn-light rounded-circle" onClick={close}><X size={18}/></button></div>
        <div className="modal-body pt-2">
          {errs._server&&<div className="alert alert-danger small py-2 mb-3">{errs._server}</div>}
          {modalMode==='view'?<div className="row g-3">
            <div className="col-6"><div className="text-muted small">Payment #</div><div className="fw-bold font-monospace">{selected.paymentNumber}</div></div>
            <div className="col-6"><div className="text-muted small">Status</div><span className={`badge ${badge(selected.status)} rounded-pill`}>{selected.status?.replace(/_/g,' ')}</span></div>
            <div className="col-12"><hr className="my-1"/></div>
            <div className="col-6"><div className="text-muted small">Purchase Order</div><div className="fw-bold font-monospace">{getPOReference(getPaymentPO(selected))}</div></div>
            <div className="col-6"><div className="text-muted small">Supplier</div><div className="fw-bold">{getPaymentSupplierName(selected)}</div></div>
            {getPaymentPO(selected)?.warehouseId&&<div className="col-6"><div className="text-muted small">Purchase Warehouse</div><div className="fw-bold">{getWarehouseName(getPaymentPO(selected).warehouseId)}</div></div>}
            <div className="col-6"><div className="text-muted small">Amount</div><div className="fw-bold text-success font-monospace fs-5">₹{money(selected.amount)}</div></div>
            <div className="col-6"><div className="text-muted small">Method</div><div>{fmt(selected.paymentMethod)}</div></div>
            <div className="col-6"><div className="text-muted small">Reference</div><div className="font-monospace">{selected.transactionReference||'-'}</div></div>
            <div className="col-6"><div className="text-muted small">Date</div><div>{selected.paymentDate?new Date(selected.paymentDate).toLocaleString('en-IN'):'-'}</div></div>
            <div className="col-12"><div className="text-muted small">Notes</div><div>{selected.notes||'No notes'}</div></div>
          </div>:<div>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label small fw-bold text-secondary">Purchase Order <span className="text-danger">*</span></label>
                  <select 
                    className={`form-select ${errs.purchaseOrderId?'is-invalid':''}`} 
                    name="purchaseOrderId" 
                    value={form.purchaseOrderId} 
                    onChange={handlePOChange}
                  >
                    <option value="">Select a Purchase Order...</option>
                    {purchaseOrders.map(po => (
                      <option key={po.poId} value={po.poId}>
                        {getPOReference(po)} - {getSupplierName(po.supplierId)} - ₹{money(po.totalAmount)}
                      </option>
                    ))}
                  </select>
                  {errs.purchaseOrderId && <div className="invalid-feedback">{errs.purchaseOrderId}</div>}
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label small fw-bold text-secondary">Supplier</label>
                  <input 
                    type="text" 
                    className="form-control bg-light" 
                    value={form.supplierId ? getSupplierName(form.supplierId) : ''} 
                    readOnly 
                    placeholder="Auto-populated"
                  />
                </div>
              </div>
            </div>
            {selectedPO&&<div className="border rounded bg-light p-3 mb-3">
              <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                <div><div className="text-muted small fw-bold">Selected Purchase Order</div><div className="fw-semibold">{getPOReference(selectedPO)}</div></div>
                <div><div className="text-muted small fw-bold">Supplier</div><div className="fw-semibold">{getSupplierName(selectedPO.supplierId)}</div></div>
                <div><div className="text-muted small fw-bold">Warehouse</div><div className="fw-semibold">{getWarehouseName(selectedPO.warehouseId)}</div></div>
                <div><div className="text-muted small fw-bold">Status</div><span className="badge bg-primary-subtle text-primary">{selectedPO.status || '-'}</span></div>
                <div><div className="text-muted small fw-bold">Total</div><div className="fw-semibold font-monospace">₹{money(selectedPO.totalAmount)}</div></div>
              </div>
            </div>}
            <div className="row"><div className="col-md-6">{field('Amount (₹)','amount','number','0.00',true)}</div><div className="col-md-6"><div className="mb-3"><label className="form-label small fw-bold text-secondary">Payment Method <span className="text-danger">*</span></label><select className={`form-select ${errs.paymentMethod?'is-invalid':''}`} name="paymentMethod" value={form.paymentMethod} onChange={onChange}><option value="">Select...</option>{METHODS.map(m=><option key={m} value={m}>{fmt(m)}</option>)}</select>{errs.paymentMethod&&<div className="invalid-feedback">{errs.paymentMethod}</div>}</div></div></div>
            {field('Transaction Reference','transactionReference','text','TXN-123456')}
            {field('Payment Date','paymentDate','datetime-local','')}
            {field('Notes','notes','textarea','Additional notes...')}
            {field('Created By','createdBy','text','e.g. admin')}
          </div>}
        </div>
        <div className="modal-footer border-0 pt-0">
          <button className="btn btn-light" onClick={close}>{modalMode==='view'?'Close':'Cancel'}</button>
          {modalMode==='view'&&selected.status!=='COMPLETED'&&canWritePayments&&<button className="btn btn-primary" onClick={()=>{close();openEdit(selected);}}><Edit size={16} className="me-1"/>Edit</button>}
          {modalMode!=='view'&& (
            <div className="d-flex gap-2">
              <button className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={handleRazorpay} disabled={saving}>
                {saving ? <Loader size={16} className="animate-spin" /> : 'Pay with Razorpay'}
              </button>
              <button className="btn btn-primary d-flex align-items-center gap-2" onClick={save} disabled={saving}>
                {saving ? (
                  <><Loader size={16} className="animate-spin" /> Saving...</>
                ) : (
                  <>{modalMode === 'add' ? 'Create Record' : 'Save Changes'}</>
                )}
              </button>
            </div>
          )}
        </div>
      </div></div></div>}

      {showStatus&&statusTarget&&<div className="modal fade show d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}} onClick={()=>setShowStatus(false)}><div className="modal-dialog modal-dialog-centered modal-sm" onClick={e=>e.stopPropagation()}><div className="modal-content border-0 shadow"><div className="modal-body text-center py-4"><div className="mb-3"><div className="bg-warning-subtle rounded-circle d-inline-flex align-items-center justify-content-center" style={{width:'64px',height:'64px'}}><RefreshCw size={28} className="text-warning"/></div></div><h5 className="fw-bold mb-2">Update Status</h5><p className="text-muted small mb-3">{statusTarget.paymentNumber}</p><select className="form-select mb-2" value={newStatus} onChange={e=>setNewStatus(e.target.value)}>{STATUSES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}</select></div><div className="modal-footer border-0 justify-content-center pt-0 gap-2"><button className="btn btn-light px-4" onClick={()=>setShowStatus(false)}>Cancel</button><button className="btn btn-primary px-4" onClick={updSt} disabled={updStatus}>{updStatus?'Updating...':'Update'}</button></div></div></div></div>}

      {showDel&&delTarget&&<div className="modal fade show d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}} onClick={()=>setShowDel(false)}><div className="modal-dialog modal-dialog-centered modal-sm" onClick={e=>e.stopPropagation()}><div className="modal-content border-0 shadow"><div className="modal-body text-center py-4"><div className="mb-3"><div className="bg-danger-subtle rounded-circle d-inline-flex align-items-center justify-content-center" style={{width:'64px',height:'64px'}}><Trash2 size={28} className="text-danger"/></div></div><h5 className="fw-bold mb-2">Delete Payment?</h5><p className="text-muted small mb-0">Delete <strong>"{delTarget.paymentNumber}"</strong>? This cannot be undone.</p></div><div className="modal-footer border-0 justify-content-center pt-0 gap-2"><button className="btn btn-light px-4" onClick={()=>setShowDel(false)}>Cancel</button><button className="btn btn-danger px-4" onClick={del} disabled={deleting}>{deleting?'Deleting...':'Delete'}</button></div></div></div></div>}
    </div>
  );
};

export default PaymentsPage;
