import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Shield,
    Users,
    CheckCircle2,
    AlertCircle,
    Search,
    Filter,
    UserCog,
    Lock,
    Unlock,
    ChevronDown,
    Save,
    X,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../../store/useAuthStore';
import { apiGet, apiPut, apiPost } from '../../../../utils/api';

const RoleChanger = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // State variables
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState(''); // For debounced search - initialize as empty string
    const [filterRole, setFilterRole] = useState('all');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20); // Pagination
    const [permissions, setPermissions] = useState({
        questionBank: false,
        tasks: false,
        classes: false
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput);
            setCurrentPage(1); // Reset to first page on search
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await apiGet('/admin/users');
            const data = await response.json();
            if (data.success) {
                setUsers(data.data);
            }
        } catch (error) {
            setError('Failed to fetch users');
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    // Memoized filtered users with pagination
    const filteredUsers = useMemo(() => {
        let filtered = users;

        // Filter by role
        if (filterRole !== 'all') {
            filtered = filtered.filter(u => u.role === filterRole);
        }

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(u =>
                u.name?.toLowerCase().includes(term) ||
                u.email?.toLowerCase().includes(term) ||
                u.ID?.toLowerCase().includes(term)
            );
        }

        return filtered;
    }, [users, filterRole, searchTerm]);

    // Paginated users
    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredUsers, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    const handleRoleChange = async (userId, newRole) => {
        if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await apiPut(`/admin/users/${userId}/role`, {
                role: newRole
            });
            const data = await response.json();

            if (data.success) {
                setSuccess('Role updated successfully!');
                fetchUsers(); // Refresh the list
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.message || 'Failed to update role');
            }
        } catch (error) {
            setError('Failed to update role');
            console.error('Error updating role:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPermissions = async (userData) => {
        setSelectedUser(userData);
        setLoading(true);
        
        try {
            const response = await apiGet(`/admin/users/${userData.user_id}/permissions`);
            const data = await response.json();
            if (data.success) {
                setPermissions(data.data || {
                    questionBank: false,
                    tasks: false,
                    classes: false
                });
            }
        } catch (error) {
            console.error('Error fetching permissions:', error);
        } finally {
            setLoading(false);
        }
        
        setShowPermissionModal(true);
    };

    const handleSavePermissions = async () => {
        if (!selectedUser) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await apiPost(`/admin/users/${selectedUser.user_id}/permissions`, {
                permissions
            });
            const data = await response.json();

            if (data.success) {
                setSuccess('Permissions updated successfully! User needs to log out and log back in for changes to take effect.');
                setShowPermissionModal(false);
                setTimeout(() => setSuccess(''), 5000);
            } else {
                setError(data.message || 'Failed to update permissions');
            }
        } catch (error) {
            setError('Failed to update permissions');
            console.error('Error updating permissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'admin':
                return { bg: '#FEE2E2', color: '#991B1B', text: 'Admin' };
            case 'faculty':
                return { bg: '#DBEAFE', color: '#1E40AF', text: 'Faculty' };
            case 'student':
                return { bg: '#D1FAE5', color: '#065F46', text: 'Student' };
            default:
                return { bg: '#F3F4F6', color: '#6B7280', text: 'Unknown' };
        }
    };

    return (
        <div style={styles.container}>
            {/* Error/Success Messages */}
            {error && (
                <div style={{ ...styles.alertBanner, ...styles.errorBanner }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError('')} style={styles.alertClose}>×</button>
                </div>
            )}

            {success && (
                <div style={{ ...styles.alertBanner, ...styles.successBanner }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={16} />
                        <span>{success}</span>
                    </div>
                    <button onClick={() => setSuccess('')} style={styles.alertClose}>×</button>
                </div>
            )}

            <div style={styles.content}>
                {/* Filters Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <div style={styles.cardTitleWrapper}>
                            <Filter size={20} color="#6366f1" />
                            <h2 style={styles.cardTitle}>Filters</h2>
                        </div>
                    </div>

                    <div style={styles.filterGrid}>
                        {/* Search */}
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>
                                <Search size={14} style={{ marginRight: '6px' }} />
                                Search Users
                            </label>
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search by name, email, or ID..."
                                style={styles.input}
                            />
                        </div>

                        {/* Role Filter */}
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>
                                <Shield size={14} style={{ marginRight: '6px' }} />
                                Filter by Role
                            </label>
                            <div style={styles.selectWrapper}>
                                <select
                                    value={filterRole}
                                    onChange={(e) => setFilterRole(e.target.value)}
                                    style={styles.select}
                                >
                                    <option value="all">All Roles</option>
                                    <option value="faculty">Faculty</option>
                                    <option value="student">Student</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <ChevronDown size={16} style={styles.selectIcon} />
                            </div>
                        </div>
                    </div>

                    <div style={styles.recordCount}>
                        <Users size={16} />
                        <span>{filteredUsers.length} users found</span>
                    </div>
                </div>

                {/* Users Table Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <div style={styles.cardTitleWrapper}>
                            <Users size={20} color="#6366f1" />
                            <h2 style={styles.cardTitle}>User Management</h2>
                        </div>
                    </div>

                    {loading && <div style={styles.loadingText}>Loading...</div>}

                    {!loading && filteredUsers.length === 0 && (
                        <div style={styles.emptyState}>
                            <Users size={48} color="#cbd5e1" />
                            <p style={styles.emptyText}>No users found</p>
                        </div>
                    )}

                    {!loading && filteredUsers.length > 0 && (
                        <>
                            <div style={styles.tableWrapper}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr style={styles.tableHeaderRow}>
                                            <th style={styles.tableHeader}>Name</th>
                                            <th style={styles.tableHeader}>Email</th>
                                            <th style={styles.tableHeader}>ID</th>
                                            <th style={styles.tableHeader}>Current Role</th>
                                            <th style={styles.tableHeader}>Change Role To</th>
                                            <th style={styles.tableHeader}>Permissions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedUsers.map((userData) => {
                                        const roleBadge = getRoleBadgeColor(userData.role);
                                        return (
                                            <tr key={userData.user_id} style={styles.tableRow}>
                                                <td style={styles.tableCell}>{userData.name}</td>
                                                <td style={styles.tableCell}>{userData.email}</td>
                                                <td style={styles.tableCell}>{userData.ID}</td>
                                                <td style={styles.tableCell}>
                                                    <span style={{
                                                        ...styles.badge,
                                                        background: roleBadge.bg,
                                                        color: roleBadge.color
                                                    }}>
                                                        {roleBadge.text}
                                                    </span>
                                                </td>
                                                <td style={styles.tableCell}>
                                                    <div style={styles.roleButtons}>
                                                        {userData.role !== 'admin' && (
                                                            <button
                                                                onClick={() => handleRoleChange(userData.user_id, 'admin')}
                                                                style={styles.roleButton}
                                                                title="Promote to Admin"
                                                            >
                                                                <Shield size={14} />
                                                                <span>Admin</span>
                                                            </button>
                                                        )}
                                                        {userData.role !== 'faculty' && (
                                                            <button
                                                                onClick={() => handleRoleChange(userData.user_id, 'faculty')}
                                                                style={styles.roleButton}
                                                                title="Change to Faculty"
                                                            >
                                                                <Users size={14} />
                                                                <span>Faculty</span>
                                                            </button>
                                                        )}
                                                        {userData.role !== 'student' && (
                                                            <button
                                                                onClick={() => handleRoleChange(userData.user_id, 'student')}
                                                                style={styles.roleButton}
                                                                title="Change to Student"
                                                            >
                                                                <Users size={14} />
                                                                <span>Student</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={styles.tableCell}>
                                                    <button
                                                        onClick={() => handleOpenPermissions(userData)}
                                                        style={styles.permissionButton}
                                                        title="Manage Permissions"
                                                    >
                                                        <UserCog size={16} />
                                                        <span>Manage</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div style={styles.pagination}>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        ...styles.paginationButton,
                                        ...(currentPage === 1 ? styles.paginationButtonDisabled : {})
                                    }}
                                >
                                    <ChevronLeft size={16} />
                                    Previous
                                </button>
                                
                                <span style={styles.paginationInfo}>
                                    Page {currentPage} of {totalPages} ({filteredUsers.length} total users)
                                </span>
                                
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        ...styles.paginationButton,
                                        ...(currentPage === totalPages ? styles.paginationButtonDisabled : {})
                                    }}
                                >
                                    Next
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </>
                    )}
                </div>
            </div>

            {/* Permission Modal */}
            {showPermissionModal && selectedUser && (
                <div style={styles.modalOverlay} onClick={() => setShowPermissionModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <div>
                                <h3 style={styles.modalTitle}>Manage Permissions</h3>
                                <p style={styles.modalSubtitle}>
                                    {selectedUser.name} ({selectedUser.role})
                                </p>
                            </div>
                            <button
                                onClick={() => setShowPermissionModal(false)}
                                style={styles.closeButton}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <p style={styles.permissionDescription}>
                                Select specific pages/features this {selectedUser.role} can access:
                            </p>

                            <div style={styles.permissionGrid}>
                                <div style={styles.permissionItem}>
                                    <label style={styles.permissionLabel}>
                                        <input
                                            type="checkbox"
                                            checked={permissions.questionBank}
                                            onChange={(e) => setPermissions({
                                                ...permissions,
                                                questionBank: e.target.checked
                                            })}
                                            style={styles.checkbox}
                                        />
                                        <div style={styles.permissionInfo}>
                                            {permissions.questionBank ? <Unlock size={16} color="#10b981" /> : <Lock size={16} color="#ef4444" />}
                                            <span style={styles.permissionName}>
                                                Question Bank
                                            </span>
                                        </div>
                                    </label>
                                    <p style={styles.permissionDesc}>Access to practice questions and assessments</p>
                                </div>

                                <div style={styles.permissionItem}>
                                    <label style={styles.permissionLabel}>
                                        <input
                                            type="checkbox"
                                            checked={permissions.tasks}
                                            onChange={(e) => setPermissions({
                                                ...permissions,
                                                tasks: e.target.checked
                                            })}
                                            style={styles.checkbox}
                                        />
                                        <div style={styles.permissionInfo}>
                                            {permissions.tasks ? <Unlock size={16} color="#10b981" /> : <Lock size={16} color="#ef4444" />}
                                            <span style={styles.permissionName}>
                                                Tasks & Assignments
                                            </span>
                                        </div>
                                    </label>
                                    <p style={styles.permissionDesc}>Create and manage tasks and assignments</p>
                                </div>

                                <div style={styles.permissionItem}>
                                    <label style={styles.permissionLabel}>
                                        <input
                                            type="checkbox"
                                            checked={permissions.classes}
                                            onChange={(e) => setPermissions({
                                                ...permissions,
                                                classes: e.target.checked
                                            })}
                                            style={styles.checkbox}
                                        />
                                        <div style={styles.permissionInfo}>
                                            {permissions.classes ? <Unlock size={16} color="#10b981" /> : <Lock size={16} color="#ef4444" />}
                                            <span style={styles.permissionName}>
                                                Classes & Groups
                                            </span>
                                        </div>
                                    </label>
                                    <p style={styles.permissionDesc}>Manage classes and student groups</p>
                                </div>
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button
                                onClick={() => setShowPermissionModal(false)}
                                style={styles.cancelButton}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePermissions}
                                style={styles.saveButton}
                                disabled={loading}
                            >
                                <Save size={16} />
                                <span>{loading ? 'Saving...' : 'Save Permissions'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        background: '#f8fafc'
    },
    content: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '32px 40px'
    },
    card: {
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px',
        paddingBottom: '20px',
        borderBottom: '2px solid #f1f5f9'
    },
    cardTitleWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
    },
    cardTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
        margin: '0',
        letterSpacing: '-0.02em',
        fontFamily: 'Outfit, sans-serif'
    },
    filterGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        marginBottom: '24px'
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#475569',
        display: 'flex',
        alignItems: 'center',
        letterSpacing: '-0.01em'
    },
    input: {
        padding: '12px 16px',
        fontSize: '14px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        outline: 'none',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
        ':focus': {
            borderColor: '#6366f1',
            boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)'
        }
    },
    selectWrapper: {
        position: 'relative'
    },
    select: {
        width: '100%',
        padding: '12px 40px 12px 16px',
        fontSize: '14px',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        outline: 'none',
        appearance: 'none',
        background: '#FFFFFF',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontFamily: 'inherit'
    },
    selectIcon: {
        position: 'absolute',
        right: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        color: '#64748b'
    },
    recordCount: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: '700',
        color: '#6366f1',
        background: '#eef2ff',
        padding: '12px 20px',
        borderRadius: '10px',
        border: '1px solid #c7d2fe',
        width: 'fit-content'
    },
    alertBanner: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '16px 20px',
        borderRadius: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        minWidth: '300px',
        maxWidth: '500px',
        zIndex: 9999,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        fontSize: '14px',
        fontWeight: '500'
    },
    errorBanner: {
        background: '#FEE2E2',
        color: '#991B1B',
        border: '1px solid #FCA5A5'
    },
    successBanner: {
        background: '#D1FAE5',
        color: '#065F46',
        border: '1px solid #6EE7B7'
    },
    alertClose: {
        background: 'transparent',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        color: 'inherit',
        padding: '0',
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.7,
        transition: 'opacity 0.2s'
    },
    loadingText: {
        textAlign: 'center',
        padding: '40px',
        fontSize: '16px',
        color: '#64748b'
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
    },
    emptyText: {
        fontSize: '16px',
        color: '#64748b',
        margin: '0'
    },
    tableWrapper: {
        overflowX: 'auto',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '14px'
    },
    tableHeaderRow: {
        background: '#f8fafc',
        borderBottom: '2px solid #e2e8f0'
    },
    tableHeader: {
        padding: '16px',
        textAlign: 'left',
        fontWeight: '700',
        color: '#475569',
        fontSize: '13px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    tableRow: {
        borderBottom: '1px solid #e2e8f0',
        transition: 'background-color 0.2s'
    },
    tableCell: {
        padding: '16px',
        color: '#1e293b',
        verticalAlign: 'middle'
    },
    badge: {
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '700',
        display: 'inline-block',
        textTransform: 'uppercase',
        letterSpacing: '0.03em'
    },
    roleButtons: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
    },
    roleButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        fontSize: '13px',
        fontWeight: '600',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        background: '#FFFFFF',
        color: '#475569',
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
            borderColor: '#6366f1',
            color: '#6366f1',
            background: '#eef2ff'
        }
    },
    permissionButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: '600',
        border: '2px solid #6366f1',
        borderRadius: '8px',
        background: '#eef2ff',
        color: '#6366f1',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)'
    },
    modal: {
        background: '#FFFFFF',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '24px',
        borderBottom: '2px solid #e2e8f0'
    },
    modalTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
        margin: '0 0 4px 0'
    },
    modalSubtitle: {
        fontSize: '14px',
        color: '#64748b',
        margin: '0'
    },
    closeButton: {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '6px',
        color: '#64748b',
        transition: 'all 0.2s'
    },
    modalBody: {
        padding: '24px'
    },
    permissionDescription: {
        fontSize: '14px',
        color: '#64748b',
        marginBottom: '24px'
    },
    permissionGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px'
    },
    permissionItem: {
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        padding: '16px',
        transition: 'all 0.2s'
    },
    permissionLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        marginBottom: '8px'
    },
    checkbox: {
        width: '18px',
        height: '18px',
        cursor: 'pointer'
    },
    permissionInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flex: 1
    },
    permissionName: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#1e293b'
    },
    permissionDesc: {
        fontSize: '12px',
        color: '#64748b',
        marginLeft: '30px',
        margin: '0'
    },
    modalFooter: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        padding: '24px',
        borderTop: '2px solid #e2e8f0'
    },
    cancelButton: {
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: '600',
        border: '2px solid #e2e8f0',
        borderRadius: '10px',
        background: '#FFFFFF',
        color: '#475569',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    saveButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: '600',
        border: 'none',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        color: '#FFFFFF',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)'
    },
    pagination: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        borderTop: '2px solid #e2e8f0',
        background: '#f8fafc'
    },
    paginationButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        fontSize: '14px',
        fontWeight: '600',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        background: '#FFFFFF',
        color: '#475569',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    paginationButtonDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
        pointerEvents: 'none'
    },
    paginationInfo: {
        fontSize: '14px',
        color: '#64748b',
        fontWeight: '600'
    }
};

export default RoleChanger;