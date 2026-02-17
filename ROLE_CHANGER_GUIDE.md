# Role Changer & Permission Management Guide

## Overview
The Role Changer page allows administrators to manage user roles and set granular permissions for faculty and students, providing flexible access control across the platform.

## Features

### 1. **Role Management**
Change user roles between:
- **Admin**: Full system access
- **Faculty**: Teaching and student management access  
- **Student**: Learning and assignment submission access

### 2. **Granular Permissions**
Assign specific permissions to users regardless of their role:
- **Tasks**: Create, edit, and manage student tasks
- **Assignments**: Manage assignments and submissions
- **Question Bank**: Create and manage question pools
- **Attendance**: Mark and export attendance records
- **Grades**: View and manage student grades
- **Students**: View and manage student information
- **Venues**: Manage venue allocations and schedules

## Setup Instructions

### Database Migration
1. Run the user permissions migration:
```sql
mysql -u your_username -p your_database < server/migrations/user_permissions.sql
```

Or execute directly in MySQL:
```sql
SOURCE server/migrations/user_permissions.sql;
```

### Verification
Check if the table was created:
```sql
DESCRIBE user_permissions;
```

## How to Use

### Accessing the Role Changer
1. Navigate to **Admin Tools** from the sidebar
2. Click on **Role Changer** card
3. You'll see the role management interface

### Changing User Roles

**Option 1: Promote Faculty to Admin**
1. Find the faculty member in the user list
2. Under "Change Role To", click **Admin** button
3. Confirm the role change
4. The user now has full administrative access

**Option 2: Assign Specific Permissions to Faculty**
1. Find the faculty member in the user list
2. Click the **Manage** button in the Permissions column
3. Select specific permissions:
   - ✓ Tasks (full task management)
   - ✓ Assignments (full assignment management)
   - ✓ Question Bank (full question bank access)
   - (Leave others unchecked)
4. Click **Save Permissions**
5. Faculty now has limited admin access to only these features

**Option 3: Assign Permissions to Students**
1. Filter by role = "Student" or search for the student
2. Click **Manage** in the Permissions column
3. Select specific permissions (e.g., Question Bank for practice)
4. Click **Save Permissions**
5. Student receives extended access while maintaining student role

### Search and Filter
- **Search**: Type name, email, or ID in the search box
- **Filter by Role**: Use the dropdown to show only Admin/Faculty/Student users

## Use Cases

### Case 1: Senior Faculty Needs Admin Access
**Scenario**: A senior faculty member needs to manage all system features
**Solution**: Change their role from Faculty → Admin
**Result**: Full administrative access to all features

### Case 2: Junior Faculty Can Only Manage Tasks
**Scenario**: A teaching assistant should only create tasks and assignments
**Solution**: Keep Faculty role, enable only "Tasks" and "Assignments" permissions
**Result**: Limited access to task/assignment features only

### Case 3: Student Leader Needs Question Bank Access
**Scenario**: A student mentor needs to practice questions to help others
**Solution**: Keep Student role, enable "Question Bank" permission
**Result**: Student can access question bank while keeping student privileges

### Case 4: Guest Lecturer Needs Temporary Access
**Scenario**: A guest lecturer needs limited access for one semester
**Solution**: 
1. Create faculty account
2. Enable only "Tasks" and "Grades" permissions
3. After semester, disable permissions or change to Student role
**Result**: Temporary controlled access

## Permission Matrix

| Permission | Faculty Use | Student Use |
|-----------|-------------|-------------|
| Tasks | Create & assign tasks | View task statistics |
| Assignments | Create & grade | View assignment analytics |
| Question Bank | Create questions | Practice questions |
| Attendance | Mark attendance | View attendance records |
| Grades | Enter & modify grades | View detailed grades |
| Students | View & manage students | View peer information |
| Venues | Allocate venues | View venue schedules |

## Best Practices

### Security
1. **Least Privilege**: Only grant necessary permissions
2. **Regular Audits**: Review user permissions quarterly
3. **Role Changes**: Document reason for major role changes
4. **Admin Access**: Limit number of users with full admin role

### Workflow
1. **New Faculty**: Start with basic Faculty role
2. **Prove Competency**: Grant additional permissions as needed
3. **Departure**: Revoke all permissions or change to Student/deactivate
4. **Temporary Access**: Use permissions instead of role changes

### Permission Combinations

**Teaching Assistant**:
- ✓ Tasks
- ✓ Assignments
- ✓ Question Bank
- ✗ Attendance
- ✗ Grades
- ✗ Students
- ✗ Venues

**Lab Coordinator**:
- ✗ Tasks
- ✗ Assignments
- ✓ Question Bank
- ✓ Attendance
- ✗ Grades
- ✓ Students
- ✓ Venues

**Guest Lecturer**:
- ✓ Tasks
- ✓ Assignments
- ✗ Question Bank
- ✓ Attendance
- ✓ Grades
- ✗ Students
- ✗ Venues

**Senior Faculty** (before Admin promotion):
- ✓ All permissions enabled

## Technical Notes

### Role IDs
- 1 = Admin
- 2 = Faculty
- 3 = Student

### Database Tables
- `users`: Stores role_id
- `faculties`: Created when role_id = 2
- `students`: Created when role_id = 3
- `user_permissions`: Stores granular permissions

### API Endpoints
- `GET /api/admin/users` - Fetch all users
- `PUT /api/admin/users/:userId/role` - Update user role
- `GET /api/admin/users/:userId/permissions` - Get user permissions
- `POST /api/admin/users/:userId/permissions` - Update permissions

## Troubleshooting

### Permission Changes Not Reflecting
- **Solution**: User may need to log out and log back in
- Check if middleware reads from user_permissions table

### Role Change Fails
- **Possible Cause**: Foreign key constraints
- **Solution**: Ensure no active records tied to old role (e.g., active tasks for faculty)

### Cannot Find User
- **Check**: User exists in database with valid role_id
- **Check**: Database connection is active
- **Check**: Admin authentication is valid

## Security Considerations

### Admin-Only Access
- Only users with role_id = 1 (Admin) can access Role Changer
- Protected by `adminOnly` middleware
- All API calls require admin authentication

### Audit Logging (Recommended)
Consider adding:
```sql
CREATE TABLE role_change_audit (
  audit_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  changed_by INT,
  old_role_id INT,
  new_role_id INT,
  change_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Support

For issues or questions:
1. Check server logs for errors
2. Verify database migration completed
3. Confirm user has admin role
4. Review API endpoint responses in browser console

---

**Version**: 1.0  
**Last Updated**: February 2026  
**Compatibility**: PBL Portal Admin Tools v2.0+
