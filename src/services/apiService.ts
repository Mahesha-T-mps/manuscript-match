/**
 * Base API service class with Axios configuration and error handling
 * Provides centralized HTTP client with authentication, error handling, and request/response interceptors
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { config } from '../lib/config';
import type { 
  ApiResponse, 
  UserFriendlyError, 
  RequestConfig
} from '../types/api';

/**
 * Global request tracking to prevent duplicate HTTP requests
 */
class GlobalRequestTracker {
  private static ongoingRequests = new Map<string, Promise<any>>();
  
  static createRequestKey(method: string, url: string, data?: any): string {
    const dataString = data ? JSON.stringify(data) : '';
    return `${method.toUpperCase()}-${url}-${dataString}`;
  }
  
  static hasOngoingRequest(key: string): boolean {
    return this.ongoingRequests.has(key);
  }
  
  static getOngoingRequest(key: string): Promise<any> | undefined {
    return this.ongoingRequests.get(key);
  }
  
  static setOngoingRequest(key: string, promise: Promise<any>): void {
    this.ongoingRequests.set(key, promise);
    // Auto-cleanup after promise resolves
    promise.finally(() => {
      this.ongoingRequests.delete(key);
    });
  }
  
  static clearAll(): void {
    this.ongoingRequests.clear();
  }
  
  static getOngoingRequestKeys(): string[] {
    return Array.from(this.ongoingRequests.keys());
  }
}

/**
 * Configuration interface for API service
 */
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
}

/**
 * Token management utilities with enhanced JWT handling
 */
export class TokenManager {
  private static readonly TOKEN_KEY = 'scholarfinder_token';
  private static readonly REFRESH_TOKEN_KEY = 'scholarfinder_refresh_token';
  
  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }
  
  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
  
  static setRefreshToken(refreshToken: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }
  
  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }
  
  static clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }
  
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
  
  static getTokenPayload(token: string): any {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }
  
  static getTokenExpirationTime(token: string): number | null {
    try {
      const payload = this.getTokenPayload(token);
      return payload?.exp ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }
  
  static isTokenExpiringSoon(token: string, thresholdMinutes: number = 5): boolean {
    try {
      const expirationTime = this.getTokenExpirationTime(token);
      if (!expirationTime) return true;
      
      const thresholdTime = Date.now() + (thresholdMinutes * 60 * 1000);
      return expirationTime <= thresholdTime;
    } catch {
      return true;
    }
  }
}

/**
 * Error handling utilities
 */
export class ErrorHandler {
  static handle(error: any): UserFriendlyError {
    // Network errors (no response)
    if (!error.response) {
      // Check for specific empty response error
      if (error.message?.includes('ERR_EMPTY_RESPONSE') || error.code === 'ERR_EMPTY_RESPONSE') {
        return {
          type: 'NETWORK_ERROR',
          message: 'The server connection was interrupted during file upload. This may be due to a large file or slow connection. Please try uploading a smaller file or check your internet connection.',
          action: 'RETRY'
        };
      }
      
      return {
        type: 'NETWORK_ERROR',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        action: 'RETRY'
      };
    }

    const { status, data } = error.response;

    // Authentication errors
    if (status === 401) {
      // Use the error message from the backend if available
      const errorMessage = data?.error?.message || data?.message || 'Your session has expired. Please log in again.';
      
      return {
        type: 'AUTHENTICATION_ERROR',
        message: errorMessage,
        action: 'REDIRECT_TO_LOGIN'
      };
    }

    // Gateway Timeout (504) - special handling for long-running operations
    if (status === 504) {
      return {
        type: 'GATEWAY_TIMEOUT',
        message: 'The operation is taking longer than expected but may still be processing in the background. You can try checking the results later or proceed to the next step.',
        action: 'RETRY',
        details: { status: 504, originalError: error }
      };
    }

    // Rate limiting errors
    if (status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
      return {
        type: 'RATE_LIMIT_ERROR',
        message: `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
        action: 'RETRY',
        retryAfter
      };
    }

    // Validation errors
    if (status === 400 || status === 409) {
      // Use the error message from the backend if available
      const errorMessage = data?.error?.message || data?.message || 'Invalid request data. Please check your input and try again.';
      
      return {
        type: 'VALIDATION_ERROR',
        message: errorMessage,
        details: data?.error?.details || data?.details
      };
    }

    // Server errors (but not 504 which is handled above)
    if (status >= 500) {
      return {
        type: 'SERVER_ERROR',
        message: 'A server error occurred. Please try again later or contact support if the problem persists.',
        action: 'CONTACT_SUPPORT'
      };
    }

    // Other client errors
    if (status >= 400) {
      // Use the error message from the backend if available
      const errorMessage = data?.error?.message || data?.message || 'An unexpected error occurred. Please try again.';
      
      return {
        type: 'UNKNOWN_ERROR',
        message: errorMessage,
        details: data?.error?.details || data
      };
    }

    // Fallback for unknown errors
    return {
      type: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred. Please try again.',
      details: error
    };
  }
}

/**
 * Base API service class
 */
export class ApiService {
  private axiosInstance: AxiosInstance;
  private authToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(apiConfig?: Partial<ApiConfig>) {
    const defaultConfig: ApiConfig = {
      baseURL: config.apiBaseUrl,
      timeout: config.apiTimeout,
      retries: 3
    };

    const finalConfig = { ...defaultConfig, ...apiConfig };

    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: finalConfig.baseURL,
      timeout: finalConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Set up request interceptors
    this.setupRequestInterceptors();

    // Set up response interceptors
    this.setupResponseInterceptors();

    // Initialize with stored token if available
    const storedToken = TokenManager.getToken();
    if (storedToken && !TokenManager.isTokenExpired(storedToken)) {
      this.setAuthToken(storedToken);
    }
  }

  /**
   * Set authentication token for API requests
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    TokenManager.setToken(token);
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = null;
    delete this.axiosInstance.defaults.headers.common['Authorization'];
    TokenManager.clearToken();
  }

  /**
   * Get current authentication token
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authToken !== null && !TokenManager.isTokenExpired(this.authToken);
  }

  /**
   * Add subscriber for token refresh
   */
  private addRefreshSubscriber(callback: (token: string) => void): void {
    this.refreshSubscribers.push(callback);
  }

  /**
   * Notify all refresh subscribers
   */
  private notifyRefreshSubscribers(token: string): void {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  }

  /**
   * Refresh authentication token
   */
  private async refreshAuthToken(): Promise<string> {
    if (this.isRefreshing) {
      // If already refreshing, wait for the current refresh to complete
      return new Promise((resolve) => {
        this.addRefreshSubscriber(resolve);
      });
    }

    this.isRefreshing = true;

    try {
      const refreshToken = TokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.axiosInstance.post('/api/auth/refresh', {
        refreshToken
      });

      const { token, refreshToken: newRefreshToken } = response.data;
      
      this.setAuthToken(token);
      if (newRefreshToken) {
        TokenManager.setRefreshToken(newRefreshToken);
      }

      this.notifyRefreshSubscribers(token);
      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearAuthToken();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Setup request interceptors
   */
  private setupRequestInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      async (requestConfig) => {
        // Add timestamp to prevent caching (but not for admin endpoints which might have issues)
        if (requestConfig.method === 'get' && !requestConfig.url?.includes('/admin/')) {
          requestConfig.params = {
            ...requestConfig.params,
            _t: Date.now()
          };
        }

        // Handle automatic token refresh
        const token = this.authToken;
        if (token && TokenManager.isTokenExpiringSoon(token)) {
          try {
            await this.refreshAuthToken();
          } catch (error) {
            console.error('Failed to refresh token in request interceptor:', error);
            // Continue with existing token - let response interceptor handle 401
          }
        }

        // Log request in development
        if (config.enableDevTools) {
          console.log(`[API Request] ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`, {
            params: requestConfig.params,
            data: requestConfig.data
          });
        }

        return requestConfig;
      },
      (error) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Setup response interceptors
   */
  private setupResponseInterceptors(): void {
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log response in development
        if (config.enableDevTools) {
          console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data
          });
        }

        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle authentication errors with token refresh
        // BUT: Don't try to refresh token for login/register endpoints
        const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                               originalRequest.url?.includes('/auth/register') ||
                               originalRequest.url?.includes('/auth/refresh');
        
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
          originalRequest._retry = true;

          try {
            // Attempt to refresh token
            const newToken = await this.refreshAuthToken();
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.axiosInstance.request(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed, redirecting to login:', refreshError);
            
            // Clear authentication state
            this.clearAuthToken();
            
            // Redirect to login page
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            
            return Promise.reject(refreshError);
          }
        }

        // Log error in development
        if (config.enableDevTools) {
          console.error('[API Response Error]', {
            status: error.response?.status,
            message: error.message,
            data: error.response?.data
          });
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Make HTTP request with error handling and retry logic
   */
  async request<T = any>(requestConfig: RequestConfig): Promise<ApiResponse<T>> {
    // 🔥 FORCE FIX: Disable retries for manual_authors and validate_authors endpoints
    if (requestConfig.url?.includes('manual_authors') || requestConfig.url?.includes('validate_authors')) {
      requestConfig.retries = 0;
      console.log('🔥 FORCED retries to 0 for manual_authors/validate_authors endpoint');
    }
    
    // 🔥 GLOBAL REQUEST DEDUPLICATION for manual_authors endpoint
    if (requestConfig.url?.includes('manual_authors')) {
      const requestKey = GlobalRequestTracker.createRequestKey(
        requestConfig.method || 'GET',
        requestConfig.url,
        requestConfig.data
      );
      
      console.log('[ApiService] 🔍 Checking for duplicate manual_authors request');
      console.log('[ApiService] 🔑 Request key:', requestKey);
      console.log('[ApiService] 📊 Ongoing requests:', GlobalRequestTracker.getOngoingRequestKeys());
      
      if (GlobalRequestTracker.hasOngoingRequest(requestKey)) {
        console.log('[ApiService] 🚫 DUPLICATE HTTP REQUEST detected, returning existing promise');
        console.log('[ApiService] 🔑 Duplicate key:', requestKey);
        return GlobalRequestTracker.getOngoingRequest(requestKey)!;
      }
    }
    
    // Allow overriding retries per request (default to 3)
    const maxRetries = requestConfig.retries !== undefined ? requestConfig.retries : 3;
    let lastError: any;

    // Debug log to verify retries configuration
    if (config.enableDevTools && requestConfig.url?.includes('manual_authors')) {
      console.log(`[API Request] ${requestConfig.method} ${requestConfig.url}`);
      console.log(`[API Request] retries config:`, requestConfig.retries);
      console.log(`[API Request] maxRetries:`, maxRetries);
    }

    // Create the request promise for manual_authors endpoints
    let requestPromise: Promise<ApiResponse<T>> | null = null;
    
    if (requestConfig.url?.includes('manual_authors')) {
      const requestKey = GlobalRequestTracker.createRequestKey(
        requestConfig.method || 'GET',
        requestConfig.url,
        requestConfig.data
      );
      
      requestPromise = this.executeRequest<T>(requestConfig, maxRetries);
      GlobalRequestTracker.setOngoingRequest(requestKey, requestPromise);
      console.log('[ApiService] 💾 Stored HTTP request promise for key:', requestKey);
      
      return requestPromise;
    }

    // For non-manual_authors endpoints, execute normally
    return this.executeRequest<T>(requestConfig, maxRetries);
  }

  /**
   * Execute the actual HTTP request with retry logic
   */
  private async executeRequest<T = any>(requestConfig: RequestConfig, maxRetries: number): Promise<ApiResponse<T>> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const axiosConfig: AxiosRequestConfig = {
          method: requestConfig.method,
          url: requestConfig.url,
          data: requestConfig.data,
          params: requestConfig.params,
          headers: requestConfig.headers,
          timeout: requestConfig.timeout,
        };

        const response = await this.axiosInstance.request<ApiResponse<T>>(axiosConfig);
        return response.data;
      } catch (error) {
        lastError = error;
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Check if we should retry this error
        const shouldRetry = this.shouldRetryRequest(error);
        if (!shouldRetry) {
          break;
        }

        // Calculate retry delay with exponential backoff
        const delay = this.getRetryDelay(attempt, error);
        
        // Log retry attempt in development
        if (config.enableDevTools) {
          console.log(`[API Retry] Attempt ${attempt + 1}/${maxRetries} for ${requestConfig.method} ${requestConfig.url} in ${delay}ms`);
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries failed, throw the last error
    const userError = ErrorHandler.handle(lastError);
    
    // Create a proper Error object with the user-friendly message
    const error = new Error(userError.message);
    // Attach the full userError object for additional context
    (error as any).userError = userError;
    (error as any).type = userError.type;
    (error as any).details = userError.details;
    (error as any).action = userError.action;
    (error as any).retryAfter = userError.retryAfter;
    
    // Preserve original error information for debugging
    (error as any).originalError = lastError;
    (error as any).response = lastError?.response;
    (error as any).status = lastError?.response?.status;
    
    throw error;
  }

  /**
   * Determine if a request should be retried
   */
  private shouldRetryRequest(error: any): boolean {
    // 🔥 NEVER retry manual_authors or validate_authors endpoints
    if (error.config?.url?.includes('manual_authors') || error.config?.url?.includes('validate_authors')) {
      console.log('🔥 NOT retrying manual_authors/validate_authors endpoint');
      return false;
    }
    
    // Don't retry if no response (might be network issue, but could be CORS, etc.)
    if (!error.response) {
      return true; // Retry network errors
    }

    const status = error.response.status;

    // Don't retry client errors (except 429)
    if (status >= 400 && status < 500 && status !== 429) {
      return false;
    }

    // Retry server errors and rate limiting
    if (status >= 500 || status === 429) {
      return true;
    }

    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private getRetryDelay(attemptNumber: number, error?: any): number {
    // Use retry-after header for rate limit errors
    if (error?.response?.status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
      return retryAfter * 1000;
    }

    // Exponential backoff with jitter
    const baseDelay = 1000;
    const maxDelay = 30000;
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
    
    // Add jitter (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    
    return Math.max(exponentialDelay + jitter, baseDelay);
  }

  /**
   * Convenience methods for different HTTP methods
   */
  async get<T = any>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'GET',
      url,
      params
    });
  }

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'POST',
      url,
      data
    });
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    console.log('ApiService PUT request:', { url, data });
    const result = await this.request<T>({
      method: 'PUT',
      url,
      data
    });
    console.log('ApiService PUT response:', result);
    return result;
  }

  async patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'PATCH',
      url,
      data
    });
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'DELETE',
      url
    });
  }

  /**
   * Upload multiple files with progress tracking and extended timeout
   */
  async uploadFiles<T = any>(
    url: string, 
    files: File[], 
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    
    // Add all files to the form data
    files.forEach((file, index) => {
      formData.append('files', file);
    });

    // Calculate timeout based on total file size and count
    const baseTimeout = 10 * 60 * 1000; // 10 minutes
    const totalSizeInMB = files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
    const fileCountTimeout = files.length * 2 * 60 * 1000; // 2 minutes per file
    const sizeTimeout = Math.ceil(totalSizeInMB / 10) * 2 * 60 * 1000; // 2 minutes per 10MB
    const uploadTimeout = Math.max(baseTimeout + fileCountTimeout + sizeTimeout, 15 * 60 * 1000); // Minimum 15 minutes

    console.log(`[ApiService] Multi-file upload timeout: ${uploadTimeout}ms (${uploadTimeout/1000/60} minutes) for ${files.length} files (${totalSizeInMB.toFixed(1)}MB total)`);

    try {
      const response = await this.axiosInstance.post<ApiResponse<T>>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: uploadTimeout, // Dynamic timeout based on file size and count
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });

      return response.data;
    } catch (error) {
      console.error('[ApiService] Multi-file upload error:', error);
      const userError = ErrorHandler.handle(error);
      const err = new Error(userError.message);
      (err as any).userError = userError;
      (err as any).type = userError.type;
      throw err;
    }
  }

  /**
   * Upload file with progress tracking and extended timeout for large files
   */
  async uploadFile<T = any>(
    url: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    // Calculate timeout based on file size (minimum 10 minutes, add 2 minutes per 10MB)
    const baseTimeout = 10 * 60 * 1000; // 10 minutes
    const fileSizeInMB = file.size / (1024 * 1024);
    const additionalTimeout = Math.ceil(fileSizeInMB / 10) * 2 * 60 * 1000; // 2 minutes per 10MB
    const uploadTimeout = Math.max(baseTimeout + additionalTimeout, 15 * 60 * 1000); // Minimum 15 minutes

    console.log(`[ApiService] Upload timeout: ${uploadTimeout}ms (${uploadTimeout/1000/60} minutes) for ${fileSizeInMB.toFixed(1)}MB file`);

    try {
      const response = await this.axiosInstance.post<ApiResponse<T>>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: uploadTimeout, // Dynamic timeout based on file size
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });

      return response.data;
    } catch (error) {
      console.error('[ApiService] Upload error:', error);
      const userError = ErrorHandler.handle(error);
      const err = new Error(userError.message);
      (err as any).userError = userError;
      (err as any).type = userError.type;
      throw err;
    }
  }

  /**
   * Download file
   */
  async downloadFile(url: string, filename?: string): Promise<void> {
    try {
      const response = await this.axiosInstance.get(url, {
        responseType: 'blob',
      });

      // Create blob link to download
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      const userError = ErrorHandler.handle(error);
      const err = new Error(userError.message);
      (err as any).userError = userError;
      (err as any).type = userError.type;
      throw err;
    }
  }
}

// Create and export default API service instance
export const apiService = new ApiService();

export default apiService;