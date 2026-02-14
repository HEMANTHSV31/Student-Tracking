import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Download,
    UserCog,
    CheckSquare,
    ArrowRight,
    Briefcase,
    ClipboardList,
    Database,
    TrendingUp
} from 'lucide-react';

const AdminTools = () => {
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = React.useState(null);

    const functionCategories = [
        {
            title: 'Data Management',
            functions: [
                {
                    id: 'attendance-export',
                    title: 'Attendance Export',
                    description: 'Export attendance data with filters',
                    icon: Download,
                    color: '#6366F1', // Indigo
                    route: '/admin-tools/attendance-export'
                },
                {
                    id: 'progress-import',
                    title: 'Progress Import',
                    description: 'Import student progress from Excel',
                    icon: TrendingUp,
                    color: '#10B981', // Green
                    route: '/admin-tools/progress-import'
                }
            ]
        },
        {
            title: 'User Management',
            functions: [
                {
                    id: 'role-changer',
                    title: 'Role Changer',
                    description: 'Manage user roles and permissions',
                    icon: UserCog,
                    color: '#8B5CF6', // Purple
                    route: '/admin-tools/role-changer',
                    disabled: true // Coming soon
                }
            ]
        },
        {
            title: 'Reports & Analytics',
            functions: [
                {
                    id: 'task-completion',
                    title: 'Task Completion Report',
                    description: 'Export task completion status',
                    icon: CheckSquare,
                    color: '#6366F1', // Indigo
                    route: '/admin-tools/task-completion',
                    disabled: true // Coming soon
                }
            ]
        }
    ];

    const handleCardClick = (func) => {
        if (!func.disabled) {
            navigate(func.route);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.headerContent}>
                    <div style={styles.iconWrapper}>
                        <Briefcase size={32} color="#6366F1" />
                    </div>
                    <div>
                        <h1 style={styles.title}>Admin Tools</h1>
                        <p style={styles.subtitle}>Manage and export data across the platform</p>
                    </div>
                </div>
            </div>

            <div style={styles.content}>
                {functionCategories.map((category, index) => (
                    <div key={index} style={styles.categorySection}>
                        <h2 style={styles.categoryTitle}>{category.title}</h2>
                        <div style={styles.cardsGrid}>
                            {category.functions.map((func) => (
                                <div
                                    key={func.id}
                                    style={{
                                        ...styles.card,
                                        ...(func.disabled ? styles.cardDisabled : styles.cardActive),
                                        ...(hoveredCard === func.id && !func.disabled ? styles.cardHover : {}),
                                        borderLeft: `4px solid ${func.color}`
                                    }}
                                    onClick={() => handleCardClick(func)}
                                    onMouseEnter={() => setHoveredCard(func.id)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                >
                                    <div style={styles.cardContent}>
                                        <div
                                            style={{
                                                ...styles.iconCircle,
                                                backgroundColor: `${func.color}20`
                                            }}
                                        >
                                            <func.icon size={24} color={func.color} />
                                        </div>
                                        <div style={styles.cardText}>
                                            <h3 style={styles.cardTitle}>{func.title}</h3>
                                            <p style={styles.cardDescription}>
                                                {func.disabled ? 'Coming soon' : func.description}
                                            </p>
                                        </div>
                                    </div>
                                    {!func.disabled && (
                                        <div style={styles.arrowIcon}>
                                            <ArrowRight size={20} color="#9CA3AF" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#F9FAFB',
        padding: '0'
    },
    header: {
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        padding: '24px 32px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    },
    headerContent: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        maxWidth: '1400px',
        margin: '0 auto'
    },
    iconWrapper: {
        width: '56px',
        height: '56px',
        borderRadius: '12px',
        backgroundColor: '#EEF2FF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    title: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#111827',
        margin: '0 0 4px 0'
    },
    subtitle: {
        fontSize: '14px',
        color: '#6B7280',
        margin: '0'
    },
    content: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '32px'
    },
    categorySection: {
        marginBottom: '40px'
    },
    categoryTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '16px',
        paddingBottom: '8px',
        borderBottom: '2px solid #E5E7EB'
    },
    cardsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '20px'
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease'
    },
    cardActive: {
        cursor: 'pointer'
    },
    cardHover: {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        transform: 'translateY(-2px)'
    },
    cardDisabled: {
        opacity: 0.6,
        cursor: 'not-allowed'
    },
    cardContent: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flex: 1
    },
    iconCircle: {
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
    },
    cardText: {
        flex: 1
    },
    cardTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#111827',
        margin: '0 0 4px 0'
    },
    cardDescription: {
        fontSize: '13px',
        color: '#6B7280',
        margin: '0'
    },
    arrowIcon: {
        flexShrink: 0,
        marginLeft: '12px'
    }
};

export default AdminTools;
