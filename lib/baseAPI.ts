// Base API configuration utility
import { apiConfig, getBackendApiUrl } from './config'
import { TokenManager } from './tokenManager'
import { handleSessionExpiredFromDetail } from './sessionAuth'

/** Build full URL for an endpoint (e.g. /api/dashboard/stats). Uses proxy in browser or when NEXT_PUBLIC_USE_BACKEND_PROXY=true. */
function buildRequestUrl(endpoint: string): string {
  const useProxy =
    process.env.NEXT_PUBLIC_USE_BACKEND_PROXY === 'true' || (typeof window !== 'undefined')
  if (useProxy && endpoint.startsWith('/api/')) {
    return getBackendApiUrl(endpoint.replace(/^\/api\//, ''))
  }
  return `${apiConfig.baseURL}${endpoint}`
}

export class BaseAPI {
  protected baseURL: string
  protected timeout: number
  protected retryAttempts: number

  constructor() {
    this.baseURL = apiConfig.baseURL
    this.timeout = apiConfig.timeout
    this.retryAttempts = apiConfig.retryAttempts
  }

  // Helper method for making authenticated requests with retry logic
  protected async makeRequest(
    endpoint: string,
    options: {
      method?: string
      headers?: Record<string, string>
      body?: any
      token?: string
      retries?: number
    } = {}
  ): Promise<any> {
    const {
      method = 'GET',
      headers = {},
      body,
      token,
      retries = this.retryAttempts
    } = options

    // Build authentication headers
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      ...headers
    }

    // Add authorization header if token is provided
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`
    } else {
      // Try to get token from TokenManager as fallback
      const storedToken = TokenManager.getToken()
      if (storedToken) {
        defaultHeaders['Authorization'] = `Bearer ${storedToken}`
      } else {
        // Try to get token from environment variables as final fallback
        const envToken = process.env.NEXT_PUBLIC_AUTH_TOKEN
        if (envToken) {
          defaultHeaders['Authorization'] = `Bearer ${envToken}`
        }
      }
    }

    const url = buildRequestUrl(endpoint)
    console.log('🚀 Making API request:')
    console.log('📍 URL:', url)
    console.log('🔧 Method:', method)
    console.log('📋 Headers:', defaultHeaders)

    const config: RequestInit = {
      method,
      headers: defaultHeaders,
      cache: 'no-store',
      signal: AbortSignal.timeout(this.timeout)
    }

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body)
      console.log('📦 Request body:', JSON.stringify(body, null, 2))
    }

    try {
      const response = await fetch(url, config)
      
      console.log('📨 Response status:', response.status, response.statusText)
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()))

      let result
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json()
        console.log('📦 Response data:', JSON.stringify(result, null, 2))
      } else {
        const textResult = await response.text()
        console.log('📄 Response text:', textResult)
        result = { 
          error: `Non-JSON response: ${textResult}`,
          status: response.status 
        }
      }

      if (!response.ok) {
        const errorMessage = result.error || result.detail || result.message || `Request failed: ${response.status} ${response.statusText}`
        console.error('❌ API Error:', errorMessage)

        if (response.status === 401) {
          handleSessionExpiredFromDetail(errorMessage)
        }

        throw new Error(errorMessage)
      }

      console.log('✅ API request successful')
      return result
    } catch (error) {
      console.error('💥 Request error:', error)
      
      // Retry logic for network errors
      if (retries > 0 && this.shouldRetry(error)) {
        console.warn(`🔄 Retrying request... (${retries} attempts left)`)
        await this.delay(1000) // Wait 1 second before retry
        return this.makeRequest(endpoint, { ...options, retries: retries - 1 })
      }
      
      throw error
    }
  }

  // Determine if request should be retried
  private shouldRetry(error: any): boolean {
    // Retry on network errors, timeouts, or 5xx server errors
    return error.name === 'AbortError' || 
           error.name === 'TypeError' ||
           (error.message && error.message.includes('5'))
  }

  // Delay utility for retries
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Get base URL for other components that might need it
  getBaseURL(): string {
    return this.baseURL
  }

  // Get full configuration
  getConfig() {
    return {
      baseURL: this.baseURL,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts
    }
  }
}

// Export a singleton instance
export const baseAPI = new BaseAPI()
