import { BaseAPI } from './baseAPI'

export interface SearchResult {
  id: string
  type: 'users' | 'coaches' | 'courses' | 'branches'
  title: string
  subtitle?: string
  description?: string
  metadata?: Record<string, any>
}

export interface GlobalSearchResponse {
  query: string
  total_results: number
  results: {
    users?: {
      data: any[]
      count: number
      type: string
    }
    coaches?: {
      data: any[]
      count: number
      type: string
    }
    courses?: {
      data: any[]
      count: number
      type: string
    }
    branches?: {
      data: any[]
      count: number
      type: string
    }
  }
  message: string
}

export interface SearchUsersResponse {
  query: string
  users: any[]
  total: number
  count: number
  message: string
}

export interface SearchCoachesResponse {
  query: string
  coaches: any[]
  total: number
  count: number
  message: string
}

export interface SearchCoursesResponse {
  query: string
  courses: any[]
  total: number
  count: number
  message: string
}

export interface SearchBranchesResponse {
  query: string
  branches: any[]
  total: number
  count: number
  message: string
}

class SearchAPI extends BaseAPI {
  /**
   * Perform global search across all entities
   */
  async globalSearch(
    query: string,
    token: string,
    options?: {
      type?: 'users' | 'coaches' | 'courses' | 'branches'
      limit?: number
    }
  ): Promise<GlobalSearchResponse> {
    const params = new URLSearchParams({ q: query })
    
    if (options?.type) {
      params.append('type', options.type)
    }
    
    if (options?.limit) {
      params.append('limit', options.limit.toString())
    }

    return await this.makeRequest(`/api/search/global?${params.toString()}`, {
      method: 'GET',
      token
    })
  }

  /**
   * Search specifically in users
   */
  async searchUsers(
    query: string,
    token: string,
    options?: {
      role?: string
      branch_id?: string
      limit?: number
    }
  ): Promise<SearchUsersResponse> {
    const params = new URLSearchParams({ q: query })
    
    if (options?.role) {
      params.append('role', options.role)
    }
    
    if (options?.branch_id) {
      params.append('branch_id', options.branch_id)
    }
    
    if (options?.limit) {
      params.append('limit', options.limit.toString())
    }

    return await this.makeRequest(`/api/search/users?${params.toString()}`, {
      method: 'GET',
      token
    })
  }

  /**
   * Search specifically in coaches
   */
  async searchCoaches(
    query: string,
    token: string,
    options?: {
      area_of_expertise?: string
      active_only?: boolean
      limit?: number
    }
  ): Promise<SearchCoachesResponse> {
    const params = new URLSearchParams({ q: query })
    
    if (options?.area_of_expertise) {
      params.append('area_of_expertise', options.area_of_expertise)
    }
    
    if (options?.active_only !== undefined) {
      params.append('active_only', options.active_only.toString())
    }
    
    if (options?.limit) {
      params.append('limit', options.limit.toString())
    }

    return await this.makeRequest(`/api/search/coaches?${params.toString()}`, {
      method: 'GET',
      token
    })
  }

  /**
   * Search specifically in courses
   */
  async searchCourses(
    query: string,
    token: string,
    options?: {
      category_id?: string
      difficulty_level?: string
      active_only?: boolean
      limit?: number
    }
  ): Promise<SearchCoursesResponse> {
    const params = new URLSearchParams({ q: query })
    
    if (options?.category_id) {
      params.append('category_id', options.category_id)
    }
    
    if (options?.difficulty_level) {
      params.append('difficulty_level', options.difficulty_level)
    }
    
    if (options?.active_only !== undefined) {
      params.append('active_only', options.active_only.toString())
    }
    
    if (options?.limit) {
      params.append('limit', options.limit.toString())
    }

    return await this.makeRequest(`/api/search/courses?${params.toString()}`, {
      method: 'GET',
      token
    })
  }

  /**
   * Search specifically in academies
   */
  async searchBranches(
    query: string,
    token: string,
    options?: {
      active_only?: boolean
      limit?: number
    }
  ): Promise<SearchBranchesResponse> {
    const params = new URLSearchParams({ q: query })
    
    if (options?.active_only !== undefined) {
      params.append('active_only', options.active_only.toString())
    }
    
    if (options?.limit) {
      params.append('limit', options.limit.toString())
    }

    return await this.makeRequest(`/api/search/branches?${params.toString()}`, {
      method: 'GET',
      token
    })
  }

  /**
   * Transform search results into a unified format for display
   */
  transformResults(response: GlobalSearchResponse): SearchResult[] {
    const results: SearchResult[] = []

    // Transform users
    if (response.results.users?.data) {
      response.results.users.data.forEach(user => {
        results.push({
          id: user.id,
          type: 'users',
          title: user.full_name || user.email,
          subtitle: user.email,
          description: `${user.role} - ${user.phone || 'No phone'}`,
          metadata: user
        })
      })
    }

    // Transform coaches
    if (response.results.coaches?.data) {
      response.results.coaches.data.forEach(coach => {
        results.push({
          id: coach.id,
          type: 'coaches',
          title: coach.full_name,
          subtitle: coach.contact_info?.email,
          description: coach.areas_of_expertise?.join(', ') || 'Coach',
          metadata: coach
        })
      })
    }

    // Transform courses
    if (response.results.courses?.data) {
      response.results.courses.data.forEach(course => {
        results.push({
          id: course.id,
          type: 'courses',
          title: course.name,
          subtitle: course.difficulty_level,
          description: course.description,
          metadata: course
        })
      })
    }

    // Transform branches
    if (response.results.branches?.data) {
      response.results.branches.data.forEach(branch => {
        results.push({
          id: branch.id,
          type: 'branches',
          title: branch.branch?.name || 'Academy',
          subtitle: branch.branch?.address?.city,
          description: `${branch.branch?.address?.street}, ${branch.branch?.address?.state}`,
          metadata: branch
        })
      })
    }

    return results
  }
}

// Export singleton instance
export const searchAPI = new SearchAPI()
export { SearchAPI }
