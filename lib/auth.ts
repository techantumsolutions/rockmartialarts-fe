// Authentication utility for different backend API formats
import { isTokenExpired } from "@/lib/sessionAuth"
export interface AuthConfig {
  tokenType: 'Bearer' | 'API-Key' | 'Token' | 'Custom'
  headerName: string
  tokenValue: string
  customHeaders?: Record<string, string>
}

// SuperAdmin user data interface
export interface SuperAdminUser {
  id: string
  full_name: string
  email: string
  phone: string
  role: 'superadmin'
}

// Login response interface
export interface SuperAdminLoginResponse {
  status: string
  message: string
  data: {
    id: string
    full_name: string
    email: string
    phone: string
    token: string
    token_type: string
    expires_in: number
  }
}

// Default configurations for common authentication methods
export const authConfigs = {
  jwt: {
    tokenType: 'Bearer' as const,
    headerName: 'Authorization',
    tokenValue: 'valid-super-admin-token'
  },
  apiKey: {
    tokenType: 'API-Key' as const,
    headerName: 'X-API-Key',
    tokenValue: 'your-api-key-here'
  },
  token: {
    tokenType: 'Token' as const,
    headerName: 'Authorization',
    tokenValue: 'your-token-here'
  },
  custom: {
    tokenType: 'Custom' as const,
    headerName: 'Authorization',
    tokenValue: 'custom-token',
    customHeaders: {
      'X-User-Role': 'super_admin',
      'X-App-Version': '1.0.0'
    }
  }
}

// SuperAdmin Authentication Functions
export const SuperAdminAuth = {
  // Store login data in localStorage
  storeLoginData: (loginResponse: SuperAdminLoginResponse) => {
    if (typeof window === "undefined") {
      throw new Error("storeLoginData must be called in the browser")
    }
    const { data } = loginResponse
    
    // Store token information
    localStorage.setItem("token", data.token)
    localStorage.setItem("token_type", data.token_type)
    localStorage.setItem("expires_in", data.expires_in.toString())
    
    // Calculate and store expiration time
    const expirationTime = Date.now() + (data.expires_in * 1000)
    localStorage.setItem("token_expiration", expirationTime.toString())
    
    // Store user data
    const userData: SuperAdminUser = {
      id: data.id,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      role: "superadmin"
    }
    localStorage.setItem("user", JSON.stringify(userData))
    
    return userData
  },

  // Get current user data
  getCurrentUser: (): SuperAdminUser | null => {
    if (typeof window === "undefined") return null
    try {
      const userStr = localStorage.getItem("user")
      if (!userStr) return null
      
      const user = JSON.parse(userStr) as SuperAdminUser
      return user.role === "superadmin" ? user : null
    } catch (error) {
      console.error("Error parsing user data:", error)
      return null
    }
  },

  // Get current token
  getToken: (): string | null => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("token")
  },

  // Check if token is valid
  isTokenValid: (): boolean => {
    if (typeof window === "undefined") return false
    const token = localStorage.getItem("token")
    const expirationStr = localStorage.getItem("token_expiration")
    return !isTokenExpired(token, expirationStr)
  },

  // Get authorization headers for API requests
  getAuthHeaders: (): Record<string, string> => {
    if (typeof window === "undefined") {
      return { "Content-Type": "application/json" }
    }
    const token = localStorage.getItem("token")
    const tokenType = localStorage.getItem("token_type") || "bearer"
    
    if (!token) return { "Content-Type": "application/json" }
    
    return {
      "Content-Type": "application/json",
      "Authorization": `${tokenType} ${token}`
    }
  },

  // Clear all authentication data
  clearAuthData: () => {
    if (typeof window === "undefined") return
    localStorage.removeItem("token")
    localStorage.removeItem("token_type")
    localStorage.removeItem("expires_in")
    localStorage.removeItem("token_expiration")
    localStorage.removeItem("user")
  },

  // Check if user is authenticated superadmin
  isAuthenticated: (): boolean => {
    const user = SuperAdminAuth.getCurrentUser()
    const tokenValid = SuperAdminAuth.isTokenValid()
    
    return !!(user && user.role === "superadmin" && tokenValid)
  },

  // Logout function
  logout: () => {
    SuperAdminAuth.clearAuthData()
    // Redirect to login page
    if (typeof window !== "undefined") {
      window.location.href = "/superadmin/login"
    }
  }
}

// Helper function to format authentication headers
export function formatAuthHeaders(config: AuthConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  // Add main authentication header
  if (config.tokenType === 'Custom') {
    headers[config.headerName] = config.tokenValue
  } else {
    headers[config.headerName] = `${config.tokenType} ${config.tokenValue}`
  }

  // Add any custom headers
  if (config.customHeaders) {
    Object.assign(headers, config.customHeaders)
  }

  return headers
}

// Get current auth configuration (can be overridden via environment)
export function getCurrentAuthConfig(): AuthConfig {
  const authType = process.env.NEXT_PUBLIC_AUTH_TYPE || 'jwt'
  const authToken = process.env.NEXT_PUBLIC_AUTH_TOKEN || 'valid-super-admin-token'

  switch (authType) {
    case 'apikey':
      return { ...authConfigs.apiKey, tokenValue: authToken }
    case 'token':
      return { ...authConfigs.token, tokenValue: authToken }
    case 'custom':
      return { ...authConfigs.custom, tokenValue: authToken }
    default:
      return { ...authConfigs.jwt, tokenValue: authToken }
  }
}

// Backward compatibility exports for superadmin authentication
export function checkAuth(): { isAuthenticated: boolean } {
  return {
    isAuthenticated:
      typeof window !== "undefined" && SuperAdminAuth.isAuthenticated(),
  }
}

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return { "Content-Type": "application/json" }
  }
  return SuperAdminAuth.getAuthHeaders()
}