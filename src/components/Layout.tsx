import React from 'react';
import {
  LayoutDashboard,
  Package,
  Scissors,
  Tag,
  Menu,
  X,
} from 'lucide-react';
import type { Page } from '../types';
import logo from '../assets/logo.png';

interface LayoutProps {
  current: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}

const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
  { page: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { page: 'products', label: 'Products', icon: <Package size={18} /> },
  { page: 'fabrics', label: 'Fabrics', icon: <Scissors size={18} /> },
  { page: 'categories', label: 'Categories', icon: <Tag size={18} /> },
];

export default function Layout({ current, onNavigate, children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-[#F7F3EC] overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-[#1C1916] flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:flex-shrink-0
        `}
      >
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 px-6 py-6 border-b border-white/10 w-full">
          <img 
            src={logo} 
            alt="Jhaz-imprints Logo" 
            className="h-24 w-24 object-contain brightness-0 invert transition-transform duration-300 transform-gpu will-change-transform [backface-visibility:hidden] hover:scale-105" 
          />
          <span className="text-[#9A8F87] text-[10px] font-bold tracking-widest uppercase mt-1">Admin Dashboard</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map(({ page, label, icon }) => (
            <button
              key={page}
              onClick={() => {
                onNavigate(page);
                setMobileOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${
                  current === page
                    ? 'bg-[#C8521A] text-white shadow-lg shadow-[#C8521A]/30'
                    : 'text-[#9A8F87] hover:bg-white/5 hover:text-white'
                }
              `}
            >
              {icon}
              {label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10">
          <p className="text-[#4A4340] text-xs">Heritage. Crafted for You.</p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#E5DFD5] flex-shrink-0">
          <button
            className="lg:hidden p-1.5 rounded-lg text-[#6B6460] hover:bg-[#F7F3EC]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="hidden lg:block">
            <h1
              className="text-lg font-semibold text-[#1C1916] capitalize"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              {current === 'dashboard' ? 'Overview' : current}
            </h1>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <div className="w-8 h-8 rounded-full bg-[#C8521A] flex items-center justify-center text-white text-sm font-semibold">
              A
            </div>
            <span className="text-sm text-[#1C1916] font-medium hidden sm:block">Admin</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
