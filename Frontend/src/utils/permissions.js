/**
 * Permission utility functions
 * Checks user permissions for feature access
 */

/**
 * Check if user has a specific permission
 * @param {object} user - User object from auth store
 * @param {string} permission - Permission key (e.g., 'tasks', 'questionBank')
 * @returns {boolean} - True if user has permission
 */
export const hasPermission = (user, permission) => {
  if (!user) return false;
  
  // Admins have all permissions
  if (user.role === 'admin') return true;
  
  // Check user's specific permissions
  if (user.permissions && user.permissions[permission]) {
    return true;
  }
  
  return false;
};

/**
 * Check if user has any of the given permissions
 * @param {object} user - User object
 * @param {string[]} permissions - Array of permission keys
 * @returns {boolean} - True if user has at least one permission
 */
export const hasAnyPermission = (user, permissions) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  
  return permissions.some(perm => hasPermission(user, perm));
};

/**
 * Check if user has all given permissions
 * @param {object} user - User object
 * @param {string[]} permissions - Array of permission keys
 * @returns {boolean} - True if user has all permissions
 */
export const hasAllPermissions = (user, permissions) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  
  return permissions.every(perm => hasPermission(user, perm));
};

/**
 * Get navigation items based on user role and permissions
 * @param {object} user - User object
 * @returns {object[]} - Array of navigation items
 */
export const getNavigationItems = (user) => {
  if (!user) return [];
  
  const items = [];
  
  // Admin navigation
  if (user.role === 'admin') {
    return [
      { path: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
      { path: '/faculty', label: 'Faculty & Accounts', icon: 'Users' },
      { path: '/classes', label: 'Classes & Groups', icon: 'School' },
      { path: '/students', label: 'Students', icon: 'GraduationCap' },
      { path: '/attendance', label: 'Attendance', icon: 'ClipboardCheck' },
      { path: '/tasks', label: 'Tasks & Assignments', icon: 'ListTodo' },
      { path: '/courses', label: 'Question Bank', icon: 'BookOpen' },
      { path: '/venue-allocation', label: 'Venue Allocation', icon: 'MapPin' },
      { path: '/group-insights', label: 'Group Insights', icon: 'BarChart3' },
      { path: '/reports', label: 'Reports & Analytics', icon: 'FileText' },
      { path: '/admin-tools', label: 'Admin Tools', icon: 'Settings' }
    ];
  }
  
  // Faculty navigation
  if (user.role === 'faculty') {
    items.push({ path: '/', label: 'Dashboard', icon: 'LayoutDashboard' });
    items.push({ path: '/classes', label: 'My Classes', icon: 'School' });
    
    if (hasPermission(user, 'students')) {
      items.push({ path: '/students', label: 'Students', icon: 'GraduationCap' });
    }
    
    if (hasPermission(user, 'attendance')) {
      items.push({ path: '/attendance', label: 'Attendance', icon: 'ClipboardCheck' });
    }
    
    if (hasPermission(user, 'tasks') || hasPermission(user, 'assignments')) {
      items.push({ path: '/tasks', label: 'Tasks & Assignments', icon: 'ListTodo' });
    }
    
    if (hasPermission(user, 'questionBank')) {
      items.push({ path: '/courses', label: 'Question Bank', icon: 'BookOpen' });
    }
    
    if (hasPermission(user, 'grades')) {
      items.push({ path: '/group-insights', label: 'Group Insights', icon: 'BarChart3' });
    }
    
    if (hasPermission(user, 'venues')) {
      items.push({ path: '/venue-allocation', label: 'Venue Allocation', icon: 'MapPin' });
    }
    
    return items;
  }
  
  // Student navigation
  if (user.role === 'student') {
    items.push({ path: '/', label: 'Dashboard', icon: 'LayoutDashboard' });
    items.push({ path: '/roadmap', label: 'My Roadmap', icon: 'Map' });
    items.push({ path: '/group', label: 'My Group', icon: 'Users' });
    items.push({ path: '/grades', label: 'Grades', icon: 'Award' });
    
    if (hasPermission(user, 'tasks') || hasPermission(user, 'assignments')) {
      items.push({ path: '/assignments', label: 'Assignments', icon: 'FileText' });
    }
    
    if (hasPermission(user, 'questionBank')) {
      items.push({ path: '/courses', label: 'Practice', icon: 'BookOpen' });
    }
    
    if (hasPermission(user, 'attendance')) {
      items.push({ path: '/attendance', label: 'My Attendance', icon: 'ClipboardCheck' });
    }
    
    return items;
  }
  
  return items;
};

/**
 * Check if user can access a specific route
 * @param {object} user - User object
 * @param {string} path - Route path
 * @returns {boolean} - True if user can access route
 */
export const canAccessRoute = (user, path) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  
  // Route to permission mapping
  const routePermissions = {
    '/tasks': ['tasks', 'assignments'],
    '/courses': ['questionBank'],
    '/attendance': ['attendance'],
    '/students': ['students'],
    '/group-insights': ['grades'],
    '/venue-allocation': ['venues'],
    '/assignments': ['tasks', 'assignments']
  };
  
  // If route doesn't require special permission, allow based on role
  if (!routePermissions[path]) {
    return true;
  }
  
  // Check if user has any required permission
  return hasAnyPermission(user, routePermissions[path]);
};
