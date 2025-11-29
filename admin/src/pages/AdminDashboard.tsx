import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Ticket, Users, SignOut, ShieldCheck, Sparkle } from '@phosphor-icons/react';

interface AdminDashboardProps {
    onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
    const navItems = [
        { to: '/coupons', icon: Ticket, label: 'Coupon Manager' },
        { to: '/users', icon: Users, label: 'User Manager' },
    ];

    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/[0.06] bg-surface/50 backdrop-blur-xl flex flex-col flex-shrink-0 relative">
                {/* Ambient glow */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                {/* Header */}
                <div className="relative p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-white/10">
                            <ShieldCheck size={22} weight="duotone" className="text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-textMain">Voicory</h1>
                            <p className="text-xs text-primary font-medium">Admin Panel</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 p-4">
                    <div className="flex items-center gap-2 px-3 mb-3">
                        <Sparkle size={10} weight="fill" className="text-primary/60" />
                        <h3 className="text-[10px] font-semibold text-textMuted/60 uppercase tracking-widest">Management</h3>
                    </div>

                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-textMain border border-primary/20 shadow-lg shadow-primary/5'
                                        : 'text-textMuted hover:text-textMain hover:bg-white/[0.03] border border-transparent'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon
                                            size={18}
                                            weight={isActive ? "fill" : "regular"}
                                            className={isActive ? 'text-primary' : 'text-textMuted group-hover:text-textMain'}
                                        />
                                        <span className="text-sm font-medium">{item.label}</span>
                                        {isActive && (
                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                {/* Logout */}
                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-textMuted hover:text-error hover:bg-error/10 transition-all duration-200"
                    >
                        <SignOut size={18} weight="bold" />
                        <span className="text-sm font-medium">Logout</span>
                    </button>
                </div>

                {/* Security Badge */}
                <div className="p-4 pt-0">
                    <div className="px-3 py-2 bg-warning/10 border border-warning/20 rounded-xl">
                        <p className="text-[10px] text-warning font-medium">🔒 LOCAL ACCESS ONLY</p>
                        <p className="text-[10px] text-textSubtle">Not deployed to production</p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
