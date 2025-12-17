import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Anchor, Users, FileText, LogOut, LayoutDashboard, Timer, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Layout() {
    const { signOut, user } = useAuth();
    const location = useLocation();

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Divers', path: '/divers', icon: Users },
        { name: 'Jobs', path: '/jobs', icon: Anchor },
        { name: 'Log Dive', path: '/log-dive', icon: Timer },
        { name: 'Reports', path: '/reports', icon: FileText },
        { name: 'Library', path: '/library', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-deep-900 text-slate-100 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-deep-800 border-r border-ocean-900/50 flex flex-col shadow-xl z-20">
                <div className="p-6 border-b border-ocean-900/50 bg-deep-950/20">
                    <div className="flex items-center space-x-3">
                        {/* Logo Icon */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-700 flex items-center justify-center shadow-lg shadow-ocean-500/20">
                            <Anchor className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xl font-bold tracking-tight text-white block">Diverlog</span>
                            <span className="text-[10px] text-ocean-400 uppercase tracking-wider">Offshore Ops</span>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                                    isActive
                                        ? "bg-ocean-900/40 text-ocean-300 border border-ocean-800/50 shadow-inner"
                                        : "text-slate-400 hover:bg-ocean-900/20 hover:text-ocean-200"
                                )}
                            >
                                <Icon className={cn("w-5 h-5", isActive ? "text-ocean-400" : "text-slate-500 group-hover:text-ocean-400")} />
                                <span className={cn("font-medium", isActive ? "text-ocean-100" : "")}>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-ocean-900/50 bg-deep-950/10">
                    <div className="flex items-center space-x-3 px-4 py-3 mb-2 rounded-lg bg-deep-900/50 border border-white/5">
                        <div className="w-8 h-8 rounded-full bg-ocean-800 flex items-center justify-center text-xs font-bold border border-ocean-700">
                            {user?.email?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-medium truncate text-slate-200">{user?.email}</p>
                            <p className="text-[10px] text-slate-500">Supervisor</p>
                        </div>
                    </div>

                    <button
                        onClick={() => signOut()}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-slate-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-deep-900 relative">
                <div className="absolute inset-0 bg-[url('/login-bg.png')] opacity-[0.03] pointer-events-none bg-cover bg-center mix-blend-overlay fixed"></div>
                {/* Top bar logic usually goes here later */}

                <div className="p-8 relative z-10 max-w-7xl mx-auto min-h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
