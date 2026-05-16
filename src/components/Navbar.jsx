import React, { useState, useRef, useEffect } from 'react';
import { Bell, User, LogOut, Settings, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { alertService } from '../services/alertService';
import { productService } from '../services/productService';
import { warehouseService } from '../services/warehouseService';
import { canCallEndpoint } from '../utils/permissions';

const Navbar = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const displayName = user ? user.fullName : "User";

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  const isConnectionTestAlert = (alert) => {
    const title = (alert.title || '').toLowerCase();
    const message = (alert.message || '').toLowerCase();
    return title.includes('connection test') || message.includes('notification system is connected');
  };

  const normalizeAlert = (alert) => ({
    ...alert,
    alertId: `alert-${alert.alertId}`,
    sourceAlertId: alert.alertId,
    read: alert.read ?? alert.isRead ?? false,
    createdAt: alert.createdAt || new Date().toISOString()
  });

  const buildProductLowStockNotifications = (products = []) => {
    return products
      .filter((product) => Number(product.reorderLevel || 0) > 0)
      .slice(0, 5)
      .map((product) => ({
        alertId: `product-low-${product.productId}`,
        read: false,
        severity: 'WARNING',
        title: 'Low Stock Product',
        message: `${product.name || product.sku || 'Product'} has reorder level ${product.reorderLevel}. Check warehouse stock before new orders.`,
        createdAt: product.updatedAt || product.createdAt || new Date().toISOString(),
        dynamic: true
      }));
  };

  const buildWarehouseNotifications = (warehouses = []) => {
    return warehouses
      .filter((warehouse) => {
        const capacity = Number(warehouse.capacity || 0);
        const used = Number(warehouse.usedCapacity || 0);
        return capacity > 0 && used >= capacity * 0.8;
      })
      .slice(0, 5)
      .map((warehouse) => {
        const capacity = Number(warehouse.capacity || 0);
        const used = Number(warehouse.usedCapacity || 0);
        const usage = Math.round((used / capacity) * 100);
        return {
          alertId: `warehouse-capacity-${warehouse.warehouseId}`,
          read: false,
          severity: usage >= 95 ? 'CRITICAL' : 'WARNING',
          title: 'Warehouse Capacity Alert',
          message: `${warehouse.name || 'Warehouse'} is ${usage}% full (${used}/${capacity} units).`,
          createdAt: warehouse.updatedAt || warehouse.createdAt || new Date().toISOString(),
          dynamic: true
        };
      });
  };

  const sortByNewest = (items) => {
    return [...items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user || !user.userId) return;
    try {
      const [serverAlerts, lowStockProducts, warehouses] = await Promise.all([
        alertService.getByRecipient(user.userId, { suppressForbiddenRedirect: true }).catch(() => []),
        productService.getLowStockProducts({ suppressForbiddenRedirect: true }).catch(() => []),
        warehouseService.getAllWarehouses({ suppressForbiddenRedirect: true }).catch(() => [])
      ]);

      const databaseAlerts = serverAlerts
        .filter((alert) => !isConnectionTestAlert(alert))
        .map(normalizeAlert);

      const dynamicAlerts = [
        ...buildProductLowStockNotifications(lowStockProducts),
        ...buildWarehouseNotifications(warehouses)
      ];

      const nextNotifications = sortByNewest([...dynamicAlerts, ...databaseAlerts]).slice(0, 10);
      setNotifications(nextNotifications);
      setUnreadCount(nextNotifications.filter((notification) => !notification.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAsRead = async (alertId) => {
    const notification = notifications.find((item) => item.alertId === alertId);
    if (!notification || notification.dynamic) return;
    if (!window.confirm('Mark this database notification as read?')) return;

    try {
      await alertService.markAsRead(notification.sourceAlertId);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user || !user.userId) return;
    if (!window.confirm('Mark all database notifications as read?')) return;

    try {
      await alertService.markAllRead(user.userId);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return '#ef4444'; // red
      case 'WARNING': return '#f59e0b'; // orange
      case 'INFO': return '#3b82f6'; // blue
      case 'SUCCESS': return '#10b981'; // green
      default: return '#6b7280'; // gray
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleProfile = () => {
    setShowUserMenu(false);
    setShowProfile(true);
  };

  const handleSettings = () => {
    setShowUserMenu(false);
    navigate(canCallEndpoint(user?.role, 'GET', '/auth/users') ? '/admin/settings' : '/dashboard');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white px-4 py-2 border-bottom shadow-sm">
      <div className="container-fluid">
        <span className="navbar-brand mb-0 h1 fw-bold text-primary d-lg-none">StockPro</span>
        
        <div className="d-flex ms-auto align-items-center gap-3">
          
          {/* Notification Bell */}
          <div className="position-relative" ref={notifRef}>
            <button 
              className="btn btn-light position-relative rounded-circle p-2"
              onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
            >
              <Bell size={20} className="text-secondary" />
              {unreadCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65em' }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="position-absolute end-0 mt-2 shadow-lg border-0 rounded-3 bg-white" style={{ width: '320px', zIndex: 1050 }}>
                <div className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 fw-bold">Notifications</h6>
                  {unreadCount > 0 && (
                    <button 
                      className="btn btn-sm btn-link text-decoration-none p-0" 
                      style={{ fontSize: '0.75rem' }}
                      onClick={handleMarkAllRead}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div className="px-3 py-4 text-center text-muted small">
                      No notifications
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.alertId} 
                        className={`px-3 py-2 border-bottom d-flex align-items-start gap-2 ${!n.read ? 'bg-light' : ''}`} 
                        style={{ cursor: n.dynamic || n.read ? 'default' : 'pointer' }}
                        onClick={() => !n.read && handleMarkAsRead(n.alertId)}
                      >
                        <span className="mt-1 rounded-circle d-inline-block" style={{ 
                          width: '8px', height: '8px', minWidth: '8px',
                          backgroundColor: getSeverityColor(n.severity)
                        }}></span>
                        <div className="flex-grow-1">
                          <p className={`mb-0 small ${!n.read ? 'fw-bold' : ''}`}>{n.title}</p>
                          <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>{n.message}</p>
                          <small className="text-muted">{formatTimeAgo(n.createdAt)}</small>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-3 py-2 text-center">
                  <button className="btn btn-sm btn-link text-decoration-none">View All Activity</button>
                </div>
              </div>
            )}
          </div>
          
          {/* User Dropdown */}
          <div className="position-relative" ref={userMenuRef}>
            <button 
              className="btn btn-light rounded-pill px-3 py-2 d-flex align-items-center gap-2"
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
            >
              <User size={18} />
              <span className="fw-medium small d-none d-md-block">{displayName}</span>
            </button>

            {showUserMenu && (
              <div className="position-absolute end-0 mt-2 shadow-lg border-0 rounded-3 bg-white py-1" style={{ width: '200px', zIndex: 1050 }}>
                <button className="dropdown-item d-flex align-items-center gap-2 px-3 py-2" onClick={handleProfile}>
                  <UserCircle size={16} /> Profile
                </button>
                <button className="dropdown-item d-flex align-items-center gap-2 px-3 py-2" onClick={handleSettings}>
                  <Settings size={16} /> Settings
                </button>
                <hr className="dropdown-divider my-1" />
                <button 
                  className="dropdown-item text-danger d-flex align-items-center gap-2 px-3 py-2"
                  onClick={handleLogout}
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showProfile && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={() => setShowProfile(false)}>
          <div className="modal-dialog modal-dialog-centered modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Profile</h5>
                <button type="button" className="btn-close" onClick={() => setShowProfile(false)} />
              </div>
              <div className="modal-body">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
                    <UserCircle size={28} />
                  </div>
                  <div>
                    <div className="fw-bold">{user?.fullName || 'User'}</div>
                    <div className="text-muted small">{user?.role || 'No role'}</div>
                  </div>
                </div>
                <div className="border rounded-3 overflow-hidden">
                  <div className="px-3 py-2 border-bottom">
                    <div className="text-muted small">User ID</div>
                    <div className="fw-medium">{user?.userId || '-'}</div>
                  </div>
                  <div className="px-3 py-2">
                    <div className="text-muted small">Email</div>
                    <div className="fw-medium text-break">{user?.email || '-'}</div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button className="btn btn-primary w-100" onClick={() => setShowProfile(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
