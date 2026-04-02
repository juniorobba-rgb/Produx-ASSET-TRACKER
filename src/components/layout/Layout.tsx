import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-900/20 blur-[120px]" />
      </div>

      <div className="relative z-10 flex w-full h-full">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="h-full p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
