/**
 * In-memory token store for access tokens.
 * 
 * SECURITY: Token is never persisted to localStorage or sessionStorage.
 * When the tab closes, the token is destroyed automatically.
 * The refresh token lives in an httpOnly cookie, protected by the browser.
 */

let accessToken: string | null = null;
let cachedUser: { id: string; firstName?: string; lastName?: string } | null = null;

export const tokenStore = {
  /**
   * Get the current access token from memory.
   */
  getToken(): string | null {
    return accessToken;
  },

  /**
   * Store a new access token in memory.
   */
  setToken(token: string | null): void {
    accessToken = token;
  },

  /**
   * Get the cached user profile details from memory.
   */
  getCachedUser(): { id: string; firstName?: string; lastName?: string } | null {
    return cachedUser;
  },

  /**
   * Cache the user profile details in memory.
   */
  setCachedUser(user: { id: string; firstName?: string; lastName?: string } | null): void {
    cachedUser = user;
  },

  /**
   * Clear the access token and cached user from memory.
   */
  clear(): void {
    accessToken = null;
    cachedUser = null;
  },

  /**
   * Check if a token is present.
   */
  hasToken(): boolean {
    return accessToken !== null;
  },

  /**
   * Decode JWT payload without verifying (for inspecting exp, etc).
   * CAUTION: This is NOT verified; use only for client-side expiry checks.
   */
  decodePayload(): Record<string, any> | null {
    if (!accessToken) return null;
    try {
      const parts = accessToken.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Failed to decode token payload:', e);
      return null;
    }
  },

  /**
   * Get token expiry time in milliseconds (from exp claim).
   * Returns null if token is not set or cannot be decoded.
   */
  getExpiryTime(): number | null {
    const payload = this.decodePayload();
    if (!payload?.exp) return null;
    return payload.exp * 1000;
  },

  /**
   * Get remaining time until token expires (in milliseconds).
   * Returns 0 if already expired or token not set.
   */
  getTimeUntilExpiry(): number {
    const expiryTime = this.getExpiryTime();
    if (!expiryTime) return 0;
    const now = Date.now();
    return Math.max(0, expiryTime - now);
  },

  /**
   * Check if token is expired.
   */
  isExpired(): boolean {
    return this.getTimeUntilExpiry() === 0;
  },

  /**
   * Check if token should be refreshed (expires in < 60 seconds).
   */
  shouldRefresh(): boolean {
    return this.getTimeUntilExpiry() < 60 * 1000; // 60 seconds
  },
};
