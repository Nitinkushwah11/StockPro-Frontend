import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, AlertTriangle, IndianRupee, RefreshCcw, Loader, PieChart, Activity, Layers, ArrowUpCircle, FileText } from 'lucide-react';
import { warehouseService } from '../../services/warehouseService';
import { productService } from '../../services/productService';
import { movementService } from '../../services/movementService';
import { reportService } from '../../services/reportService';

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  return [];
};

const isActiveRecord = (record) => record?.isActive ?? record?.active ?? true;

const toNumber = (value) => Number(value || 0);

const ReportsPage = () => {
  const [valuation, setValuation] = useState({ totalValuation: 0, totalStock: 0 });
  const [productPerformance, setProductPerformance] = useState([]);
  const [utilization, setUtilization] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const [productsData, movementsData, whData] = await Promise.all([
          productService.getAllProducts({ suppressForbiddenRedirect: true }),
          movementService.getAllMovements({ suppressForbiddenRedirect: true }).catch(() => []),
          warehouseService.getAllWarehouses({ suppressForbiddenRedirect: true })
        ]);
        const productsList = normalizeList(productsData);
        const movementsList = normalizeList(movementsData);
        const warehouseList = normalizeList(whData);

        const productsById = Object.fromEntries(productsList.map(product => [Number(product.productId), product]));
        const stockByProduct = {};
        const activeWarehouses = warehouseList.filter(isActiveRecord);
        const utilizationData = await Promise.all(
          activeWarehouses.map(async warehouse => {
            let stockItems = [];
            try {
              stockItems = normalizeList(await warehouseService.getStockByWarehouse(warehouse.warehouseId, { suppressForbiddenRedirect: true }));
            } catch (stockErr) {
              console.warn(`Could not load stock for warehouse ${warehouse.warehouseId}`, stockErr);
            }

            const stockQuantity = stockItems.reduce((sum, item) => sum + toNumber(item.quantity), 0);
            const totalQuantity = stockItems.length > 0 ? stockQuantity : toNumber(warehouse.usedCapacity);
            stockItems.forEach(item => {
              const productId = Number(item.productId);
              if (!productId) return;
              stockByProduct[productId] = (stockByProduct[productId] || 0) + toNumber(item.quantity);
            });
            const totalCapacity = toNumber(warehouse.capacity);
            const utilizationPercentage = totalCapacity > 0 ? (totalQuantity / totalCapacity) * 100 : 0;

            return {
              warehouseId: warehouse.warehouseId,
              warehouseName: warehouse.name,
              location: warehouse.location,
              totalQuantity,
              totalCapacity,
              utilizationPercentage
            };
          })
        );

        const totalValuation = Object.entries(stockByProduct).reduce((sum, [productId, quantity]) => {
          const product = productsById[Number(productId)];
          return sum + (toNumber(quantity) * toNumber(product?.costPrice));
        }, 0);

        const movementStats = movementsList.reduce((stats, movement) => {
          const productId = Number(movement.productId);
          if (!stats[productId]) {
            stats[productId] = {
              productId,
              movedQuantity: 0,
              stockInQuantity: 0,
              stockOutQuantity: 0,
              movementDates: []
            };
          }

          const quantity = toNumber(movement.quantity);
          stats[productId].movedQuantity += Math.abs(quantity);
          if (movement.movementType === 'STOCK_OUT') {
            stats[productId].stockOutQuantity += Math.abs(quantity);
          } else {
            stats[productId].stockInQuantity += Math.abs(quantity);
          }

          const date = new Date(movement.movementDate);
          if (!Number.isNaN(date.getTime())) stats[productId].movementDates.push(date);
          return stats;
        }, {});

        const productIds = new Set([
          ...productsList.map(product => Number(product.productId)),
          ...Object.keys(stockByProduct).map(Number),
          ...Object.keys(movementStats).map(Number)
        ]);

        const performanceData = Array.from(productIds)
          .map(productId => {
            const product = productsById[productId];
            const stats = movementStats[productId] || { movedQuantity: 0, stockInQuantity: 0, stockOutQuantity: 0, movementDates: [] };
            const currentStock = toNumber(stockByProduct[productId]);
            const stockValue = currentStock * toNumber(product?.costPrice);
            const dates = stats.movementDates;
            const periodDays = dates.length > 1
              ? Math.max(1, Math.ceil((Math.max(...dates) - Math.min(...dates)) / 86400000) + 1)
              : 1;
            const movementPerDay = stats.movedQuantity / periodDays;
            const turnoverRate = currentStock > 0 ? stats.movedQuantity / currentStock : 0;

            return {
              productId,
              name: product?.name || `Product #${productId}`,
              sku: product?.sku || `PRD-${String(productId).padStart(6, '0')}`,
              currentStock,
              stockValue,
              movedQuantity: stats.movedQuantity,
              movementPerDay,
              turnoverRate
            };
          })
          .filter(item => item.currentStock > 0 || item.movedQuantity > 0)
          .sort((a, b) => b.movementPerDay - a.movementPerDay || b.stockValue - a.stockValue);

        setValuation({
          totalValuation,
          totalStock: Object.values(stockByProduct).reduce((sum, quantity) => sum + toNumber(quantity), 0)
        });
        setProductPerformance(performanceData);
        setUtilization(utilizationData);
        setWarehouses(activeWarehouses);
      } catch (err) {
        console.error('Error fetching report data:', err);
        setError('Failed to load analytical reports. Ensure report-service is active.');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  const mostStockWarehouse = utilization.reduce(
    (top, warehouse) => warehouse.totalQuantity > (top?.totalQuantity || 0) ? warehouse : top,
    null
  );
  const averageUtilization = utilization.length
    ? Math.round(utilization.reduce((acc, c) => acc + c.utilizationPercentage, 0) / utilization.length)
    : 0;
  const averageTurnover = productPerformance.length
    ? productPerformance.reduce((acc, product) => acc + product.turnoverRate, 0) / productPerformance.length
    : 0;
  const formatCurrency = value => `₹${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleMovementReportExport = async (format) => {
    try {
      setExporting(format);
      setError(null);
      if (format === 'pdf') {
        await reportService.downloadMovementReportPdf();
      } else {
        await reportService.downloadMovementReportExcel();
      }
    } catch (err) {
      console.error('Movement report export failed:', err);
      setError('Failed to download movement report. Admin or Manager access is required.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="container-fluid py-2">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Analytics & Intelligence</h2>
          <p className="text-muted mb-0">Financial insights and operational efficiency metrics.</p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-primary d-flex align-items-center gap-2 shadow-sm"
            onClick={() => handleMovementReportExport('excel')}
            disabled={loading || Boolean(exporting)}
          >
            {exporting === 'excel' ? <Loader size={18} className="animate-spin" /> : <Download size={18} />}
            Export Excel
          </button>
          <button
            type="button"
            className="btn btn-primary d-flex align-items-center gap-2 shadow-sm"
            onClick={() => handleMovementReportExport('pdf')}
            disabled={loading || Boolean(exporting)}
          >
            {exporting === 'pdf' ? <Loader size={18} className="animate-spin" /> : <FileText size={18} />}
            Export PDF
          </button>
          <button className="btn btn-outline-primary d-flex align-items-center gap-2 shadow-sm">
            <Activity size={18} /> Real-time View
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger border-0 shadow-sm mb-4">{error}</div>}

      {/* KPI Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm bg-primary text-white h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <p className="text-white-50 text-uppercase small fw-bold mb-0">Inventory Valuation</p>
                <IndianRupee size={20} className="text-white-50" />
              </div>
              <h3 className="fw-bold mb-0">
                {loading ? '...' : formatCurrency(valuation.totalValuation)}
              </h3>
              <p className="small text-white-50 mt-2 mb-0">{valuation.totalStock.toLocaleString()} units valued at cost price</p>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100 border-start border-4 border-success">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <p className="text-muted text-uppercase small fw-bold mb-0">Avg. Turnover Rate</p>
                <RefreshCcw size={20} className="text-success" />
              </div>
              <h3 className="fw-bold mb-0">
                {loading ? '...' : averageTurnover.toFixed(2)}x
              </h3>
              <p className="small text-success mt-2 mb-0">Moved quantity / current stock</p>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100 border-start border-4 border-info">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <p className="text-muted text-uppercase small fw-bold mb-0">Active Warehouses</p>
                <Layers size={20} className="text-info" />
              </div>
              <h3 className="fw-bold mb-0">{warehouses.length}</h3>
              <p className="small text-muted mt-2 mb-0">
                {mostStockWarehouse ? `Most stock: ${mostStockWarehouse.warehouseName}` : 'Active storage locations'}
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100 border-start border-4 border-warning">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <p className="text-muted text-uppercase small fw-bold mb-0">Avg. Utilization</p>
                <PieChart size={20} className="text-warning" />
              </div>
              <h3 className="fw-bold mb-0">
                {loading ? '...' : averageUtilization}%
              </h3>
              <p className="small text-muted mt-2 mb-0">
                {mostStockWarehouse ? `${mostStockWarehouse.totalQuantity.toLocaleString()} / ${mostStockWarehouse.totalCapacity.toLocaleString()} in top warehouse` : 'Global storage capacity used'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Turnover Table */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom pt-4 pb-3">
              <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <TrendingUp size={20} className="text-primary" /> Product Performance (Velocity)
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="px-4">Product</th>
                      <th>Current Stock</th>
                      <th>Stock Value</th>
                      <th>Movement / Day</th>
                      <th>Turnover</th>
                      <th>Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="6" className="text-center py-5"><Loader className="animate-spin mx-auto" /></td></tr>
                    ) : productPerformance.length > 0 ? productPerformance.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4">
                          <div className="fw-bold">{item.name}</div>
                          <div className="text-primary small font-monospace">{item.sku}</div>
                        </td>
                        <td className="fw-bold">{item.currentStock.toLocaleString()}</td>
                        <td className="fw-bold">{formatCurrency(item.stockValue)}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <ArrowUpCircle size={14} className="text-success" />
                            {item.movementPerDay.toFixed(2)}
                          </div>
                        </td>
                        <td>{item.turnoverRate.toFixed(2)}x</td>
                        <td>
                          <span className={`badge rounded-pill ${
                            item.movementPerDay > 5
                              ? 'bg-success-subtle text-success'
                              : item.movementPerDay > 0
                                ? 'bg-warning-subtle text-warning'
                                : 'bg-secondary-subtle text-secondary'
                          }`}>
                            {item.movementPerDay > 5 ? 'Fast Mover' : item.movementPerDay > 0 ? 'Active' : 'No Movement'}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="6" className="text-center py-5 text-muted">No stock or movement data found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        
        {/* Warehouse Utilization */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom pt-4 pb-3">
              <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <PieChart size={20} className="text-info" /> Warehouse Utilization
              </h5>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-5"><Loader className="animate-spin mx-auto" /></div>
              ) : utilization.length === 0 ? (
                <div className="text-center py-5 text-muted">No active warehouse data found.</div>
              ) : utilization
                .sort((a, b) => b.totalQuantity - a.totalQuantity)
                .map((wh, idx) => (
                <div key={idx} className="mb-4 last-child-mb-0">
                  <div className="d-flex justify-content-between mb-1 small">
                    <span>
                      <span className="fw-bold">{wh.warehouseName}</span>
                      {idx === 0 && <span className="badge bg-primary-subtle text-primary ms-2">Most Stock</span>}
                    </span>
                    <span className="text-muted">{Math.round(wh.utilizationPercentage)}% Used</span>
                  </div>
                  <div className="progress" style={{height: '10px'}}>
                    <div 
                      className={`progress-bar ${wh.utilizationPercentage > 85 ? 'bg-danger' : wh.utilizationPercentage > 60 ? 'bg-warning' : 'bg-success'}`}
                      style={{width: `${Math.min(wh.utilizationPercentage, 100)}%`}}
                    ></div>
                  </div>
                  <div className="small text-muted mt-1">
                    {wh.totalQuantity.toLocaleString()} stored / {wh.totalCapacity.toLocaleString()} capacity
                  </div>
                </div>
              ))}
              
              <div className="mt-4 p-3 bg-light rounded-3 border">
                <h6 className="fw-bold small mb-2 d-flex align-items-center gap-2">
                  <AlertTriangle size={14} className="text-warning" /> Efficiency Note
                </h6>
                <p className="small text-muted mb-0">
                  Warehouses above 85% capacity may experience slower pick/pack times. Consider load balancing stock to underutilized locations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
