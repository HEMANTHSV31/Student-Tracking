import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Download,
    UserCog,
    CheckSquare,
    ArrowRight,
    ClipboardList,
    Database,
    TrendingUp,
    MapPin
} from 'lucide-react';
import './AdminTools.css';

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
                    route: '/admin-tools/role-changer'
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
        },
        {
            title: 'Assessment Management',
            functions: [
                {
                    id: 'pbl-assessment',
                    title: 'PBL Assessment Allocation',
                    description: 'Smart seat allocation for assessments',
                    icon: MapPin,
                    color: '#F59E0B', // Amber
                    route: '/admin-tools/pbl-assessment'
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
        <div className="at-container">
            <div className="at-content">
                {functionCategories.map((category, index) => (
                    <section key={index} className="at-category">
                        <h2 className="at-category-title">{category.title}</h2>
                        <div className="at-cards-grid">
                            {category.functions.map((func) => (
                                <article
                                    key={func.id}
                                    className={`at-card ${func.disabled ? 'at-card--disabled' : 'at-card--active'} ${hoveredCard === func.id && !func.disabled ? 'at-card--hover' : ''}`}
                                    onClick={() => handleCardClick(func)}
                                    onMouseEnter={() => setHoveredCard(func.id)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                    style={{ borderLeft: `4px solid ${func.color}` }}
                                    tabIndex={func.disabled ? -1 : 0}
                                >
                                    <div className="at-card-content">
                                        <div className="at-icon-circle" style={{ backgroundColor: `${func.color}20` }}>
                                            <func.icon size={22} color={func.color} />
                                        </div>
                                        <div className="at-card-text">
                                            <h3 className="at-card-title">{func.title}</h3>
                                            <p className="at-card-description">{func.disabled ? 'Coming soon' : func.description}</p>
                                        </div>
                                    </div>
                                    {!func.disabled && (
                                        <div className="at-arrow-icon">
                                            <ArrowRight size={18} color="#9CA3AF" />
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
};

export default AdminTools;
