import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Shield, Bell, History, Plus, Save, Key, Loader, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services/authService';
import { movementService } from '../../services/movementService';

const AdminSettingsPage = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const currentUser = authService.getCurrentUser();
  
  // Data state
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Form states
  const [profileForm, setProfileForm] = useState({
    fullName: currentUser?.fullName || '',
    email: currentUser?.email || '',
    phone: '',
    department: ''
  });

  const [pwdForm, setPwdForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [createUserForm, setCreateUserForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: '',
    phone: '',
    department: 'General'
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showCreatePwd, setShowCreatePwd] = useState(false);

  React.useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await authService.getAllUsers();
      setUsers(data);
    } catch (err) { setErrorMsg('Failed to fetch users'); }
    setLoading(false);
  };

  const fetchLogs = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await movementService.getAllMovements();
      // Backend returns a plain array of movements
      const movements = Array.isArray(data) ? data : (data.content || []);
      const formattedLogs = movements.slice(0, 50).map(m => ({
        id: m.movementId,
        action: `${m.movementType}: ${m.quantity} units`,
        module: m.referenceType || 'Inventory',
        timestamp: new Date(m.movementDate).toLocaleString(),
        actor: m.performedBy ? `User #${m.performedBy}` : 'System'
      }));
      setAuditLogs(formattedLogs);
    } catch (err) { setErrorMsg('Failed to fetch audit logs'); }
    setLoading(false);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.updateProfile(currentUser.userId, profileForm);
      setSuccessMsg('Profile updated successfully!');
    } catch (err) { setErrorMsg('Profile update failed'); }
    setLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authService.changePassword(currentUser.userId, pwdForm.newPassword);
      setSuccessMsg('Password changed successfully!');
      setPwdForm({ newPassword: '', confirmPassword: '' });
    } catch (err) { setErrorMsg('Password change failed'); }
    setLoading(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.register(createUserForm);
      setSuccessMsg('New account created!');
      fetchUsers();
    } catch (err) { setErrorMsg('Failed to create account'); }
    setLoading(false);
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this user?')) return;
    try {
      await authService.deactivateUser(id);
      setSuccessMsg('User deactivated');
      fetchUsers();
    } catch (err) { setErrorMsg('Deactivation failed'); }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('PERMANENTLY DELETE this user? This cannot be undone.')) return;
    try {
      await authService.deleteUser(id);
      setSuccessMsg('User permanently deleted');
      fetchUsers();
    } catch (err) { 
      const msg = err.response?.data?.error || err.response?.data?.message || 'Deletion failed';
      setErrorMsg(msg); 
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await authService.updateRole(userId, newRole);
      setSuccessMsg(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (err) {
      setErrorMsg('Failed to update role');
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h3 mb-0 text-primary fw-bold">Profile & Admin Settings</h2>
      </div>

      {successMsg && (
        <div className="alert alert-success border-0 shadow-sm mb-4 d-flex align-items-center gap-2">
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="alert alert-danger border-0 shadow-sm mb-4 d-flex align-items-center gap-2">
          <AlertCircle size={18} /> {errorMsg}
        </div>
      )}

      <div className="row">
        {/* Navigation Sidebar */}
        <div className="col-md-3 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-0">
              <div className="list-group list-group-flush rounded">
                <button 
                  className={`list-group-item list-group-item-action d-flex align-items-center gap-3 py-3 ${activeTab === 'profile' ? 'active bg-primary text-white' : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  <User size={20} /> My Profile
                </button>
                {currentUser?.role === 'ADMIN' && (
                  <>
                    <button 
                      className={`list-group-item list-group-item-action d-flex align-items-center gap-3 py-3 ${activeTab === 'users' ? 'active bg-primary text-white' : ''}`}
                      onClick={() => setActiveTab('users')}
                    >
                      <Shield size={20} /> User Management
                    </button>
                  </>
                )}
                <button 
                  className={`list-group-item list-group-item-action d-flex align-items-center gap-3 py-3 ${activeTab === 'alerts' ? 'active bg-primary text-white' : ''}`}
                  onClick={() => setActiveTab('alerts')}
                >
                  <Bell size={20} /> Alert Preferences
                </button>
                {currentUser?.role === 'ADMIN' && (
                  <button 
                    className={`list-group-item list-group-item-action d-flex align-items-center gap-3 py-3 ${activeTab === 'logs' ? 'active bg-primary text-white' : ''}`}
                    onClick={() => setActiveTab('logs')}
                  >
                    <History size={20} /> Audit Logs
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="col-md-9">
          
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="card-title mb-0">My Profile</h5>
              </div>
              <div className="card-body p-4">
                <form onSubmit={handleUpdateProfile}>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label text-muted fw-semibold small text-uppercase">Full Name</label>
                      <input type="text" className="form-control" value={profileForm.fullName} onChange={e => setProfileForm({...profileForm, fullName: e.target.value})} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted fw-semibold small text-uppercase">Email Address</label>
                      <input type="email" className="form-control" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} />
                    </div>
                  </div>
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <label className="form-label text-muted fw-semibold small text-uppercase">Contact Number</label>
                      <input type="tel" className="form-control" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted fw-semibold small text-uppercase">Role</label>
                      <input type="text" className="form-control" value={currentUser?.role} disabled />
                    </div>
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button type="submit" className="btn btn-primary d-flex align-items-center gap-2" disabled={loading}>
                      {loading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />} Save Profile
                    </button>
                  </div>
                </form>

                <hr className="my-5" />
                
                <h6 className="mb-3 fw-bold">Security & Password</h6>
                <form onSubmit={handleChangePassword}>
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <label className="form-label text-muted fw-semibold small text-uppercase">New Password</label>
                      <div className="input-group">
                        <input 
                          type={showPwd ? "text" : "password"} 
                          className="form-control" 
                          value={pwdForm.newPassword} 
                          onChange={e => setPwdForm({...pwdForm, newPassword: e.target.value})} 
                          placeholder="Enter new password" 
                        />
                        <button className="btn btn-outline-secondary" type="button" onClick={() => setShowPwd(!showPwd)}>
                          {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted fw-semibold small text-uppercase">Confirm Password</label>
                      <div className="input-group">
                        <input 
                          type={showPwd ? "text" : "password"} 
                          className="form-control" 
                          value={pwdForm.confirmPassword} 
                          onChange={e => setPwdForm({...pwdForm, confirmPassword: e.target.value})} 
                          placeholder="Confirm new password" 
                        />
                        <button className="btn btn-outline-secondary" type="button" onClick={() => setShowPwd(!showPwd)}>
                          {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex justify-content-end">
                    <button type="submit" className="btn btn-outline-primary d-flex align-items-center gap-2" disabled={loading}>
                      <Key size={18} /> Update Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">System Users</h5>
                <button className="btn btn-primary btn-sm d-flex align-items-center gap-2" data-bs-toggle="modal" data-bs-target="#createUserModal">
                  <Plus size={16} /> Create New Account
                </button>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-muted small text-uppercase">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th className="text-end px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan="5" className="text-center py-5"><Loader className="animate-spin" /></td></tr>
                      ) : users.map(user => (
                        <tr key={user.userId}>
                          <td className="px-4 fw-medium">{user.fullName}</td>
                          <td className="text-muted">{user.email}</td>
                          <td>
                            {currentUser.userId !== user.userId ? (
                              <select 
                                className="form-select form-select-sm border-0 bg-light fw-bold text-primary rounded-pill px-2"
                                style={{ width: 'auto', cursor: 'pointer' }}
                                value={user.role}
                                onChange={(e) => handleUpdateRole(user.userId, e.target.value)}
                              >
                                <option value="ADMIN">ADMIN</option>
                                <option value="MANAGER">MANAGER</option>
                                <option value="OFFICER">OFFICER</option>
                                <option value="STAFF">STAFF</option>
                              </select>
                            ) : (
                              <span className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle px-2 py-1 rounded-pill">
                                {user.role}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${user.active ? 'bg-success' : 'bg-danger'} bg-opacity-10 text-${user.active ? 'success' : 'danger'} border px-2 py-1 rounded-pill`}>
                              {user.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="text-end px-4">
                            <div className="d-flex justify-content-end gap-2">
                              {user.active && (
                                <button className="btn btn-sm btn-outline-warning" onClick={() => handleDeactivate(user.userId)}>Deactivate</button>
                              )}
                              {currentUser.userId !== user.userId && (
                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteUser(user.userId)}>Delete</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="card-title mb-0">Notification Preferences</h5>
              </div>
              <div className="card-body p-0">
                <div className="list-group list-group-flush">
                  <div className="list-group-item p-4 d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-1 fw-bold">Low-stock Warnings</h6>
                      <p className="mb-0 text-muted small">Receive alerts when items fall below minimum thresholds.</p>
                    </div>
                    <div className="form-check form-switch fs-4 mb-0">
                      <input className="form-check-input" type="checkbox" role="switch" defaultChecked />
                    </div>
                  </div>
                  <div className="list-group-item p-4 d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-1 fw-bold">Overstock Alerts</h6>
                      <p className="mb-0 text-muted small">Notifications for inventory exceeding maximum capacity limits.</p>
                    </div>
                    <div className="form-check form-switch fs-4 mb-0">
                      <input className="form-check-input" type="checkbox" role="switch" defaultChecked />
                    </div>
                  </div>
                  <div className="list-group-item p-4 d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-1 fw-bold">Pending PO Approvals</h6>
                      <p className="mb-0 text-muted small">Alerts for purchase orders requiring manager approval.</p>
                    </div>
                    <div className="form-check form-switch fs-4 mb-0">
                      <input className="form-check-input" type="checkbox" role="switch" defaultChecked />
                    </div>
                  </div>
                  <div className="list-group-item p-4 d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-1 fw-bold">Overdue Receipts</h6>
                      <p className="mb-0 text-muted small">Notifications for scheduled goods receipts that are past due.</p>
                    </div>
                    <div className="form-check form-switch fs-4 mb-0">
                      <input className="form-check-input" type="checkbox" role="switch" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="card-title mb-0">System Audit Logs</h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-muted small text-uppercase">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th>Action</th>
                        <th>Module</th>
                        <th className="px-4">Actor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan="4" className="text-center py-5"><Loader className="animate-spin" /></td></tr>
                      ) : auditLogs.length === 0 ? (
                        <tr><td colSpan="4" className="text-center py-4 text-muted">No audit logs available.</td></tr>
                      ) : auditLogs.map(log => (
                        <tr key={log.id}>
                          <td className="px-4 text-muted small" style={{ fontVariantNumeric: 'tabular-nums' }}>{log.timestamp}</td>
                          <td className="fw-medium">{log.action}</td>
                          <td>
                            <span className="text-secondary small border px-2 py-1 rounded bg-light">{log.module}</span>
                          </td>
                          <td className="px-4 fw-medium text-primary">{log.actor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Create User Modal */}
      <div className="modal fade" id="createUserModal" tabIndex="-1" aria-labelledby="createUserModalLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title text-primary fw-bold" id="createUserModalLabel">Create Internal System Account</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form id="createUserForm" onSubmit={handleCreateUser}>
                <div className="mb-3">
                  <label className="form-label text-muted fw-semibold small text-uppercase">Full Name</label>
                  <input type="text" className="form-control" required value={createUserForm.fullName} onChange={e => setCreateUserForm({...createUserForm, fullName: e.target.value})} />
                </div>
                <div className="mb-3">
                  <label className="form-label text-muted fw-semibold small text-uppercase">Email Address</label>
                  <input type="email" className="form-control" required value={createUserForm.email} onChange={e => setCreateUserForm({...createUserForm, email: e.target.value})} />
                </div>
                <div className="mb-3">
                  <label className="form-label text-muted fw-semibold small text-uppercase">Phone Number</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    required 
                    placeholder="e.g. 9876543210"
                    value={createUserForm.phone} 
                    onChange={e => setCreateUserForm({...createUserForm, phone: e.target.value})}
                    pattern="^[6-9]\d{9}$"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-muted fw-semibold small text-uppercase">Role</label>
                  <select className="form-select" required value={createUserForm.role} onChange={e => setCreateUserForm({...createUserForm, role: e.target.value})}>
                    <option value="">Select a role</option>
                    <option value="STAFF">Warehouse Staff</option>
                    <option value="MANAGER">Inventory Manager</option>
                    <option value="OFFICER">Purchase Officer</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label text-muted fw-semibold small text-uppercase">Department</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Sales, Warehouse"
                    value={createUserForm.department} 
                    onChange={e => setCreateUserForm({...createUserForm, department: e.target.value})} 
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-muted fw-semibold small text-uppercase">Initial Password</label>
                  <div className="input-group">
                    <input 
                      type={showCreatePwd ? "text" : "password"} 
                      className="form-control" 
                      required 
                      value={createUserForm.password} 
                      onChange={e => setCreateUserForm({...createUserForm, password: e.target.value})} 
                    />
                    <button className="btn btn-outline-secondary" type="button" onClick={() => setShowCreatePwd(!showCreatePwd)}>
                      {showCreatePwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer border-top-0 pt-0">
              <button type="button" className="btn btn-light" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" form="createUserForm" className="btn btn-primary" data-bs-dismiss="modal">Create Account</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AdminSettingsPage;
