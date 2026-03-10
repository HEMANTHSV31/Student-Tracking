/**
 * Get menu items based on user role and permissions
 */
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BarChart3,
  Settings,
  Layers,
  CalendarCheck,
  ClipboardCheck,
  Map,
  Home,
  FileSpreadsheet,
  BookOpen,
  Code,
  Braces,
  MapPin,
  Briefcase,
  Award,
  ListTodo
} from "lucide-react";

export const getMenuByRole = (user) => {
  if (!user) return [];

  const hasPermission = (permission) => {
    if (user.role === 'admin') return true;
    return user.permissions && user.permissions[permission];
  };

  if (user.role === 'admin') {
    return [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        section: "top",
      },
      {
        id: "faculty",
        label: "Faculty & Accounts",
        icon: Users,
        section: "management",
      },
      { id: "students", label: "Students", icon: Users, section: "management" },
      {
        id: "classes",
        label: "Classes & Groups",
        icon: Layers,
        section: "classes",
      },
      {
        id: "group-insights",
        label: "Group Insights",
        icon: BarChart3,
        section: "classes",
      },
      {
        id: "attendance",
        label: "Attendance",
        icon: CalendarCheck,
        section: "academic",
      },
      {
        id: "tasks",
        label: "Task & Assignment",
        icon: ClipboardCheck,
        section: "academic",
      },
      { id: "reports", label: "Reports", icon: BarChart3, section: "academic" },
      {
        id: "courses",
        label: "Question Bank",
        icon: BookOpen,
        section: "academic",
      },
      {
        id: "admin-tools",
        label: "Admin Tools",
        icon: Briefcase,
        section: "tools",
      },
    ];
  }

  if (user.role === 'faculty') {
    const menu = [
      {
        id: "classes",
        label: "My Classes / Groups",
        icon: Layers,
        section: "top",
      },
      // Base faculty menu - always shown
      { id: "students", label: "Students", icon: Users, section: "management" },
      {
        id: "attendance",
        label: "Attendance",
        icon: CalendarCheck,
        section: "academic",
      },
      {
        id: "tasks",
        label: "Task & Assignment",
        icon: ClipboardCheck,
        section: "academic",
      },
      {
        id: "submissions",
        label: "Code Evaluation",
        icon: Code,
        section: "academic",
      },
      {
        id: "group-insights",
        label: "Group Insights",
        icon: BarChart3,
        section: "classes",
      },
      { id: "reports", label: "Reports", icon: BarChart3, section: "academic" },
    ];

    // Add EXTRA pages based on permissions
    if (hasPermission('questionBank')) {
      menu.push({
        id: "courses",
        label: "Question Bank",
        icon: BookOpen,
        section: "academic",
      });
    }

    if (hasPermission('tasks')) {
      menu.push({
        id: "admin-tasks",
        label: "Tasks & Assignments",
        icon: ListTodo,
        section: "academic",
      });
    }

    if (hasPermission('classes')) {
      menu.push({
        id: "all-classes",
        label: "All Classes & Groups",
        icon: Layers,
        section: "management",
      });
    }

    // Add Assessment Attendance for faculty (direct access, not full Admin Tools)
    menu.push({
      id: "assessment-attendance",
      label: "Assessment Attendance",
      icon: CalendarCheck,
      section: "tools",
    });

    return menu;
  }

  if (user.role === 'student') {
    const menu = [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        section: "top",
      },
      { id: "classes", label: "My Class Room", icon: Home, section: "classes" },
      {
        id: "roadmap",
        label: "Roadmap & Material",
        icon: Map,
        section: "academic",
      },
      // Base student menu - always shown
      {
        id: "tasks",
        label: "Tasks & Assignments",
        icon: ClipboardCheck,
        section: "academic",
      },
      {
        id: "code-practice",
        label: "P Skills Practice",
        icon: Braces,
        section: "assessment",
      },
      {
        id: "attendance",
        label: "Attendance",
        icon: CalendarCheck,
        section: "academic",
      },
      {
        id: "my-assessment",
        label: "My Assessment",
        icon: MapPin,
        section: "classes",
      },
    ];

    // Add EXTRA pages based on permissions
    if (hasPermission('questionBank')) {
      // Add Question Bank for additional practice
      if (!menu.find(item => item.id === 'courses')) {
        menu.push({
          id: "courses",
          label: "Question Bank",
          icon: BookOpen,
          section: "assessment",
        });
      }
    }

    if (hasPermission('tasks')) {
      // Add admin-level Tasks & Assignments access
      if (!menu.find(item => item.id === 'admin-tasks')) {
        menu.push({
          id: "admin-tasks",
          label: "Tasks & Assignments (Admin)",
          icon: ListTodo,
          section: "assessment",
        });
      }
    }

    if (hasPermission('classes')) {
      // Add admin-level Classes & Groups access
      if (!menu.find(item => item.id === 'all-classes')) {
        menu.push({
          id: "all-classes",
          label: "All Classes & Groups",
          icon: Layers,
          section: "management",
        });
      }
    }

    return menu;
  }

  return [];
};
