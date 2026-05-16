import React, { useState, useEffect, Suspense } from 'react';
import { Link } from 'react-router-dom';

const LowStockChart = React.lazy(() => import('../../components/LowStockChart'));
import { warehouseService } from '../../services/warehouseService';
import { purchaseService } from '../../services/purchaseService';
import { productService } from '../../services/productService';
import { movementService } from '../../services/movementService';
import { supplierService } from '../../services/supplierService';
import { authService } from '../../services/authService';
import { canCallEndpoint } from '../../utils/permissions';

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  return [];
};

const isActiveRecord = (record) => record?.isActive ?? record?.active ?? true;

const toNumber = (value) => Number(value || 0);

const DashboardPage = () => {
  const user = authService.getCurrentUser();
  const userRole = user?.role;
  const canReadPurchases = canCallEndpoint(userRole, 'GET', '/purchase-orders');
  const canApprovePurchases = canCallEndpoint(userRole, 'PUT', '/purchase-orders/1/approve');
  const canCreatePurchases = canCallEndpoint(userRole, 'POST', '/purchase-orders');
  const canReadSuppliers = canCallEndpoint(userRole, 'GET', '/suppliers');
  const canMoveStock = canCallEndpoint(userRole, 'POST', '/warehouse/stock/transfer') || canCallEndpoint(userRole, 'POST', '/movements');
  const canReadMovements = canCallEndpoint(userRole, 'GET', '/movements');
  const canWriteProducts = canCallEndpoint(userRole, 'POST', '/products');
  const canViewInventoryValue = canCallEndpoint(userRole, 'GET', '/reports') || canApprovePurchases;
  const showSupplierKpi = canReadSuppliers;
  const showPendingApprovals = canReadPurchases && canApprovePurchases;

  const [lowStockItems, setLowStockItems] = useState([]);
  const [pendingPOs, setPendingPOs] = useState([]);
  const [valuation, setValuation] = useState({ totalValuation: 0, totalStock: 0 });
  const [utilization, setUtilization] = useState([]);
  const [movements, setMovements] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const safeFetch = async (label, loader, fallback = []) => {
      try {
        return await loader();
      } catch (err) {
        console.warn(`Dashboard ${label} data unavailable`, err);
        return fallback;
      }
    };

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const [productData, warehouseData] = await Promise.all([
          safeFetch('product', () => productService.getAllProducts({ suppressForbiddenRedirect: true })),
          safeFetch('warehouse', () => warehouseService.getAllWarehouses({ suppressForbiddenRedirect: true }))
        ]);
        const productList = normalizeList(productData);
        const warehouseList = normalizeList(warehouseData);

        const [lowStock, pending, movData, supData] = await Promise.all([
          safeFetch('low stock', () => warehouseService.getLowStockItems(20, { suppressForbiddenRedirect: true })),
          canReadPurchases ? safeFetch('pending purchase order', () => purchaseService.getPOsByStatus('PENDING_APPROVAL', { suppressForbiddenRedirect: true })) : Promise.resolve([]),
          canReadMovements ? safeFetch('movement', () => movementService.getAllMovements({ suppressForbiddenRedirect: true })) : Promise.resolve([]),
          canReadSuppliers ? safeFetch('supplier', () => supplierService.getAllSuppliers({ suppressForbiddenRedirect: true })) : Promise.resolve([])
        ]);

        const productsById = Object.fromEntries(productList.map(product => [Number(product.productId), product]));
        const warehousesById = Object.fromEntries(warehouseList.map(warehouse => [Number(warehouse.warehouseId), warehouse]));
        const activeWarehouses = warehouseList.filter(isActiveRecord);
        const stockResults = await Promise.all(
          activeWarehouses.map(async warehouse => {
            const stockItems = await safeFetch(
              `stock for warehouse ${warehouse.warehouseId}`,
              () => warehouseService.getStockByWarehouse(warehouse.warehouseId, { suppressForbiddenRedirect: true })
            );
            return { warehouse, stockItems: normalizeList(stockItems) };
          })
        );

        const stockByProduct = {};
        const utilizationData = stockResults.map(({ warehouse, stockItems }) => {
          const stockQuantity = stockItems.reduce((sum, item) => sum + toNumber(item.quantity), 0);
          const storedQuantity = stockItems.length > 0 ? stockQuantity : toNumber(warehouse.usedCapacity);
          stockItems.forEach(item => {
            const productId = Number(item.productId);
            if (!productId) return;
            stockByProduct[productId] = (stockByProduct[productId] || 0) + toNumber(item.quantity);
          });

          const totalCapacity = toNumber(warehouse.capacity);
          return {
            warehouseName: warehouse.name,
            utilizationPercentage: totalCapacity > 0 ? (storedQuantity / totalCapacity) * 100 : 0,
            totalQuantity: storedQuantity,
            totalCapacity
          };
        });

        const liveValuation = Object.entries(stockByProduct).reduce((sum, [productId, quantity]) => {
          const product = productsById[Number(productId)];
          return sum + toNumber(quantity) * toNumber(product?.costPrice);
        }, 0);
        const stockTotal = Object.values(stockByProduct).reduce((sum, quantity) => sum + toNumber(quantity), 0);
        const totalStock = stockTotal || utilizationData.reduce((sum, warehouse) => sum + toNumber(warehouse.totalQuantity), 0);

        const readableLowStock = normalizeList(lowStock)
          .map(item => {
            const product = productsById[Number(item.productId)];
            const warehouse = warehousesById[Number(item.warehouseId)];

            return {
              ...item,
              productName: product?.name || item.productName || `Product #${item.productId}`,
              sku: product?.sku || item.sku || `PRD-${String(item.productId || '').padStart(6, '0')}`,
              threshold: item.threshold || 20,
              warehouseName: warehouse?.name || `Warehouse #${item.warehouseId}`
            };
          })
          .sort((a, b) => toNumber(a.quantity) - toNumber(b.quantity));

        if (!isMounted) return;
        setLowStockItems(readableLowStock);
        setPendingPOs(normalizeList(pending));
        setValuation({ totalValuation: liveValuation, totalStock });
        setUtilization(utilizationData);
        setMovements(normalizeList(movData));
        setSuppliers(normalizeList(supData));
        setProducts(productList);
        setWarehouses(warehouseList);
      } catch (err) {
        console.error('Error preparing dashboard data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, [canReadMovements, canReadPurchases, canReadSuppliers]);

  const activeSupplierCount = suppliers.filter(isActiveRecord).length;
  const activeWarehouseCount = warehouses.filter(isActiveRecord).length;
  const writableDashboard = canWriteProducts || canCreatePurchases || canMoveStock;
  const fabTarget = canWriteProducts ? '/products' : canCreatePurchases ? '/purchases' : '/warehouses';

  return (
    <div className="pb-5 container-fluid px-0">
      {/* KPI Section */}
      <div className="row g-4 mb-4">
        {/* Role-aware inventory KPI */}
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card h-100 border-0 shadow-sm rounded-1">
            <div className="card-body d-flex flex-column justify-content-between">
              <div>
                <p className="text-muted text-uppercase fw-bold mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                  {canViewInventoryValue ? 'Total Inventory Value' : 'Total Stock Units'}
                </p>
                <h3 className="mb-0 text-dark fw-bold">
                  {loading
                    ? '...'
                    : canViewInventoryValue
                      ? `₹${valuation?.totalValuation?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}`
                      : valuation.totalStock.toLocaleString()}
                </h3>
              </div>
              <div className="d-flex align-items-center mt-3 text-success">
                <span className="material-symbols-outlined fs-6 fw-bold">inventory_2</span>
                <span className="ms-1" style={{ fontSize: '0.8rem' }}>
                  {loading
                    ? 'Live stock summary'
                    : canViewInventoryValue
                      ? `${valuation.totalStock.toLocaleString()} units at cost price`
                      : 'Across readable warehouses'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Role-aware secondary KPI */}
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card h-100 border-0 shadow-sm rounded-1">
            <div className="card-body d-flex flex-column justify-content-between">
              <div>
                <p className="text-muted text-uppercase fw-bold mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                  {showSupplierKpi ? 'Active Suppliers' : 'Product Catalog'}
                </p>
                <h3 className="mb-0 text-dark fw-bold">
                  {loading ? '...' : showSupplierKpi ? activeSupplierCount : products.length}
                </h3>
              </div>
              <div className="d-flex align-items-center mt-3 text-primary">
                <span className="material-symbols-outlined fs-6">{showSupplierKpi ? 'badge' : 'inventory_2'}</span>
                <span className="ms-1" style={{ fontSize: '0.8rem' }}>
                  {showSupplierKpi ? 'Partnering Vendors' : 'Readable Products'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card h-100 border-danger border border-opacity-50 shadow-sm rounded-1" style={{ backgroundColor: '#fff3f3' }}>
            <div className="card-body d-flex flex-column justify-content-between">
              <div>
                <p className="text-danger text-uppercase fw-bold mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                  Low Stock Alerts
                </p>
                <h3 className="mb-0 text-danger fw-bold">
                  {loading ? '...' : `${lowStockItems.length} alerts`}
                </h3>
              </div>
              <div className="d-flex align-items-center mt-3 text-danger fw-bold">
                <span className="material-symbols-outlined fs-6" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                <span className="ms-1" style={{ fontSize: '0.75rem' }}>
                  {lowStockItems.length > 0 ? 'ACTION REQUIRED' : 'ALL CLEAR'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Permission-aware activity KPI */}
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card h-100 border-0 shadow-sm rounded-1">
            <div className="card-body d-flex flex-column justify-content-between">
              <div>
                <p className="text-muted text-uppercase fw-bold mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                  {showPendingApprovals ? 'Pending Approvals' : 'Warehouses'}
                </p>
                <h3 className="mb-0 text-dark fw-bold">
                  {loading ? '...' : showPendingApprovals ? `${pendingPOs.length} POs` : activeWarehouseCount}
                </h3>
              </div>
              <div className="d-flex align-items-center mt-3 text-primary">
                <span className="material-symbols-outlined fs-6">{showPendingApprovals ? 'schedule' : 'warehouse'}</span>
                <span className="ms-1" style={{ fontSize: '0.8rem' }}>
                  {showPendingApprovals ? 'Needs Attention' : 'Readable Locations'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section */}
      <div className="row g-4 mb-4">
        {/* Critical Alerts Table */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-1 h-100">
            <div className="card-header bg-light border-bottom d-flex justify-content-between align-items-center py-3">
              <h5 className="mb-0 text-primary fw-semibold fs-6">Critical Inventory Alerts</h5>
              <Link to="/warehouses" className="btn btn-link btn-sm text-decoration-none fw-bold text-uppercase p-0" style={{ fontSize: '0.75rem' }}>
                VIEW ALL
              </Link>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light text-secondary text-uppercase" style={{ fontSize: '0.75rem' }}>
                  <tr>
                    <th className="py-3 px-3 fw-semibold border-bottom-0">Status</th>
                    <th className="py-3 px-3 fw-semibold border-bottom-0">SKU</th>
                    <th className="py-3 px-3 fw-semibold border-bottom-0">Product Name</th>
                    <th className="py-3 px-3 fw-semibold border-bottom-0">Warehouse</th>
                    <th className="py-3 px-3 fw-semibold border-bottom-0 text-end">Stock</th>
                    <th className="py-3 px-3 fw-semibold border-bottom-0 text-end">Threshold</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.875rem' }}>
                  {lowStockItems.length > 0 ? (
                    lowStockItems.slice(0, 5).map((item, index) => (
                      <tr key={index}>
                        <td className="px-3">
                          <span
                            className={`badge rounded-pill ${item.quantity < 5 ? 'bg-danger' : 'bg-warning text-dark'}`}
                            style={{ fontSize: '0.65rem' }}
                          >
                            {item.quantity < 5 ? 'CRITICAL' : 'WARNING'}
                          </span>
                        </td>
                        <td className="px-3 font-monospace text-primary">{item.sku}</td>
                        <td className="px-3 fw-semibold">{item.productName}</td>
                        <td className="px-3 text-muted">{item.warehouseName}</td>
                        <td className={`px-3 text-end fw-bold ${item.quantity < 5 ? 'text-danger' : 'text-warning'}`}>
                          {item.quantity}
                        </td>
                        <td className="px-3 text-end text-muted">{item.threshold || 20}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-muted small">
                        {loading ? 'Fetching live alerts...' : 'No low stock alerts found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Actions & Warehouse */}
        <div className="col-12 col-lg-4 d-flex flex-column gap-4">

          {/* Quick Actions */}
          <div className="card border-0 shadow-sm rounded-1">
            <div className="card-body p-4">
              <h5 className="mb-4 text-primary fw-semibold fs-6">Quick Actions</h5>
              <div className="d-grid gap-3">
                <Link to="/products" className="btn btn-primary d-flex justify-content-between align-items-center py-2 px-3 shadow-none">
                  <div className="d-flex align-items-center gap-2">
                    <span className="material-symbols-outlined fs-5">{canWriteProducts ? 'add_box' : 'inventory_2'}</span>
                    <span className="fw-semibold text-white" style={{ fontSize: '0.875rem' }}>
                      {canWriteProducts ? 'Manage Products' : 'View Products'}
                    </span>
                  </div>
                  <span className="material-symbols-outlined fs-6 text-white">chevron_right</span>
                </Link>

                <Link to="/warehouses" className="btn btn-light border d-flex justify-content-between align-items-center py-2 px-3 shadow-none">
                  <div className="d-flex align-items-center gap-2">
                    <span className="material-symbols-outlined fs-5 text-secondary">warehouse</span>
                    <span className="fw-semibold text-dark" style={{ fontSize: '0.875rem' }}>
                      {canMoveStock ? 'Manage Warehouses' : 'View Warehouses'}
                    </span>
                  </div>
                  <span className="material-symbols-outlined fs-6 text-secondary">chevron_right</span>
                </Link>

                {canReadPurchases && (
                  <Link to="/purchases" className="btn btn-light border d-flex justify-content-between align-items-center py-2 px-3 shadow-none">
                    <div className="d-flex align-items-center gap-2">
                      <span className="material-symbols-outlined fs-5 text-secondary">receipt_long</span>
                      <span className="fw-semibold text-dark" style={{ fontSize: '0.875rem' }}>
                        {canCreatePurchases ? 'Create Purchase Order' : showPendingApprovals ? 'Review Purchase Orders' : 'View Purchase Orders'}
                      </span>
                    </div>
                    <span className="material-symbols-outlined fs-6 text-secondary">chevron_right</span>
                  </Link>
                )}

                {canReadMovements && (
                  <Link to="/movements" className="btn btn-light border d-flex justify-content-between align-items-center py-2 px-3 shadow-none">
                    <div className="d-flex align-items-center gap-2">
                      <span className="material-symbols-outlined fs-5 text-secondary">{canMoveStock ? 'move_up' : 'sync_alt'}</span>
                      <span className="fw-semibold text-dark" style={{ fontSize: '0.875rem' }}>
                        {canMoveStock ? 'Stock Transfers' : 'Stock Movements'}
                      </span>
                    </div>
                    <span className="material-symbols-outlined fs-6 text-secondary">chevron_right</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Warehouse Status Card */}
          <div className="card rounded-1 border-0 flex-grow-1" style={{ backgroundColor: '#002855', color: 'white' }}>
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 className="fw-semibold mb-1">
                    {utilization[0]?.warehouseName || 'Main Hub Logistics'}
                  </h6>
                  <p className="text-info text-uppercase fw-bold mb-0" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>
                    Operational Status
                  </p>
                </div>
                <span className="material-symbols-outlined text-success">check_circle</span>
              </div>
              <div className="mt-4">
                <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.75rem' }}>
                  <span className="text-white-50">Capacity Utilization</span>
                  <span className="fw-bold">
                    {loading ? '...' : Math.round(utilization[0]?.utilizationPercentage || 0)}%
                  </span>
                </div>
                <div className="progress" style={{ height: '6px', backgroundColor: '#00152e' }}>
                  <div
                    className="progress-bar bg-success"
                    role="progressbar"
                    style={{ width: `${utilization[0]?.utilizationPercentage || 0}%` }}
                    aria-valuenow={utilization[0]?.utilizationPercentage || 0}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Stock Movement Chart */}
      <Suspense fallback={<div className="card border-0 shadow-sm rounded-1 mb-4 p-5 text-center text-muted"><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading chart...</div>}>
        <LowStockChart movements={movements} />
      </Suspense>

      {/* Contextual FAB */}
      {writableDashboard && (
        <Link
          to={fabTarget}
          className="btn btn-primary rounded-circle shadow position-fixed d-flex align-items-center justify-content-center"
          style={{ width: '56px', height: '56px', bottom: '30px', right: '30px', zIndex: 1050 }}
          aria-label="Open dashboard action"
        >
          <span className="material-symbols-outlined fs-4">add</span>
        </Link>
      )}
    </div>
  );
};

export default DashboardPage;
