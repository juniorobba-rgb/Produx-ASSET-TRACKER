import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

export function Sidebar() {
  const { profile, logout } = useAuth();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/assets', icon: Package, label: 'Assets' },
  ];

  if (profile?.role === 'admin') {
    navItems.push({ to: '/settings', icon: Settings, label: 'Settings' });
  }

  return (
    <div className="w-64 border-r border-white/10 bg-black/20 backdrop-blur-xl flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] shrink-0">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-xl tracking-tight leading-none">Produx</span>
            <span className="text-[9px] font-bold text-blue-400 tracking-[0.2em] mt-1">ASSET TRACKER</span>
          </div>
        </div>
      </div>

      <div className="flex-1 py-6 px-4 flex flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm font-medium text-white border border-white/10">
            {profile?.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.displayName}</p>
            <p className="text-xs text-slate-400 truncate capitalize">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
