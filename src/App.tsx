import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Fabrics from './pages/Fabrics';
import Categories from './pages/Categories';
import type { Page } from './types';
import { tokenStore } from './lib/tokenStore';
import { fetchApi } from './lib/apiClient';
import logo from './assets/logo.png';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        // Triggers ensureToken() which does silent refresh
        const res = await fetchApi('/auth/me');
        if (res?.user?.role === 'ADMIN') {
          setIsAuthenticated(true);
        } else {
          tokenStore.clear();
        }
      } catch (e) {
        // Silent refresh failed
      } finally {
        setLoading(false);
      }
    }
    checkAuth();

    const handleAuthExpired = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLoginError('Email and password are required.');
      return;
    }
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
        skipAuth: true,
      });

      if (res.user?.role !== 'ADMIN') {
        setLoginError('Access Denied: Only administrators can log in to this panel.');
        tokenStore.clear();
        return;
      }

      tokenStore.setToken(res.access_token);
      setIsAuthenticated(true);
    } catch (err: any) {
      setLoginError(err.message || 'Wrong email or password.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore
    } finally {
      tokenStore.clear();
      setIsAuthenticated(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F7F3EC]">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#C8521A] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-[#6B6460]">Loading admin panel…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F7F3EC] px-4">
        <div className="w-full max-w-md bg-white border border-[#E5DFD5] rounded-3xl shadow-xl overflow-hidden p-8 space-y-6">
          <div className="text-center">
            <img 
              src={logo} 
              alt="Jhaz-imprints Logo" 
              className="h-20 mx-auto object-contain transition-transform duration-300 transform hover:scale-105" 
            />
            <h2 className="text-2xl font-bold text-[#1C1916] mt-4" style={{ fontFamily: "'Georgia', serif" }}>
              Jhaz Admin
            </h2>
            <p className="text-sm text-[#6B6460] mt-1">Management Portal Login</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@jhaz-imprints.com"
                className="w-full border border-[#E5DFD5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A] transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-[#E5DFD5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A] transition-all"
                required
              />
            </div>

            {loginError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-[#C8521A] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#b04817] transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loggingIn ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Logging in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const content = {
    dashboard: <Dashboard />,
    products: <Products />,
    fabrics: <Fabrics />,
    categories: <Categories />,
  }[page];

  return (
    <Layout current={page} onNavigate={setPage}>
      <div className="relative h-full flex flex-col">
        <div className="absolute top-[-52px] right-0 flex items-center gap-3 z-50">
          <button 
            onClick={handleLogout}
            className="text-xs text-[#6B6460] hover:text-[#C8521A] font-semibold border border-[#E5DFD5] rounded-lg px-3 py-1.5 bg-white hover:bg-[#FAF8F5] transition-colors"
          >
            Sign Out
          </button>
        </div>
        <div className="flex-1">
          {content}
        </div>
      </div>
    </Layout>
  );
}
