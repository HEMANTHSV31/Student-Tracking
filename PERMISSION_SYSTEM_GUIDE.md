# Permission System Guide

## Overview
The Role Changer now controls what pages and features users can access based on their assigned permissions.

## How It Works

### 1. **Setting Permissions**
- Navigate to **Admin Tools** → **Role Changer**
- Click **"Manage"** button next to any user
- Check/uncheck permissions:
  - ✅ **Tasks** - Access to create and manage tasks
  - ✅ **Assignments** - Access to assignment features
  - ✅ **Question Bank** - Access to question bank/practice
  - ✅ **Attendance** - Access to attendance management
  - ✅ **Grades** - Access to view and manage grades
  - ✅ **Students** - Access to student management
  - ✅ **Venues** - Access to venue allocation
- Click **"Save Permissions"**

### 2. **Permission Effects**

#### Faculty with Permissions
If you give a faculty member **Question Bank** + **Tasks** permissions:
- They will see "Question Bank" in their sidebar
- They will see "Task & Assignment" in their sidebar
- They can access these features just like features

#### Student with Permissions
If you give a student **Question Bank** permission:
- They will see "Question Bank" or "P Skills Practice" in their sidebar
- They can practice questions even though they're a student

### 3. **User Experience**
**Important**: After changing permissions, the user must:
1. Log out
2. Log back in
3. Permissions will then be active in their navigation

## Permission Mapping

### Faculty Permissions
| Permission | Adds to Navigation |
|-----------|-------------------|
| Tasks | Task & Assignment, Code Evaluation |
| Assignments | Task & Assignment, Code Evaluation |
| Question Bank | Question Bank |
| Attendance | Attendance |
| Grades | Group Insights, Reports |
| Students | Students |
| Venues | Venue Allocation |

### Student Permissions
| Permission | Adds to Navigation |
|-----------|-------------------|
| Tasks/Assignments | Tasks & Assignments |
| Question Bank | P Skills Practice, Question Bank |
| Attendance | Attendance |
| Grades | My Grades |

## Examples

### Example 1: Junior Faculty (Limited Access)
**Permissions**: ✅ Tasks, ✅ Assignments  
**Result**: Faculty sees only "My Classes" + "Task & Assignment" + "Code Evaluation"

### Example 2: Teaching Assistant
**Permissions**: ✅ Tasks, ✅ Question Bank, ✅ Attendance  
**Result**: Faculty sees "My Classes" + "Tasks" + "Question Bank" + "Attendance"

### Example 3: Student Leader
**Permissions**: ✅ Question Bank, ✅ Grades  
**Result**: Student sees default pages + "Question Bank" + "My Grades"

## Technical Implementation

### Backend
- User permissions stored in `user_permissions` table
- Permissions included in `/auth/me` endpoint
- Each user object includes `permissions` property

### Frontend
- `utils/permissions.js` - Permission checking utilities
- `utils/menuConfig.js` - Dynamic menu generation
- `SideTab.jsx` - Uses `getMenuByRole()` for dynamic navigation
- Navigation automatically updates based on user permissions

## Testing

1. **Create test user** (or use existing)
2. **Set specific permissions** through Role Changer
3. **Log out** the test user
4. **Log back in**
5. **Verify** navigation shows only permitted items

## Troubleshooting

**Q: Permissions not showing after update?**  
A: User must log out and log back in

**Q: Student still can't see Question Bank?**  
A: Verify permission is checked and saved. Check browser console for errors.

**Q: Admin sees same navigation?**  
A: Correct - Admins always have full access regardless of permissions

## Code Reference

```javascript
// Check if user has permission
import { hasPermission } from '../utils/permissions';

if (hasPermission(user, 'questionBank')) {
  // Show question bank feature
}
```

```javascript
// Get menu items with permissions
import { getMenuByRole } from '../utils/menuConfig';

const menuItems = getMenuByRole(user);
```
