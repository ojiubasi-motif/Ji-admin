import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Scissors,
  Tag,
  Menu,
  X,
  User,
  ClipboardList,
  LogOut,
} from 'lucide-react';
import type { Page } from '../types';
import logo from '../assets/logo.png';

interface LayoutProps {
  current: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
  user: { email: string; firstName?: string; lastName?: string; role: string } | null;
  onLogout: () => void;
}

const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
  { page: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { page: 'products', label: 'Products', icon: <Package size={18} /> },
  { page: 'fabrics', label: 'Fabrics', icon: <Scissors size={18} /> },
  { page: 'categories', label: 'Categories', icon: <Tag size={18} /> },
];

export default function Layout({ current, onNavigate, children, user, onLogout }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user
    ? (((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() || user.email[0].toUpperCase())
    : 'A';

  const displayName = user
    ? (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email.split('@')[0])
    : 'Admin';

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
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-[#FAF8F5] transition-colors focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-[#C8521A] flex items-center justify-center text-white text-sm font-semibold select-none">
                  {initials}
                </div>
                <span className="text-sm text-[#1C1916] font-medium hidden sm:block">
                  {displayName}
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E5DFD5] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    onClick={() => {
                      onNavigate('profile');
                      setDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-[#6B6460] hover:bg-[#FAF8F5] hover:text-[#C8521A] transition-colors flex items-center gap-2 font-medium"
                  >
                    <User size={15} />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('orders');
                      setDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-[#6B6460] hover:bg-[#FAF8F5] hover:text-[#C8521A] transition-colors flex items-center gap-2 font-medium"
                  >
                    <ClipboardList size={15} />
                    <span>My Orders</span>
                  </button>
                  <div className="h-px bg-[#E5DFD5] my-1" />
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 font-semibold"
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
