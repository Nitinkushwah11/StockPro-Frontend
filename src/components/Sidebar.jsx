import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Box, Warehouse, ShoppingCart, CreditCard, Users, ArrowRightLeft, FileBarChart, BarChart2, Settings } from 'lucide-react';
import { authService } from '../services/authService';
import { canCallEndpoint } from '../utils/permissions';
import '../layouts/Layout.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const userRole = user ? user.role : null;

  const canAccessPurchases = canCallEndpoint(userRole, 'GET', '/purchase-orders');
  const canAccessPayments = canCallEndpoint(userRole, 'GET', '/payments');
  const canAccessSuppliers = canCallEndpoint(userRole, 'GET', '/suppliers');
  const canAccessReports = canCallEndpoint(userRole, 'GET', '/reports');
  const canAccessAdmin = canCallEndpoint(userRole, 'GET', '/auth/users');

  return (
    <div className="sidebar py-3 d-flex flex-column">
      <div className="px-4 mb-4 mt-2">
        <h4 className="fw-bold m-0 text-white tracking-tight">StockPro</h4>
        <span className="small text-muted" style={{ fontSize: '11px', opacity: 0.6, letterSpacing: '0.5px' }}>INVENTORY SYSTEM</span>
      </div>
      
      <ul className="nav flex-column mb-auto">
        <li className="nav-item">
          <NavLink to="/dashboard" className="nav-link" end>
            <LayoutDashboard size={20} /> <span className="nav-text">Dashboard</span>
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/products" className="nav-link">
            <Box size={20} /> <span className="nav-text">Products</span>
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink to="/warehouses" className="nav-link">
            <Warehouse size={20} /> <span className="nav-text">Warehouses</span>
          </NavLink>
        </li>
        {canAccessPurchases && (
            <li className="nav-item">
              <NavLink to="/purchases" className="nav-link">
                <ShoppingCart size={20} /> <span className="nav-text">Purchases</span>
              </NavLink>
            </li>
        )}
        {canAccessPayments && (
            <li className="nav-item">
              <NavLink
                to="/payments"
                className="nav-link"
                onClick={(event) => {
                  event.preventDefault();
                  navigate('/payments');
                }}
              >
                <CreditCard size={20} /> <span className="nav-text">Payments</span>
              </NavLink>
            </li>
        )}
        <li className="nav-item">
          <NavLink to="/movements" className="nav-link">
            <ArrowRightLeft size={20} /> <span className="nav-text">Movements</span>
          </NavLink>
        </li>
        {canAccessSuppliers && (
          <>
            <li className="nav-item">
              <NavLink to="/suppliers" className="nav-link" end>
                <Users size={20} /> <span className="nav-text">Suppliers</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/suppliers/dashboard" className="nav-link">
                <BarChart2 size={20} /> <span className="nav-text">Vendor Analytics</span>
              </NavLink>
            </li>
          </>
        )}
        {canAccessReports && (
          <li className="nav-item">
            <NavLink to="/reports" className="nav-link">
              <FileBarChart size={20} /> <span className="nav-text">Reports</span>
            </NavLink>
          </li>
        )}
        {canAccessAdmin && (
          <li className="nav-item">
            <NavLink to="/admin/settings" className="nav-link">
              <Settings size={20} /> <span className="nav-text">Admin Settings</span>
            </NavLink>
          </li>
        )}
      </ul>
    </div>
  );
};

export default Sidebar;
