import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ProtectedRoute from '../components/ProtectedRoute';
import { canCallEndpoint } from '../utils/permissions';

const setUser = (role) => {
  localStorage.setItem('token', 'test-token');
  localStorage.setItem('user', JSON.stringify({
    userId: 1,
    fullName: 'Test User',
    email: 'test@example.com',
    role
  }));
};

describe('role-based frontend access', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows staff only read-focused navigation links', () => {
    setUser('STAFF');

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Warehouses')).toBeInTheDocument();
    expect(screen.getByText('Movements')).toBeInTheDocument();
    expect(screen.queryByText('Suppliers')).not.toBeInTheDocument();
    expect(screen.queryByText('Reports')).not.toBeInTheDocument();
    expect(screen.getByText('Payments')).toBeInTheDocument();
  });

  it('shows admin management link for admin users', () => {
    setUser('ADMIN');

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Settings')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Payments')).toBeInTheDocument();
  });

  it('opens the payments route from the sidebar for admin users', () => {
    setUser('ADMIN');

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
          <Route path="/payments" element={<div>Payments page opened</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Payments'));

    expect(screen.getByText('Payments page opened')).toBeInTheDocument();
  });

  it('redirects users without required permission to access denied', () => {
    setUser('OFFICER');

    render(
      <MemoryRouter initialEntries={['/reports']}>
        <Routes>
          <Route element={<ProtectedRoute requiredPermission="reports:read" />}>
            <Route path="/reports" element={<div>Reports page</div>} />
          </Route>
          <Route path="/access-denied" element={<div>Access denied page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Access denied page')).toBeInTheDocument();
  });

  it('allows users with required permission through protected route', () => {
    setUser('MANAGER');

    render(
      <MemoryRouter initialEntries={['/reports']}>
        <Routes>
          <Route element={<ProtectedRoute requiredPermission="reports:read" />}>
            <Route path="/reports" element={<div>Reports page</div>} />
          </Route>
          <Route path="/access-denied" element={<div>Access denied page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Reports page')).toBeInTheDocument();
  });

  it('matches backend gateway role rules for important API endpoints', () => {
    expect(canCallEndpoint('STAFF', 'GET', '/products')).toBe(true);
    expect(canCallEndpoint('STAFF', 'POST', '/products')).toBe(false);
    expect(canCallEndpoint('OFFICER', 'POST', '/purchase-orders')).toBe(true);
    expect(canCallEndpoint('MANAGER', 'POST', '/purchase-orders/1/receive')).toBe(false);
    expect(canCallEndpoint('MANAGER', 'PUT', '/purchase-orders/1/approve')).toBe(true);
    expect(canCallEndpoint('OFFICER', 'DELETE', '/suppliers/1')).toBe(false);
    expect(canCallEndpoint('MANAGER', 'GET', '/payments')).toBe(true);
    expect(canCallEndpoint('MANAGER', 'POST', '/payments')).toBe(false);
    expect(canCallEndpoint('STAFF', 'GET', '/payments')).toBe(true);
    expect(canCallEndpoint('STAFF', 'POST', '/payments')).toBe(false);
    expect(canCallEndpoint('STAFF', 'GET', '/alerts/recipient/1')).toBe(true);
    expect(canCallEndpoint('STAFF', 'GET', '/reports')).toBe(false);
  });
});
