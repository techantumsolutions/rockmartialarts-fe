/**
 * Coach Authentication Utilities
 * Provides robust authentication checking specifically for coach dashboard
 */

export interface CoachData {
  id: string
  full_name: string
  email?: string
  role?: string
  contact_info?: {
    email: string
    phone?: string
  }
  personal_info?: {
    first_name: string
    last_name: string
  }
  is_active?: boolean
  [key: string]: any
}

export interface CoachAuthResult {
  isAuthenticated: boolean
  coach: CoachData | null
  token: string | null
  error?: string
}

/**
 * Comprehensive coach authentication check
 * Handles multiple token storage patterns and validates coach data
 */
export function checkCoachAuth(): CoachAuthResult {
  try {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return {
        isAuthenticated: false,
        coach: null,
        token: null,
        error: 'Not in browser environment'
      }
    }

    // Try to get token from multiple possible locations
    const token = localStorage.getItem("access_token") ||
                  localStorage.getItem("token")

    // Validate JWT token format and decode payload
    let tokenPayload = null
    let isValidJWT = false

    try {
      if (token && token.includes('.')) {
        const parts = token.split('.')
        if (parts.length === 3) {
          const base64Payload = parts[1]
          if (base64Payload) {
            // Add padding if needed
            const paddedPayload = base64Payload + '='.repeat((4 - base64Payload.length % 4) % 4)
            tokenPayload = JSON.parse(atob(paddedPayload))
            isValidJWT = true

            // Check if token is expired
            if (tokenPayload.exp && tokenPayload.exp * 1000 < Date.now()) {
              console.warn("🕐 JWT token is expired")
              clearCoachSession()
              return {
                isAuthenticated: false,
                coach: null,
                token: null,
                error: 'JWT token expired'
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("⚠️ Could not decode JWT token:", e)
    }

    // Optional: Keep minimal logging for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log("🔍 Coach auth check:", {
        isAuthenticated: isValidJWT && !!tokenPayload,
        hasToken: !!token,
        role: tokenPayload?.role,
        tokenExpiry: tokenPayload?.exp ? new Date(tokenPayload.exp * 1000).toISOString() : 'no expiration'
      })
    }

    if (!token) {
      return {
        isAuthenticated: false,
        coach: null,
        token: null,
        error: 'No authentication token found'
      }
    }

    // Validate that JWT token is a coach token.
    // Never clear session for other roles (super_admin / branch_manager / student) —
    // shared localStorage keys are used across dashboards.
    if (isValidJWT && tokenPayload) {
      const role = String(tokenPayload.role || "").toLowerCase().replace(/-/g, "_")
      if (!tokenPayload.sub || role !== "coach") {
        console.warn("⚠️ JWT token is not a coach session:", {
          hasSub: !!tokenPayload.sub,
          role: tokenPayload.role,
        })
        return {
          isAuthenticated: false,
          coach: null,
          token: null,
          error: "Not a coach session",
        }
      }
    }

    // Check token expiration
    const tokenExpiration = localStorage.getItem("token_expiration")
    if (tokenExpiration) {
      const expirationTime = parseInt(tokenExpiration)
      if (Date.now() >= expirationTime) {
        // Clear expired session
        clearCoachSession()
        return {
          isAuthenticated: false,
          coach: null,
          token: null,
          error: 'Authentication token has expired'
        }
      }
    }

    // Try to get coach data from multiple possible locations
    let coachData: CoachData | null = null
    
    // First try the dedicated coach storage
    const coachDataStr = localStorage.getItem("coach")
    if (coachDataStr) {
      try {
        coachData = JSON.parse(coachDataStr)
      } catch (error) {
        console.warn("Failed to parse coach data from 'coach' key:", error)
      }
    }

    // If no coach data found, try the user storage (from TokenManager)
    if (!coachData) {
      const userDataStr = localStorage.getItem("user")
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr)
          // Check if this user data represents a coach
          if (userData.role === "coach" || userData.id) {
            coachData = userData
          }
        } catch (error) {
          console.warn("Failed to parse user data:", error)
        }
      }
    }

    // If still no coach data, try auth_data (from AuthContext)
    if (!coachData) {
      const authDataStr = localStorage.getItem("auth_data")
      if (authDataStr) {
        try {
          const authData = JSON.parse(authDataStr)
          if (authData.user && (authData.user.role === "coach" || authData.user.id)) {
            coachData = authData.user
          }
        } catch (error) {
          console.warn("Failed to parse auth data:", error)
        }
      }
    }

    if (!coachData) {
      return {
        isAuthenticated: false,
        coach: null,
        token: null,
        error: 'No coach data found in storage'
      }
    }

    // Validate coach data structure
    if (!coachData.id) {
      return {
        isAuthenticated: false,
        coach: null,
        token: null,
        error: 'Invalid coach data: missing ID'
      }
    }

    // Ensure coach has a name
    if (!coachData.full_name && coachData.personal_info) {
      coachData.full_name = `${coachData.personal_info.first_name || ''} ${coachData.personal_info.last_name || ''}`.trim()
    }

    return {
      isAuthenticated: true,
      coach: coachData,
      token: token,
      error: undefined
    }

  } catch (error) {
    console.error("Error checking coach authentication:", error)
    return {
      isAuthenticated: false,
      coach: null,
      token: null,
      error: `Authentication check failed: ${error}`
    }
  }
}

/**
 * Clear all coach session data
 */
export function clearCoachSession(): void {
  if (typeof window === 'undefined') return

  // Clear all possible token and user data locations
  const keysToRemove = [
    "access_token",
    "token",
    "token_type", 
    "expires_in",
    "token_expiration",
    "coach",
    "user",
    "auth_data"
  ]

  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
  })

  console.log("Coach session cleared")
}

/**
 * Get coach authentication headers for API requests
 */
export function getCoachAuthHeaders(): Record<string, string> {
  const authResult = checkCoachAuth()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (authResult.isAuthenticated && authResult.token) {
    headers['Authorization'] = `Bearer ${authResult.token}`
  }

  return headers
}

/**
 * Hook-like function for coach authentication in React components
 */
export function useCoachAuth() {
  const authResult = checkCoachAuth()
  
  return {
    ...authResult,
    clearSession: clearCoachSession,
    getAuthHeaders: getCoachAuthHeaders
  }
}
