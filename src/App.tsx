import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Fabrics from './pages/Fabrics';
import Categories from './pages/Categories';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import type { Page } from './types';
import { tokenStore } from './lib/tokenStore';
import { fetchApi } from './lib/apiClient';
import logo from './assets/logo.png';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // ── Forgot-password inline panel ──────────────────────────────────────────
  // SECURITY (OWASP Forgot Password CS — Forgot Password Request):
  // Three-state panel: 'login' | 'forgot' | 'forgotSent' | 'otp' | 'reset'
  // 'forgotSent' always shows the same generic message regardless of whether
  // the email exists in the DB (prevents user enumeration).
  const [view, setView] = useState<'login' | 'forgot' | 'forgotSent' | 'otp' | 'reset'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // ── Admin MFA OTP panel states ────────────────────────────────────────────
  const [tempToken, setTempToken] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // ── Reset-password states ──────────────────────────────────────────────────
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    // Check if URL is reset-password
    const isResetPath = window.location.pathname === '/reset-password' || window.location.pathname === '/reset-password/';
    const tokenFromUrl = new URLSearchParams(window.location.search).get('token');

    if (isResetPath) {
      if (tokenFromUrl) {
        setResetToken(tokenFromUrl);
        setView('reset');
      } else {
        setResetError('Invalid or missing password reset token.');
        setView('reset');
      }
    }

    async function checkAuth() {
      try {
        // Triggers ensureToken() which does silent refresh
        const res = await fetchApi('/auth/me');
        if (res?.user?.role === 'ADMIN' || res?.user?.role === 'TAILOR') {
          setIsAuthenticated(true);
          const cached = tokenStore.getCachedUser();
          const userObj = { ...res.user };
          if (cached && cached.id === userObj.id) {
            userObj.firstName = cached.firstName || userObj.firstName;
            userObj.lastName = cached.lastName || userObj.lastName;
          }
          setCurrentUser(userObj);
          if (userObj.role === 'TAILOR') {
            setPage('orders');
          }
        } else {
          tokenStore.clear();
          setCurrentUser(null);
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

      if (res?.requiresOtp) {
        setTempToken(res.tempToken);
        setView('otp');
        return;
      }

      if (res.user?.role !== 'ADMIN' && res.user?.role !== 'TAILOR') {
        setLoginError('Access Denied: Only administrators and tailors can log in to this panel.');
        tokenStore.clear();
        return;
      }

      tokenStore.setToken(res.access_token);
      if (res.user) {
        tokenStore.setCachedUser({
          id: res.user.id,
          firstName: res.user.firstName,
          lastName: res.user.lastName,
        });
        setCurrentUser(res.user);
        if (res.user.role === 'TAILOR') {
          setPage('orders');
        }
      }
      setIsAuthenticated(true);
    } catch (err: any) {
      setLoginError(err.message || 'Wrong email or password.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setOtpError('OTP code is required.');
      return;
    }
    setVerifyingOtp(true);
    setOtpError('');
    try {
      const res = await fetchApi('/auth/admin/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ tempToken, otp: otp.trim() }),
        skipAuth: true,
      });

      if (res.user?.role !== 'ADMIN' && res.user?.role !== 'TAILOR') {
        setOtpError('Access Denied: Only administrators and tailors can log in to this panel.');
        tokenStore.clear();
        return;
      }

      tokenStore.setToken(res.access_token);
      if (res.user) {
        tokenStore.setCachedUser({
          id: res.user.id,
          firstName: res.user.firstName,
          lastName: res.user.lastName,
        });
        setCurrentUser(res.user);
        if (res.user.role === 'TAILOR') {
          setPage('orders');
        }
      }
      setIsAuthenticated(true);
      setView('login');
      setTempToken('');
      setOtp('');
    } catch (err: any) {
      setOtpError(err.message || 'Invalid OTP code.');
    } finally {
      setVerifyingOtp(false);
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
      setCurrentUser(null);
    }
  };

  /**
   * SECURITY (OWASP Forgot Password CS — Forgot Password Request):
   * - Swallows ALL errors so the UI always transitions to 'forgotSent'.
   * - This prevents user enumeration: attacker cannot tell whether the email
   *   address is registered by observing success vs. error responses.
   */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await fetchApi('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail.trim() }),
        skipAuth: true,
      });
    } catch {
      // Intentionally swallowed — always show success state.
    } finally {
      setForgotLoading(false);
      setView('forgotSent');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassword || !resetConfirmPassword) {
      setResetError('All fields are required.');
      return;
    }
    if (resetPassword.length < 8) {
      setResetError('Password must be at least 8 characters long.');
      return;
    }
    if (resetPassword.length > 128) {
      setResetError('Password must not exceed 128 characters.');
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetSuccess('');

    try {
      await fetchApi('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: resetToken,
          password: resetPassword,
          confirmPassword: resetConfirmPassword,
        }),
        skipAuth: true,
      });

      setResetSuccess('Your password has been reset successfully. You can now log in.');
      // Auto-clear auth state on successful reset (since all sessions are invalidated on backend)
      setIsAuthenticated(false);
      setCurrentUser(null);
      tokenStore.clear();
    } catch (err: any) {
      setResetError(err.message || 'Password reset failed. Please try again.');
    } finally {
      setResetLoading(false);
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

  if (!isAuthenticated || view === 'reset') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F7F3EC] px-4">
        <div className="w-full max-w-md bg-white border border-[#E5DFD5] rounded-3xl shadow-xl overflow-hidden p-8 space-y-6">
          {/* Logo / Header */}
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

          {/* ── Login Form ── */}
          {view === 'login' && (
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
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-[#1C1916]">Password</label>
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); setForgotEmail(email); }}
                    className="text-xs text-[#C8521A] font-semibold hover:text-[#b04817] transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
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
                id="admin-login-submit"
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
          )}

          {/* ── OTP Form ── */}
          {view === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => { setView('login'); setTempToken(''); setOtp(''); setOtpError(''); }}
                  className="text-xs text-[#6B6460] hover:text-[#C8521A] transition-colors mb-3 flex items-center gap-1"
                >
                  ← Back to Sign In
                </button>
                <p className="text-sm text-[#6B6460] mb-4">
                  Multi-Factor Authentication: A 6-digit verification code has been sent to your registered email.
                </p>
                <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Verification Code (OTP)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full border border-[#E5DFD5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A] transition-all text-center tracking-[0.5em] font-bold"
                  required
                />
              </div>

              {otpError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  {otpError}
                </p>
              )}

              <button
                type="submit"
                disabled={verifyingOtp}
                className="w-full bg-[#C8521A] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#b04817] transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {verifyingOtp ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Verifying…
                  </>
                ) : (
                  'Verify Code'
                )}
              </button>
            </form>
          )}

          {/* ── Forgot Password — Email Entry ── */}
          {view === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="text-xs text-[#6B6460] hover:text-[#C8521A] transition-colors mb-3 flex items-center gap-1"
                >
                  ← Back to Sign In
                </button>
                <p className="text-sm text-[#6B6460] mb-4">
                  Enter your admin email address and we&apos;ll send you a password reset link.
                </p>
                <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Email Address</label>
                <input
                  id="admin-forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="admin@jhaz-imprints.com"
                  className="w-full border border-[#E5DFD5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A] transition-all"
                  required
                />
              </div>

              <button
                id="admin-forgot-submit"
                type="submit"
                disabled={forgotLoading}
                className="w-full bg-[#C8521A] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#b04817] transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {forgotLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Sending…
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}

          {/* ── Forgot Password — Success State ── */}
          {view === 'forgotSent' && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                {/* Checkmark SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1C1916]">Check Your Email</p>
                {/* SECURITY: Same message for registered and unregistered emails */}
                <p className="text-xs text-[#6B6460] mt-1">
                  If that email address is registered, you will receive a reset link
                  shortly. The link expires in <strong>15 minutes</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setView('login'); setForgotEmail(''); }}
                className="text-xs text-[#C8521A] font-semibold hover:text-[#b04817] transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {/* ── Reset Password Form ── */}
          {view === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setResetPassword('');
                    setResetConfirmPassword('');
                    setResetError('');
                    setResetSuccess('');
                    // Clean URL query token and path
                    window.history.replaceState({}, '', '/');
                  }}
                  className="text-xs text-[#6B6460] hover:text-[#C8521A] transition-colors mb-3 flex items-center gap-1"
                >
                  ← Back to Sign In
                </button>
                <h3 className="text-lg font-semibold text-[#1C1916] mb-2" style={{ fontFamily: "'Georgia', serif" }}>
                  Reset Your Password
                </h3>
                <p className="text-xs text-[#6B6460] mb-4">
                  Please enter your new password below. It must be at least 8 characters.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">New Password</label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-[#E5DFD5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A] transition-all"
                  required
                  disabled={resetLoading || !!resetSuccess}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-[#E5DFD5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A] transition-all"
                  required
                  disabled={resetLoading || !!resetSuccess}
                />
              </div>

              {resetError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  {resetError}
                </p>
              )}

              {resetSuccess && (
                <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg p-2.5">
                  {resetSuccess}
                </p>
              )}

              {!resetSuccess ? (
                <button
                  type="submit"
                  disabled={resetLoading || !!resetError && !resetToken}
                  className="w-full bg-[#C8521A] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#b04817] transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {resetLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Resetting password…
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setResetPassword('');
                    setResetConfirmPassword('');
                    setResetError('');
                    setResetSuccess('');
                    window.history.replaceState({}, '', '/');
                  }}
                  className="w-full bg-green-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-green-700 transition-all active:scale-[0.98] flex items-center justify-center"
                >
                  Go to Sign In
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    );
  }

  const content = {
    dashboard: <Dashboard />,
    products: <Products />,
    fabrics: <Fabrics />,
    categories: <Categories />,
    profile: <Profile user={currentUser} onUpdateUser={(updated) => {
      setCurrentUser(updated);
      tokenStore.setCachedUser({
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
      });
    }} />,
    orders: <Orders userRole={currentUser?.role} />,
  }[page];

  return (
    <Layout current={page} onNavigate={setPage} user={currentUser} onLogout={handleLogout}>
      <div className="h-full flex flex-col">
        <div className="flex-1">
          {content}
        </div>
      </div>
    </Layout>
  );
}
