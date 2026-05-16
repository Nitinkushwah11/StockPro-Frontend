import React, { useState, useEffect } from 'react';
import { ArrowDownRight, ArrowUpRight, RefreshCw, Loader, Search, Filter, Calendar, Package, Download, FileText } from 'lucide-react';
import { movementService } from '../../services/movementService';
import { productService } from '../../services/productService';
import { warehouseService } from '../../services/warehouseService';
import { purchaseService } from '../../services/purchaseService';
import { reportService } from '../../services/reportService';
import { authService } from '../../services/authService';
import { canCallEndpoint } from '../../utils/permissions';

const MovementsPage = () => {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState({});
  const [warehouses, setWarehouses] = useState({});
  const [purchaseOrders, setPurchaseOrders] = useState({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const [error, setError] = useState(null);
  const userRole = authService.getCurrentUser()?.role;
  const canExportReports = canCallEndpoint(userRole, 'GET', '/reports/movements/export/pdf');
  
  // Filters
  const [filterType, setFilterType] = useState('ALL');
  const [searchProduct, setSearchProduct] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [movData, prodData, whData, poResult] = await Promise.all([
          movementService.getAllMovements(),
          productService.getAllProducts(),
          warehouseService.getAllWarehouses(),
          purchaseService.getAllPOs({ suppressForbiddenRedirect: true }).catch(() => [])
        ]);
        
        const prodMap = {};
        prodData.forEach(p => prodMap[p.productId] = p);
        
        const whMap = {};
        whData.forEach(w => whMap[w.warehouseId] = w.name);

        const poMap = {};
        poResult.forEach(po => poMap[po.poId] = po.referenceNumber || `PO-${String(po.poId).padStart(6, '0')}`);
        
        setProducts(prodMap);
        setWarehouses(whMap);
        setPurchaseOrders(poMap);
        setMovements([...movData].reverse()); 
        setError(null);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load movement logs.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getTypeStyle = (type) => {
    switch(type) {
      case 'STOCK_IN': return { icon: <ArrowDownRight size={16} />, class: 'bg-success-subtle text-success', label: 'Stock In' };
      case 'STOCK_OUT': return { icon: <ArrowUpRight size={16} />, class: 'bg-danger-subtle text-danger', label: 'Stock Out' };
      case 'TRANSFER_IN': return { icon: <RefreshCw size={16} />, class: 'bg-primary-subtle text-primary', label: 'Transfer In' };
      case 'TRANSFER_OUT': return { icon: <RefreshCw size={16} />, class: 'bg-primary-subtle text-primary', label: 'Transfer Out' };
      default: return { icon: null, class: 'bg-secondary-subtle', label: type };
    }
  };

  const getProductName = productId => products[productId]?.name || `Product #${productId}`;
  const getProductSku = productId => products[productId]?.sku || `PRD-${String(productId).padStart(6, '0')}`;
  const getReferenceLabel = mov => {
    if (mov.referenceType === 'PURCHASE_ORDER') {
      return purchaseOrders[mov.referenceId] || `PO-${String(mov.referenceId).padStart(6, '0')}`;
    }
    if (mov.referenceType && mov.referenceId) return `${mov.referenceType}: ${mov.referenceId}`;
    return 'Manual movement';
  };

  const filteredMovements = movements.filter(mov => {
    const matchesType = filterType === 'ALL' || mov.movementType === filterType;
    const product = products[mov.productId];
    const reference = getReferenceLabel(mov).toLowerCase();
    const search = searchProduct.toLowerCase();
    const productText = [
      product?.name,
      product?.sku,
      product?.barcode,
      mov.productId,
      reference
    ].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = productText.includes(search);
    return matchesType && matchesSearch;
  });

  const handleExport = async (format) => {
    try {
      setExporting(format);
      setError(null);
      if (format === 'pdf') {
        await reportService.downloadMovementReportPdf(filterType);
      } else {
        await reportService.downloadMovementReportExcel(filterType);
      }
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to download movement report. Admin or Manager access is required.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="container-fluid py-2">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <div className="text-primary small fw-bold text-uppercase mb-1">Inventory Manager</div>
          <h2 className="fw-bold mb-0">Export Movement Report</h2>
          <p className="text-muted mb-0">Download backend-generated movement reports as PDF or Excel for external reporting.</p>
        </div>
        {canExportReports && <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-primary d-flex align-items-center gap-2 shadow-sm"
            onClick={() => handleExport('excel')}
            disabled={loading || Boolean(exporting)}
          >
            {exporting === 'excel' ? <Loader size={18} className="animate-spin" /> : <Download size={18} />}
            Export Excel
          </button>
          <button
            type="button"
            className="btn btn-primary d-flex align-items-center gap-2 shadow-sm"
            onClick={() => handleExport('pdf')}
            disabled={loading || Boolean(exporting)}
          >
            {exporting === 'pdf' ? <Loader size={18} className="animate-spin" /> : <FileText size={18} />}
            Export PDF
          </button>
        </div>}
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="input-group bg-white shadow-sm rounded">
            <span className="input-group-text bg-transparent border-0"><Search size={18} className="text-muted" /></span>
            <input type="text" className="form-control border-0" placeholder="Filter by product, SKU, PO..." 
              value={searchProduct} onChange={e => setSearchProduct(e.target.value)} />
          </div>
        </div>
        <div className="col-md-3">
          <div className="input-group bg-white shadow-sm rounded">
            <span className="input-group-text bg-transparent border-0"><Filter size={18} className="text-muted" /></span>
            <select className="form-select border-0" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="ALL">All Movement Types</option>
              <option value="STOCK_IN">Stock In (+)</option>
              <option value="STOCK_OUT">Stock Out (-)</option>
              <option value="TRANSFER_IN">Transfer In (+)</option>
              <option value="TRANSFER_OUT">Transfer Out (-)</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="WRITE_OFF">Write Off (-)</option>
              <option value="RETURN">Return (+)</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger border-0 shadow-sm mb-4">{error}</div>}

      <div className="card border-0 shadow-sm overflow-hidden">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">Timestamp</th>
                  <th>Product</th>
                  <th>Warehouse</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Reference</th>
                  <th className="pe-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-5"><Loader className="animate-spin mx-auto text-primary" /></td></tr>
                ) : filteredMovements.length > 0 ? (
                  filteredMovements.map(mov => {
                    const style = getTypeStyle(mov.movementType);
                    return (
                      <tr key={mov.movementId}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center gap-2">
                            <Calendar size={14} className="text-muted" />
                            <span className="small fw-medium">{new Date(mov.movementDate).toLocaleString()}</span>
                          </div>
                        </td>
                        <td>
                          <div className="fw-bold">{getProductName(mov.productId)}</div>
                          <div className="text-primary small font-monospace">{getProductSku(mov.productId)}</div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <Package size={14} className="text-muted" />
                            <span className="small">{warehouses[mov.warehouseId] || `Warehouse #${mov.warehouseId}`}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge rounded-pill d-inline-flex align-items-center gap-1 ${style.class}`}>
                            {style.icon} {style.label}
                          </span>
                        </td>
                        <td className={`fw-bold font-monospace ${['STOCK_OUT', 'TRANSFER_OUT', 'WRITE_OFF'].includes(mov.movementType) ? 'text-danger' : 'text-success'}`}>
                          {['STOCK_OUT', 'TRANSFER_OUT', 'WRITE_OFF'].includes(mov.movementType) ? '-' : '+'}{mov.quantity}
                        </td>
                        <td>
                          <div className="badge bg-light text-dark border fw-normal">
                            {getReferenceLabel(mov)}
                          </div>
                        </td>
                        <td className="pe-4 small text-muted font-italic">{mov.notes || '—'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="7" className="text-center py-5 text-muted">No movements match your criteria.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovementsPage;
