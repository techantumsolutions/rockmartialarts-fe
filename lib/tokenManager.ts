// Unified token management utility for consistent authentication across the app
import { isTokenExpired } from "@/lib/sessionAuth"

export interface TokenData {
  access_token: string
  token_type: string
  expires_in: number
  token_expiration: number
}

export interface UserData {
  id: string
  full_name: string
  email: string
  role: string
  [key: string]: any // Allow additional user properties
}

export interface AuthData {
  access_token: string
  token_type: string
  expires_in: number
  token_expiration: number
  user: UserData
}

/**
 * Unified Token Manager for consistent authentication across all login types
 */
export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'access_token'
  private static readonly TOKEN_TYPE_KEY = 'token_type'
  private static readonly EXPIRES_IN_KEY = 'expires_in'
  private static readonly TOKEN_EXPIRATION_KEY = 'token_expiration'
  private static readonly USER_KEY = 'user'
  private static readonly AUTH_DATA_KEY = 'auth_data'

  /**
   * Store authentication data consistently across all login types
   */
  static storeAuthData(authData: {
    access_token?: string
    token?: string // Support both token formats
    token_type?: string
    expires_in?: number
    user?: UserData
    admin?: UserData // Support superadmin format
    coach?: UserData // Support coach format
  }): UserData {
    // Normalize token field
    const token = authData.access_token || authData.token
    if (!token) {
      throw new Error('No token provided in authentication data')
    }

    // Normalize user data
    let userData: UserData
    if (authData.user) {
      userData = authData.user
    } else if (authData.admin) {
      userData = authData.admin
    } else if (authData.coach) {
      userData = authData.coach
    } else {
      throw new Error('No user data provided in authentication data')
    }

    // Calculate expiration time
    const expiresIn = authData.expires_in || 86400 // Default 24 hours
    const expirationTime = Date.now() + (expiresIn * 1000)

    // Store individual items for backward compatibility
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token)
    localStorage.setItem('token', token) // Backward compatibility for existing code
    localStorage.setItem(this.TOKEN_TYPE_KEY, authData.token_type || 'bearer')
    localStorage.setItem(this.EXPIRES_IN_KEY, expiresIn.toString())
    localStorage.setItem(this.TOKEN_EXPIRATION_KEY, expirationTime.toString())
    localStorage.setItem(this.USER_KEY, JSON.stringify(userData))

    // Store unified auth data for AuthContext compatibility
    const unifiedAuthData: AuthData = {
      access_token: token,
      token_type: authData.token_type || 'bearer',
      expires_in: expiresIn,
      token_expiration: expirationTime,
      user: userData
    }
    localStorage.setItem(this.AUTH_DATA_KEY, JSON.stringify(unifiedAuthData))

    console.log('✅ Authentication data stored successfully:', {
      user_id: userData.id,
      full_name: userData.full_name,
      email: userData.email,
      role: userData.role,
      token_preview: token.substring(0, 20) + '...',
      expires_in: expiresIn,
      expiration_time: new Date(expirationTime).toISOString()
    })

    return userData
  }

  /**
   * Get current authentication token
   */
  static getToken(): string | null {
    if (typeof window === 'undefined') return null
    // Prefer unified key; fall back to legacy 'token' for older login flows
    return localStorage.getItem(this.ACCESS_TOKEN_KEY) || localStorage.getItem('token')
  }

  /**
   * Get current user data
   */
  static getUser(): UserData | null {
    if (typeof window === 'undefined') return null
    
    try {
      const userStr = localStorage.getItem(this.USER_KEY)
      return userStr ? JSON.parse(userStr) : null
    } catch (error) {
      console.error('Error parsing user data:', error)
      return null
    }
  }

  /**
   * Get complete auth data
   */
  static getAuthData(): AuthData | null {
    if (typeof window === 'undefined') return null
    
    try {
      const authStr = localStorage.getItem(this.AUTH_DATA_KEY)
      return authStr ? JSON.parse(authStr) : null
    } catch (error) {
      console.error('Error parsing auth data:', error)
      return null
    }
  }

  /**
   * Check if user is authenticated and token is valid
   */
  static isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false
    
    const token = this.getToken()
    const expirationStr = localStorage.getItem(this.TOKEN_EXPIRATION_KEY)
    
    if (!token) return false

    return !isTokenExpired(token, expirationStr)
  }

  /**
   * Check if user has specific role
   */
  static hasRole(role: string): boolean {
    const user = this.getUser()
    return user?.role === role
  }

  /**
   * Get authorization headers for API requests
   */
  static getAuthHeaders(): Record<string, string> {
    const token = this.getToken()
    const tokenType = localStorage.getItem(this.TOKEN_TYPE_KEY) || 'Bearer'
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (token) {
      headers['Authorization'] = `${tokenType} ${token}`
    }
    
    return headers
  }

  /**
   * Clear all authentication data
   */
  static clearAuthData(): void {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem(this.ACCESS_TOKEN_KEY)
    localStorage.removeItem(this.TOKEN_TYPE_KEY)
    localStorage.removeItem(this.EXPIRES_IN_KEY)
    localStorage.removeItem(this.TOKEN_EXPIRATION_KEY)
    localStorage.removeItem(this.USER_KEY)
    localStorage.removeItem(this.AUTH_DATA_KEY)
    
    // Clear legacy token keys for backward compatibility
    localStorage.removeItem('token')
    localStorage.removeItem('coach')
    
    console.log('🧹 Authentication data cleared')
  }

  /**
   * Refresh token expiration time
   */
  static refreshToken(newToken: string, expiresIn?: number): void {
    if (typeof window === 'undefined') return
    
    const expires = expiresIn || 86400
    const expirationTime = Date.now() + (expires * 1000)
    
    localStorage.setItem(this.ACCESS_TOKEN_KEY, newToken)
    localStorage.setItem(this.EXPIRES_IN_KEY, expires.toString())
    localStorage.setItem(this.TOKEN_EXPIRATION_KEY, expirationTime.toString())
    
    // Update unified auth data
    const authData = this.getAuthData()
    if (authData) {
      authData.access_token = newToken
      authData.expires_in = expires
      authData.token_expiration = expirationTime
      localStorage.setItem(this.AUTH_DATA_KEY, JSON.stringify(authData))
    }
    
    console.log('🔄 Token refreshed successfully')
  }

  /**
   * Get time until token expires (in milliseconds)
   */
  static getTimeUntilExpiration(): number {
    if (typeof window === 'undefined') return 0
    
    const expirationStr = localStorage.getItem(this.TOKEN_EXPIRATION_KEY)
    if (!expirationStr) return 0
    
    const expirationTime = parseInt(expirationStr)
    return Math.max(0, expirationTime - Date.now())
  }

  /**
   * Check if token will expire soon (within 5 minutes)
   */
  static isTokenExpiringSoon(): boolean {
    const timeUntilExpiration = this.getTimeUntilExpiration()
    return timeUntilExpiration > 0 && timeUntilExpiration < 5 * 60 * 1000 // 5 minutes
  }
}

// Export convenience functions
export const {
  storeAuthData,
  getToken,
  getUser,
  getAuthData,
  isAuthenticated,
  hasRole,
  getAuthHeaders,
  clearAuthData,
  refreshToken,
  getTimeUntilExpiration,
  isTokenExpiringSoon
} = TokenManager
