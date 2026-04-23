/**
 * Authentication storage utilities for separate app authentication
 * Ensures ScholarFinder and MSXpert auth data are stored separately
 */

// ScholarFinder storage keys
export const SCHOLARFINDER_STORAGE_KEYS = {
  TOKEN: 'scholarfinder_auth_token',
  USER: 'scholarfinder_user',
  REFRESH_TOKEN: 'scholarfinder_refresh_token',
  SESSION: 'scholarfinder_session',
} as const;

// MSXpert storage keys
export const MSXPERT_STORAGE_KEYS = {
  TOKEN: 'msxpert_auth_token',
  USER: 'msxpert_user',
  SESSION: 'msxpert_session',
} as const;

export class AuthStorage {
  private readonly prefix: string;

  constructor(prefix: 'scholarfinder' | 'msxpert') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}_${key}`;
  }

  setToken(token: string): void {
    localStorage.setItem(this.getKey('auth_token'), token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.getKey('auth_token'));
  }

  setUser(user: Record<string, unknown>): void {
    localStorage.setItem(this.getKey('user'), JSON.stringify(user));
  }

  getUser(): Record<string, unknown> | null {
    const userData = localStorage.getItem(this.getKey('user'));
    return userData ? JSON.parse(userData) : null;
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(this.getKey('refresh_token'), token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.getKey('refresh_token'));
  }

  setSession(sessionData: Record<string, unknown>): void {
    localStorage.setItem(this.getKey('session'), JSON.stringify(sessionData));
  }

  getSession(): Record<string, unknown> | null {
    const sessionData = localStorage.getItem(this.getKey('session'));
    return sessionData ? JSON.parse(sessionData) : null;
  }

  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(`${this.prefix}_`)) {
        localStorage.removeItem(key);
      }
    });
  }

  clearAll(): void {
    // Clear all authentication data for both apps
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('scholarfinder_') || key.startsWith('msxpert_')) {
        localStorage.removeItem(key);
      }
    });
  }
}

// Pre-configured storage instances
export const scholarFinderStorage = new AuthStorage('scholarfinder');
export const msxpertStorage = new AuthStorage('msxpert');

// Utility functions for easy access
export const getScholarFinderAuth = () => ({
  token: scholarFinderStorage.getToken(),
  user: scholarFinderStorage.getUser(),
  refreshToken: scholarFinderStorage.getRefreshToken(),
});

export const clearScholarFinderAuth = () => scholarFinderStorage.clear();
export const clearAllAuth = () => scholarFinderStorage.clearAll();