import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import DashboardPage from '../pages/dashboard/DashboardPage';
import { warehouseService } from '../services/warehouseService';
import { purchaseService } from '../services/purchaseService';
import { productService } from '../services/productService';
import { movementService } from '../services/movementService';
import { supplierService } from '../services/supplierService';

vi.mock('../services/warehouseService');
vi.mock('../services/purchaseService');
vi.mock('../services/productService');
vi.mock('../services/movementService');
vi.mock('../services/supplierService');

const renderDashboardAs = (role) => {
  localStorage.setItem('token', 'test-token');
  localStorage.setItem('user', JSON.stringify({
    userId: 1,
    fullName: 'Test User',
    email: 'test@example.com',
    role
  }));

  return render(
    <BrowserRouter>
      <DashboardPage />
    </BrowserRouter>
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();

    productService.getAllProducts.mockResolvedValue([
      { productId: 1, name: 'Keyboard', sku: 'SKU-1', costPrice: 100 },
      { productId: 2, name: 'Mouse', sku: 'SKU-2', costPrice: 50 }
    ]);
    warehouseService.getAllWarehouses.mockResolvedValue([
      { warehouseId: 1, name: 'Main Hub', capacity: 100, isActive: true }
    ]);
    warehouseService.getStockByWarehouse.mockResolvedValue([
      { productId: 1, warehouseId: 1, quantity: 5 }
    ]);
    warehouseService.getLowStockItems.mockResolvedValue([
      { productId: 1, warehouseId: 1, quantity: 5, threshold: 20 }
    ]);
    movementService.getAllMovements.mockResolvedValue([]);
    purchaseService.getPOsByStatus.mockResolvedValue([
      { poId: 1, status: 'PENDING_APPROVAL' }
    ]);
    supplierService.getAllSuppliers.mockResolvedValue([
      { supplierId: 1, name: 'Supplier A', active: true }
    ]);
  });

  it('renders read-only dashboard for staff without restricted purchase or supplier calls', async () => {
    renderDashboardAs('STAFF');

    await waitFor(() => {
      expect(screen.getByText('Total Stock Units')).toBeInTheDocument();
      expect(screen.getByText('Product Catalog')).toBeInTheDocument();
    });

    expect(screen.queryByText('Total Inventory Value')).not.toBeInTheDocument();
    expect(screen.getByText('Across readable warehouses')).toBeInTheDocument();
    expect(screen.getByText('View Products')).toBeInTheDocument();
    expect(screen.getByText('View Warehouses')).toBeInTheDocument();
    expect(screen.getByText('Stock Movements')).toBeInTheDocument();
    expect(screen.queryByText('Create Purchase Order')).not.toBeInTheDocument();
    expect(screen.queryByText('Pending Approvals')).not.toBeInTheDocument();
    expect(screen.queryByText(/Failed to load real-time data/i)).not.toBeInTheDocument();
    expect(purchaseService.getPOsByStatus).not.toHaveBeenCalled();
    expect(supplierService.getAllSuppliers).not.toHaveBeenCalled();
  });

  it('renders approval-focused dashboard data for manager users', async () => {
    renderDashboardAs('MANAGER');

    await waitFor(() => {
      expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
    });

    expect(screen.getByText('1 POs')).toBeInTheDocument();
    expect(screen.getByText('Review Purchase Orders')).toBeInTheDocument();
    expect(purchaseService.getPOsByStatus).toHaveBeenCalledWith('PENDING_APPROVAL', { suppressForbiddenRedirect: true });
    expect(supplierService.getAllSuppliers).not.toHaveBeenCalled();
  });
});
