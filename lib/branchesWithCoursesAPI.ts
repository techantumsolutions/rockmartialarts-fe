import { TokenManager } from './tokenManager'

// Types for the API response
export interface BranchWithCourses {
  id: string
  branch: {
    name: string
    code: string
    email: string
    phone: string
    address: {
      line1: string
      area: string
      city: string
      state: string
      pincode: string
      country: string
    }
  }
  manager_id: string
  is_active: boolean
  operational_details: {
    courses_offered: string[]
    timings: Array<{
      day: string
      open: string
      close: string
    }>
    holidays: string[]
  }
  assignments: {
    accessories_available: boolean
    courses: string[]
    branch_admins: string[]
  }
  bank_details: {
    bank_name: string
    account_number: string
    upi_id: string
  }
  statistics?: {
    coach_count: number
    student_count: number
    course_count: number
    active_courses: number
  }
  courses: Array<{
    id: string
    title: string
    name: string
    code: string
    description: string
    difficulty_level: string
    pricing: {
      currency: string
      amount: number
      branch_specific_pricing: boolean
    }
    student_requirements: {
      max_students: number
      min_age: number
      max_age: number
      prerequisites: string[]
    }
    settings: {
      active: boolean
      offers_certification: boolean
    }
    created_at: string
    updated_at: string
  }>
  created_at: string
  updated_at: string
}

export interface BranchesWithCoursesResponse {
  message: string
  branches: BranchWithCourses[]
  total: number
  summary: {
    total_branches: number
    total_courses: number
    total_students: number
    total_coaches: number
  }
  filters_applied: {
    branch_id: string
    status: string
    include_inactive: boolean
  }
}

export interface BranchesWithCoursesFilters {
  branch_id?: string
  status?: 'active' | 'inactive'
  include_inactive?: boolean
}

/**
 * Fetches branches with their associated courses
 */
export async function fetchBranchesWithCourses(
  filters: BranchesWithCoursesFilters = {}
): Promise<BranchesWithCoursesResponse> {
  const token = TokenManager.getToken()
  if (!token) {
    throw new Error('Authentication token not found. Please login again.')
  }

  // Build query parameters
  const params = new URLSearchParams()
  if (filters.branch_id && filters.branch_id !== 'all') {
    params.append('branch_id', filters.branch_id)
  }
  if (filters.status) {
    params.append('status', filters.status)
  }
  if (filters.include_inactive) {
    params.append('include_inactive', 'true')
  }

  const queryString = params.toString()
  const url = `/api/branches-with-courses${queryString ? `?${queryString}` : ""}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.message || 
      errorData.error || 
      `Failed to fetch academies with courses (${response.status})`
    )
  }

  return await response.json()
}

/**
 * Extracts just the academyes data for dropdown usage
 */
export function extractBranchesForDropdown(data: BranchesWithCoursesResponse) {
  return data.branches.map(branch => ({
    id: branch.id,
    name: branch.branch.name,
    code: branch.branch.code,
    is_active: branch.is_active
  }))
}

/**
 * Extracts all courses from all academies for dropdown usage
 */
export function extractCoursesForDropdown(data: BranchesWithCoursesResponse) {
  const allCourses: Array<{
    id: string
    title: string
    code: string
    branch_id: string
    branch_name: string
    difficulty_level: string
    is_active: boolean
  }> = []

  data.branches.forEach(branch => {
    branch.courses.forEach(course => {
      allCourses.push({
        id: course.id,
        title: course.title,
        code: course.code,
        branch_id: branch.id,
        branch_name: branch.branch.name,
        difficulty_level: course.difficulty_level,
        is_active: course.settings.active
      })
    })
  })

  return allCourses
}

/**
 * Gets courses for a specific branch
 */
export function getCoursesForBranch(data: BranchesWithCoursesResponse, branchId: string) {
  const branch = data.branches.find(b => b.id === branchId)
  return branch ? branch.courses : []
}

/**
 * Hook-like function for use in React components
 */
export async function useBranchesWithCourses(filters: BranchesWithCoursesFilters = {}) {
  try {
    const data = await fetchBranchesWithCourses(filters)
    return {
      data,
      branches: extractBranchesForDropdown(data),
      courses: extractCoursesForDropdown(data),
      error: null,
      loading: false
    }
  } catch (error) {
    return {
      data: null,
      branches: [],
      courses: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      loading: false
    }
  }
}

/**
 * Example usage in reports pages:
 * 
 * // Fetch all active branches with courses
 * const data = await fetchBranchesWithCourses()
 * 
 * // Fetch specific branch
 * const branchData = await fetchBranchesWithCourses({ branch_id: 'academy-1' })
 * 
 * // Fetch including inactive branches
 * const allData = await fetchBranchesWithCourses({ include_inactive: true })
 * 
 * // Extract for dropdowns
 * const branches = extractBranchesForDropdown(data)
 * const courses = extractCoursesForDropdown(data)
 */
