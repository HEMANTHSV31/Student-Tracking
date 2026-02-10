import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";
import logoIcon from "../../assets/logo-Icon.png";

import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BarChart3,
  Settings,
  Bell,
  Layers,
  LogOut,
  CalendarCheck,
  ClipboardCheck,
  Map,
  Home,
  Menu,
  X,
  FileSpreadsheet,
  BookOpen,
  Code,
  Braces,
  MapPin,
} from "lucide-react";

const SideTab = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const isFullBleedPage = ["group-insights", "tasks", "roadmap", "reports", "attendance", "code-practice", "venue-allocation"].some((seg) =>
    location.pathname.includes(seg),
  );

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const topPath = segments[0] || "dashboard";
    setActiveTab(topPath);
  }, [location]);

  /* ================= ROLE BASED MENU ================= */
  const menuByRole = {
    admin: [
      // Dashboard (separate)
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        section: "top",
      },

      // Faculty & Accounts + Students (one group)
      {
        id: "faculty",
        label: "Faculty & Accounts",
        icon: Users,
        section: "management",
      },
      { id: "students", label: "Students", icon: Users, section: "management" },

      // Classes & Groups + Group Insights (one group)
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
        id: "venue-allocation",
        label: "Venue Allocation",
        icon: MapPin,
        section: "classes",
      },

      // Remaining under Academic
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
        id: "skill-reports",
        label: "Progress Import",
        icon: FileSpreadsheet,
        section: "data",
      },
      // { id: 'settings', label: 'Settings', icon: Settings, section: 'system' },
    ],
    faculty: [
      // { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'main' },
      {
        id: "classes",
        label: "My Classes / Groups",
        icon: Layers,
        section: "top",
      },

      // Management Section
      { id: "students", label: "Students", icon: Users, section: "management" },

      // Academic Section
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
      // { id: 'skill-reports', label: 'Course Progress', icon: FileSpreadsheet, section: 'academic' },
      {
        id: "group-insights",
        label: "Group Insights",
        icon: BarChart3,
        section: "classes",
      },
      { id: "reports", label: "Reports", icon: BarChart3, section: "academic" },
      // { id: 'settings', label: 'Settings', icon: Settings, section: 'system' },
    ],
    student: [
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
        section: "academic",
      },
      {
        id: "attendance",
        label: "Attendance",
        icon: CalendarCheck,
        section: "academic",
      },
      // { id: 'performance', label: 'Performance', icon: BarChart3, section: 'system' },
    ],
  };

  const menuItems = menuByRole[user?.role] || [];

  const tabContent = {
    submissions: { title: "Code Evaluation" },
    dashboard: { title: "Dashboard" },
    faculty: { title: "Faculty & Accounts" },
    classes: { title: "My Classes / Groups" },
    students: { title: "Students" },
    attendance: { title: "Attendance" },
    tasks: { title: "Task & Assignment" },
    "skill-reports": { title: "Progress Import" },
    "group-insights": { title: "Group Insights" },
    "venue-allocation": { title: "Venue Allocation" },    reports: { title: "Reports" },
    roadmap: { title: "Roadmap & Material" },
    "code-practice": { title: "P Skills Practice" },
    settings: { title: "Settings" },
    courses: { title: "Question Bank" },
  };

  const handleNavigation = (id) => {
    setActiveTab(id);
    navigate(id === "dashboard" ? "/" : id);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    setIsMobileMenuOpen(false);
  };

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    return (
      <div
        key={item.id}
        style={{
          ...styles.navItem,
          ...(isActive ? styles.navItemActive : {}),
        }}
        onClick={() => handleNavigation(item.id)}
      >
        <Icon size={20} />
        <span>{item.label}</span>
      </div>
    );
  };

  const SidebarContent = () => (
    <>
      {/* LOGO */}
      <div style={styles.logo}>
        <div style={styles.logoContent}>
          <div style={styles.logoIcon}>
            <img
              src={logoIcon}
              alt="PBL Portal"
              style={{ width: 124, height: 124, objectFit: "contain" }}
            />
          </div>
          <span style={styles.logoText}>PBL Portal</span>
        </div>
      </div>

      {/* NAV + SCROLL */}
      <div style={styles.navWrapper}>
        <nav style={styles.nav}>
          {menuItems.filter((i) => i.section === "top").map(renderNavItem)}

          {menuItems.some((i) => i.section === "management") && (
            <div style={styles.navSection}>
              <div style={styles.navSectionTitle}>MANAGEMENT</div>
              {menuItems
                .filter((i) => i.section === "management")
                .map(renderNavItem)}
            </div>
          )}

          {menuItems.some((i) => i.section === "classes") && (
            <div style={styles.navSection}>
              <div style={styles.navSectionTitle}>CLASSES</div>
              {menuItems
                .filter((i) => i.section === "classes")
                .map(renderNavItem)}
            </div>
          )}

          {menuItems.some((i) => i.section === "academic") && (
            <div style={styles.navSection}>
              <div style={styles.navSectionTitle}>ACADEMIC</div>
              {menuItems
                .filter((i) => i.section === "academic")
                .map(renderNavItem)}
            </div>
          )}

          {menuItems.some((i) => i.section === "data") && (
            <div style={styles.navSection}>
              <div style={styles.navSectionTitle}>DATA</div>
              {menuItems
                .filter((i) => i.section === "data")
                .map(renderNavItem)}
            </div>
          )}

          {menuItems.some((i) => i.section === "system") && (
            <div style={styles.navSection}>
              <div style={styles.navSectionTitle}>SYSTEM</div>
              {menuItems
                .filter((i) => i.section === "system")
                .map(renderNavItem)}
            </div>
          )}
        </nav>
      </div>

      {/* LOGOUT FIXED AT BOTTOM */}
      <div style={styles.logoutWrapper}>
        <div
          style={{ ...styles.navItem, color: "#ef4444" }}
          onClick={handleLogout}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </div>
      </div>
    </>
  );

  return (
    <div style={styles.container}>
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar {
            display: none !important;
          }
          
          .hamburger-button {
            display: flex !important;
          }
          
          .header-title {
            font-size: 18px !important;
          }
          
          .user-text-mobile {
            display: none !important;
          }
        }

        @keyframes slideIn {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .close-button:hover,
        .hamburger-button:hover {
          background-color: #f3f4f6 !important;
        }
      `}</style>

      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside style={styles.sidebar} className="desktop-sidebar">
        <SidebarContent />
      </aside>

      {/* ================= MOBILE MENU OVERLAY ================= */}
      {isMobileMenuOpen && (
        <div
          style={styles.mobileOverlay}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div style={styles.mobileMenu} onClick={(e) => e.stopPropagation()}>
            <div style={styles.mobileMenuHeader}>
              <button
                className="close-button"
                style={styles.closeButton}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X size={24} />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* ================= MAIN ================= */}
      <main style={styles.mainContent}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <button
                className="hamburger-button"
                style={styles.hamburgerButton}
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu size={24} />
              </button>
              <h1 className="header-title" style={styles.headerTitle}>
                {menuItems.find((i) => i.id === activeTab)?.label ||
                  tabContent[activeTab]?.title ||
                  "Dashboard"}
              </h1>
            </div>

            <div style={styles.headerRight}>
              <button style={styles.bellButton}>
                <Bell size={24} />
              </button>

              <div style={styles.userInfo}>
                <div style={styles.userText} className="user-text-mobile">
                  <div style={styles.userName}>{user?.name || "User"}</div>
                  <div style={styles.userRole}>
                    {user?.role === 1 && "Super Admin"}
                    {user?.role === 2 && "Faculty"}
                    {user?.role === 3 && "Student"}
                  </div>
                </div>
                <div style={styles.userAvatar} />
              </div>
            </div>
          </div>
        </header>

        <div style={isFullBleedPage ? styles.contentFullBleed : styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SideTab;

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    backgroundColor: "#f9fafb",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  /* ================= SIDEBAR ================= */
  sidebar: {
    width: "260px",
    minWidth: "260px",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ffffff",
    borderRight: "1px solid #e5e7eb",
  },
  logo: {
    padding: "16px 20px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "69px",
    boxSizing: "border-box",
  },
  logoContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: "10px",
    width: "100%",
  },
  logoIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom:"-30px",
  },
  logoText: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#111827",
    lineHeight: "1",
  },

  // Scrollable menu
  navWrapper: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
  },
  navSection: {
    marginBottom: "12px",
  },
  navSectionTitle: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#9ca3af",
    padding: "0 16px",
    marginBottom: "8px",
    letterSpacing: "0.05em",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "8px",
    transition: "all 0.2s",
    color: "#6b7280",
    fontWeight: "500",
  },
  navItemActive: {
    backgroundColor: "#eff6ff",
    color: "#2563eb",
  },

  logoutWrapper: {
    padding: "5px",
    borderTop: "1px solid #e5e7eb",
  },

  /* ================= MOBILE MENU ================= */
  mobileOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 2000,
  },

  mobileMenu: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    width: "280px",
    maxWidth: "85%",
    backgroundColor: "#ffffff",
    boxShadow: "2px 0 8px rgba(0, 0, 0, 0.15)",
    display: "flex",
    flexDirection: "column",
    animation: "slideIn 0.3s ease-out",
  },

  mobileMenuHeader: {
    display: "flex",
    justifyContent: "flex-end",
    padding: "16px",
    borderBottom: "1px solid #e5e7eb",
  },

  closeButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    transition: "all 0.2s",
  },

  hamburgerButton: {
    display: "none",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    color: "#6b7280",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    transition: "all 0.2s",
  },

  /* ================= MAIN ================= */
  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },

  /* ================= HEADER ================= */
  header: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    width: "100%",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    padding: "12px 32px",
    boxSizing: "border-box",
  },
  headerContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  headerTitle: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#111827",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  bellButton: {
    padding: "8px",
    color: "#9ca3af",
    cursor: "pointer",
    border: "none",
    backgroundColor: "transparent",
  },

  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  userText: {
    textAlign: "right",
  },
  userName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#111827",
  },
  userRole: {
    fontSize: "12px",
    color: "#6b7280",
  },
  userAvatar: {
    width: "40px",
    height: "40px",
    background: "linear-gradient(135deg, #fb923c 0%, #ec4899 100%)",
    borderRadius: "50%",
  },

  /* ================= CONTENT ================= */
  content: {
    flex: 1,
    overflow: "auto",
    padding: "24px",
  },
  contentFullBleed: {
    flex: 1,
    overflow: "auto",
    padding: 0,
  },
};
