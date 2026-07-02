// Branch Manager Authentication utility
import { getBackendApiUrl } from "@/lib/config"
import { isTokenExpired } from "@/lib/sessionAuth"

export interface BranchManagerUser {
  id: string
  full_name: string
  email: string
  phone: string
  role: 'branch_manager'
  branch_id?: string
  branch_name?: string
  managed_branches?: string[]  // Array of branch IDs managed by this branch manager
}

export interface BranchManagerLoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  branch_manager: {
    id: string
    full_name: string
    email: string
    phone: string
    branch_id?: string
    branch_name?: string
  }
}

// Branch Manager Authentication Functions (mirroring SuperAdmin pattern)
export const BranchManagerAuth = {
  // Store login data in localStorage
  storeLoginData: (loginResponse: any) => {
    const { access_token, token_type, expires_in, branch_manager } = loginResponse

    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      // Return user data without storing if not in browser
      return {
        id: branch_manager.id,
        full_name: branch_manager.full_name,
        email: branch_manager.email,
        phone: branch_manager.phone,
        role: "branch_manager",
        branch_id: branch_manager.branch_assignment?.branch_id || branch_manager.branch_id,
        branch_name: branch_manager.branch_assignment?.branch_name || branch_manager.branch_name,
        managed_branches: branch_manager.managed_branches || []
      }
    }

    // Store token information
    localStorage.setItem("access_token", access_token)
    localStorage.setItem("token", access_token) // For compatibility
    localStorage.setItem("token_type", token_type)
    localStorage.setItem("expires_in", expires_in.toString())

    // Calculate and store expiration time
    const expirationTime = Date.now() + (expires_in * 1000)
    localStorage.setItem("token_expiration", expirationTime.toString())

    // Store user data - handle different API response structures
    const userData: BranchManagerUser = {
      id: branch_manager.id,
      full_name: branch_manager.full_name,
      email: branch_manager.email,
      phone: branch_manager.phone,
      role: "branch_manager",
      branch_id: branch_manager.branch_assignment?.branch_id || branch_manager.branch_id,
      branch_name: branch_manager.branch_assignment?.branch_name || branch_manager.branch_name,
      managed_branches: branch_manager.managed_branches || []
    }
    localStorage.setItem("branch_manager", JSON.stringify(userData))
    localStorage.setItem("user", JSON.stringify(userData)) // For compatibility

    return userData
  },

  // Get current user data
  getCurrentUser: (): BranchManagerUser | null => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') return null

      const userStr = localStorage.getItem("branch_manager") || localStorage.getItem("user")
      if (!userStr) return null

      const user = JSON.parse(userStr) as BranchManagerUser
      return user.role === "branch_manager" ? user : null
    } catch (error) {
      console.error("Error parsing branch manager data:", error)
      return null
    }
  },

  // Set current user data
  setCurrentUser: (userData: BranchManagerUser) => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') return

      localStorage.setItem("branch_manager", JSON.stringify(userData))
      localStorage.setItem("user", JSON.stringify(userData)) // For compatibility
    } catch (error) {
      console.error("Error storing branch manager data:", error)
    }
  },

  // Get current token
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem("access_token") || localStorage.getItem("token")
  },

  // Check if token is valid
  isTokenValid: (): boolean => {
    if (typeof window === 'undefined') return false

    const token = localStorage.getItem("access_token") || localStorage.getItem("token")
    const expirationStr = localStorage.getItem("token_expiration")

    return !isTokenExpired(token, expirationStr)
  },

  // Get authorization headers for API requests
  getAuthHeaders: (): Record<string, string> => {
    if (typeof window === 'undefined') return { "Content-Type": "application/json" }

    const token = localStorage.getItem("access_token") || localStorage.getItem("token")
    const tokenType = localStorage.getItem("token_type") || "Bearer"

    if (!token) return { "Content-Type": "application/json" }

    return {
      "Content-Type": "application/json",
      "Authorization": `${tokenType} ${token}`
    }
  },

  // Clear all authentication data
  clearAuthData: () => {
    if (typeof window === 'undefined') return

    localStorage.removeItem("access_token")
    localStorage.removeItem("token")
    localStorage.removeItem("token_type")
    localStorage.removeItem("expires_in")
    localStorage.removeItem("token_expiration")
    localStorage.removeItem("branch_manager")
    localStorage.removeItem("user")
  },

  // Check if user is authenticated branch manager
  isAuthenticated: (): boolean => {
    const user = BranchManagerAuth.getCurrentUser()
    const tokenValid = BranchManagerAuth.isTokenValid()

    return !!(user && user.role === "branch_manager" && tokenValid)
  },

  // Fetch and update managed branches for the current branch manager
  fetchManagedBranches: async (): Promise<string[]> => {
    try {
      const token = BranchManagerAuth.getToken()
      const user = BranchManagerAuth.getCurrentUser()

      if (!token || !user) {
        console.error('No authentication token or user found')
        return []
      }

      // Fetch branches using the branch manager's token
      const response = await fetch(getBackendApiUrl('branches'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('Failed to fetch branches:', response.status)
        return []
      }

      const data = await response.json()
      const branches = data.branches || []
      const managedBranchIds = branches.map((branch: any) => branch.id)

      // Update the stored user data with managed branches
      const updatedUser = { ...user, managed_branches: managedBranchIds }
      BranchManagerAuth.setCurrentUser(updatedUser)

      return managedBranchIds
    } catch (error) {
      console.error('Error fetching managed branches:', error)
      return []
    }
  },

  // Logout function
  logout: () => {
    BranchManagerAuth.clearAuthData()
    // Redirect to login page
    if (typeof window !== "undefined") {
      window.location.href = "/branch-manager/login"
    }
  }
}

// Legacy functions for backward compatibility
export interface BranchManagerAuthResult {
  isAuthenticated: boolean
  user: BranchManagerUser | null
  token: string | null
  tokenExpiration: number | null
}

export function checkBranchManagerAuth(): BranchManagerAuthResult {
  const user = BranchManagerAuth.getCurrentUser()
  const token = BranchManagerAuth.getToken()
  const isAuthenticated = BranchManagerAuth.isAuthenticated()
  const expirationStr = localStorage.getItem("token_expiration")
  const tokenExpiration = expirationStr ? parseInt(expirationStr) : null

  return {
    isAuthenticated,
    user,
    token,
    tokenExpiration
  }
}


// Legacy functions for backward compatibility
export function clearBranchManagerSession(): void {
  BranchManagerAuth.clearAuthData()
}

export function isBranchManagerTokenValid(): boolean {
  return BranchManagerAuth.isTokenValid()
}

export function getBranchManagerAuthHeaders(): Record<string, string> {
  return BranchManagerAuth.getAuthHeaders()
}

export function getCurrentBranchManager(): BranchManagerUser | null {
  return BranchManagerAuth.getCurrentUser()
}

export function isBranchManager(): boolean {
  const user = BranchManagerAuth.getCurrentUser()
  return user?.role === 'branch_manager'
}

export function requireBranchManagerAuth(redirectPath: string = '/branch-manager/login'): boolean {
  if (typeof window === 'undefined') return false

  if (!BranchManagerAuth.isAuthenticated()) {
    window.location.href = redirectPath
    return false
  }

  return true
}

/**
 * Hook-like function for branch manager authentication in React components
 */
export function useBranchManagerAuth() {
  const authResult = checkBranchManagerAuth()
  
  return {
    ...authResult,
    clearSession: clearBranchManagerSession,
    getAuthHeaders: getBranchManagerAuthHeaders,
    requireAuth: requireBranchManagerAuth,
    isBranchManager: isBranchManager
  }
}

export default BranchManagerAuth
