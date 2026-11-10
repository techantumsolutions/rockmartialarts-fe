"use client"

// Authentication context and token management
import React, { createContext, useContext, useState, useEffect } from 'react'

export interface User {
  id: string
  email: string
  role: string
  first_name: string
  last_name: string
  full_name: string
  date_of_birth: string
  gender: string
  course: {
    category_id: string
    course_id: string
    duration: string
  }
  branch: {
    location_id: string
    branch_id: string
  }
}

export interface AuthState {
  access_token: string | null
  token_type: string
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface AuthContextType extends AuthState {
  login: (token: string, tokenType: string, user: User) => void
  logout: () => void
  updateToken: (token: string) => void
  getAuthHeaders: () => Record<string, string>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    access_token: null,
    token_type: 'bearer',
    user: null,
    isAuthenticated: false,
    isLoading: true
  })

  // Load auth data from localStorage on mount (no mock/auto-login)
  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem('auth_data')

      if (storedAuth) {
        const parsedAuth = JSON.parse(storedAuth)
        setAuthState({
          ...parsedAuth,
          isAuthenticated: !!parsedAuth.access_token,
          isLoading: false
        })
      } else {
        setAuthState({
          access_token: null,
          token_type: 'bearer',
          user: null,
          isAuthenticated: false,
          isLoading: false
        })
      }
    } catch (error) {
      console.error('Error loading auth data:', error)
      setAuthState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  const login = (token: string, tokenType: string, user: User) => {
    const authData = {
      access_token: token,
      token_type: tokenType,
      user,
      isAuthenticated: true,
      isLoading: false
    }
    
    setAuthState(authData)
    localStorage.setItem('auth_data', JSON.stringify(authData))
  }

  const logout = () => {
    setAuthState({
      access_token: null,
      token_type: 'bearer',
      user: null,
      isAuthenticated: false,
      isLoading: false
    })
    localStorage.removeItem('auth_data')
  }

  const updateToken = (token: string) => {
    setAuthState(prev => {
      const updated = { ...prev, access_token: token }
      localStorage.setItem('auth_data', JSON.stringify(updated))
      return updated
    })
  }

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (authState.access_token) {
      headers['Authorization'] = `${authState.token_type} ${authState.access_token}`
    }

    return headers
  }

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    updateToken,
    getAuthHeaders
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper function to get token from environment or auth context
export function getAuthToken(): string {
  // Try to get from environment variables first (for API testing)
  const envToken = process.env.NEXT_PUBLIC_AUTH_TOKEN
  if (envToken) {
    return envToken
  }

  // Try to get from localStorage
  try {
    const storedAuth = localStorage.getItem('auth_data')
    if (storedAuth) {
      const parsedAuth = JSON.parse(storedAuth)
      return parsedAuth.access_token || ''
    }
  } catch (error) {
    console.error('Error getting auth token:', error)
  }

  return ''
}
