// Environment configuration
export interface APIConfig {
  baseURL: string
  timeout: number
  retryAttempts: number
  isDevelopment: boolean
}

export const getAPIConfig = (): APIConfig => {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8003'
  const baseURL = raw.replace(/\/+$/, '') // avoid "//api/..." when endpoint starts with /
  const timeout = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10)
  const retryAttempts = parseInt(process.env.NEXT_PUBLIC_API_RETRY_ATTEMPTS || '3', 10)
  const isDevelopment = baseURL.includes('localhost') || baseURL.includes('127.0.0.1')

  return {
    baseURL,
    timeout,
    retryAttempts,
    isDevelopment
  }
}

// Environment-specific configurations
export const environments = {
  development: {
    baseURL: 'http://127.0.0.1:8003',
    timeout: 30000,
    retryAttempts: 3,
    isDevelopment: true
  },
  staging: {
    baseURL: 'https://staging-api.your-domain.com',
    timeout: 30000,
    retryAttempts: 3,
    isDevelopment: false
  },
  production: {
    baseURL: 'https://api.your-domain.com',
    timeout: 30000,
    retryAttempts: 2,
    isDevelopment: false
  }
}

// Get current environment
export const getCurrentEnvironment = (): keyof typeof environments => {
  if (process.env.NODE_ENV === 'production') {
    return 'production'
  }
  
  if (process.env.NEXT_PUBLIC_API_BASE_URL?.includes('staging')) {
    return 'staging'
  }
  
  return 'development'
}

// Export current config
export const apiConfig = getAPIConfig()

/**
 * Use proxy (same-origin /api/backend/...) to avoid CORS and "Method Not Allowed" when
 * the browser talks to the backend on another port. In the browser we always use the
 * proxy so requests work without relying on env being set at build time.
 */
export function getBackendApiUrl(path: string = ''): string {
  const raw = path || ''
  const p = raw.startsWith('/') ? raw.slice(1) : raw
  const useProxy =
    process.env.NEXT_PUBLIC_USE_BACKEND_PROXY === 'true' ||
    typeof window !== 'undefined'
  if (useProxy) {
    return p ? `/api/backend/${p}` : `/api/backend`
  }
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8003').replace(/\/$/, '')
  return p ? `${base}/api/${p}` : `${base}/api`
}
