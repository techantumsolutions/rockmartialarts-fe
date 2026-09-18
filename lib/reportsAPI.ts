import { BaseAPI } from './baseAPI'
import {
  validateApiResponse,
  validateObject,
  reportFiltersSchema,
  sanitizeString,
  sanitizeObject,
  safeGet,
  isString,
  isObject,
  isArray
} from './validation'
import { toast } from 'sonner'
import { getBackendApiUrl } from './config'
import { TokenManager } from './tokenManager'

export interface StudentReportListFilters {
  q?: string
  branch_id?: string
  course_id?: string
  is_active?: boolean
  start_date?: string
  end_date?: string
  skip?: number
  limit?: number
  format?: 'csv' | 'excel' | 'xlsx' | 'xls'
}

// Enhanced interface with validation
export interface ReportFilters {
  start_date?: string
  end_date?: string
  branch_id?: string
  session?: string
  class?: string
  section?: string
  fees_type?: string
  course_id?: string
  category_id?: string
  date_range?: string
  status?: string
}

export interface FinancialPaymentData {
  id: string
  student_id: string
  enrollment_id?: string
  amount: number
  payment_type: string
  payment_method: string
  payment_status: string
  transaction_id?: string
  payment_date?: string
  due_date: string
  notes?: string
  branch_name: string
  course_name: string
  formatted_amount: number
  formatted_date: string
  formatted_due_date: string
  created_at: string
}

export interface FinancialAnalytics {
  revenue_by_status: Array<{
    _id: string
    total_amount: number
    count: number
  }>
  revenue_by_method: Array<{
    _id: string
    total_amount: number
    count: number
  }>
  revenue_by_type: Array<{
    _id: string
    total_amount: number
    count: number
  }>
  revenue_by_branch: Array<{
    _id: string
    branch_name: string
    total_amount: number
    count: number
  }>
  monthly_revenue: Array<{
    _id: string
    total_amount: number
    count: number
  }>
  outstanding_payments: {
    total_amount: number
    count: number
  }
}

export interface FinancialSummary {
  total_revenue: number
  total_transactions: number
  pending_amount: number
  outstanding_amount: number
  outstanding_count: number
  average_transaction: number
}

export interface StudentReportData {
  enrollment_statistics: Array<{
    total_students: number
    course_info: {
      id: string
      title: string
      code: string
      description: string
      difficulty_level: string
      category_id: string
      instructor_id?: string
      student_requirements?: {
        max_students: number
        min_age: number
        max_age: number
        prerequisites: string[]
      }
      course_content?: {
        syllabus: string
        equipment_required: string[]
      }
      pricing?: {
        currency: string
        amount: number
        branch_specific_pricing: boolean
      }
      settings?: {
        offers_certification: boolean
        active: boolean
      }
      created_at: string
      updated_at: string
    }
  }>
  attendance_statistics: Array<{
    attendance_percentage: number
  }>
  students_by_branch: Array<{
    total_students: number
    branch_info: {
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
      is_active: boolean
      created_at: string
      updated_at: string
      location_id: string
      location: string
      name: string
      state: string
    }
  }>
}

export interface CoachReportData {
  coach_statistics: Array<{
    full_name: string
    email: string
    branch_id: string
    total_courses: number
  }>
  coach_ratings: Array<{
    _id: string
    average_rating: number
    total_ratings: number
    coach_info: {
      full_name: string
      email: string
    }
  }>
  coaches_by_branch: Array<{
    _id: string
    total_coaches: number
    branch_info: {
      name: string
      location: string
    }
  }>
}

export interface BranchReportData {
  branch_statistics: Array<{
    name: string
    location: string
    state: string
    total_students: number
    total_coaches: number
    total_courses: number
  }>
  revenue_by_branch: Array<{
    _id: string
    total_revenue: number
    total_transactions: number
    branch_info: {
      name: string
      location: string
    }
  }>
}

export interface CourseReportData {
  course_enrollment_statistics: Array<{
    title: string
    code: string
    category_name: string
    total_enrollments: number
    active_enrollments: number
  }>
  course_completion_statistics: Array<{
    _id: string
    completion_rate: number
    course_info: {
      title: string
      code: string
    }
  }>
}

export interface ReportFilterOptions {
  branches: Array<{
    id: string
    name: string
  }>
  courses: Array<{
    id: string
    title: string
    code: string
  }>
  categories: Array<{
    id: string
    name: string
  }>
  payment_types: Array<{
    id: string
    name: string
  }>
  payment_methods: Array<{
    id: string
    name: string
  }>
  payment_statuses: Array<{
    id: string
    name: string
  }>
  date_ranges: Array<{
    id: string
    name: string
  }>
  sessions: string[]
  classes: string[]
  sections: string[]
  fees_types: string[]
}

export interface FinancialReportsResponse {
  payments: FinancialPaymentData[]
  pagination: {
    total: number
    skip: number
    limit: number
    has_more: boolean
  }
  analytics: FinancialAnalytics
  summary: FinancialSummary
  filters_applied: {
    branch_id?: string
    payment_type?: string
    payment_method?: string
    payment_status?: string
    date_range?: string
    amount_min?: number
    amount_max?: number
    search?: string
  }
  generated_at: string
}

export interface FinancialReportFiltersResponse {
  filters: {
    branches: Array<{
      id: string
      name: string
    }>
    payment_types: Array<{
      id: string
      name: string
    }>
    payment_methods: Array<{
      id: string
      name: string
    }>
    payment_statuses: Array<{
      id: string
      name: string
    }>
    date_ranges: Array<{
      id: string
      name: string
    }>
  }
  generated_at: string
}

export interface StudentReportsResponse {
  student_reports: StudentReportData
  filters_applied: {
    branch_id: string | null
    course_id: string | null
    start_date: string | null
    end_date: string | null
    user_role: string
    managed_branches: string[]
  }
  generated_at: string
}

export interface CoachReportsResponse {
  coach_reports: CoachReportData
  generated_at: string
}

export interface BranchReportsResponse {
  branch_reports: BranchReportData
  generated_at: string
}

export interface CourseReportsResponse {
  course_reports: CourseReportData
  generated_at: string
}

export interface ReportFilterOptionsResponse {
  filter_options: ReportFilterOptions
}

export interface IndividualReportResponse {
  report_type: string
  data: any
  generated_at: string
}

export interface CoachData {
  id: string
  full_name: string
  first_name: string
  last_name: string
  email: string
  phone: string
  branch: {
    id: string
    name: string
    code: string
  } | null
  assigned_courses: Array<{
    id: string
    title: string
    code: string
    difficulty_level: string
  }>
  areas_of_expertise: string[]
  professional_experience: string
  designation: string
  is_active: boolean
  join_date: string | null
  created_at: string
  updated_at: string
}

export interface CoachReportsResponse {
  coachs: CoachData[]
  pagination: {
    total: number
    skip: number
    limit: number
    has_more: boolean
  }
  filters_applied: {
    branch_id?: string
    course_id?: string
    area_of_expertise?: string
    professional_experience?: string
    designation_id?: string
    active_only?: boolean
    search?: string
  }
  generated_at: string
}

export interface CoachReportFiltersResponse {
  filters: {
    branches: Array<{ id: string; name: string }>
    courses: Array<{ id: string; name: string }>
    areas_of_expertise: Array<{ id: string; name: string }>
    professional_experience: Array<{ id: string; name: string }>
    designations: Array<{ id: string; name: string }>
    active_status: Array<{ id: string; name: string }>
  }
  generated_at: string
}

// Course Report Interfaces
export interface CourseData {
  id: string
  title: string
  code: string
  description: string
  difficulty_level: string
  category_name: string
  pricing: {
    currency: string
    amount: number
    branch_specific_pricing: boolean
  }
  total_enrollments: number
  active_enrollments: number
  inactive_enrollments: number
  is_active: boolean
  offers_certification: boolean
  created_at: string
  updated_at: string
}

export interface CourseReportsResponse {
  courses: CourseData[]
  pagination: {
    total: number
    skip: number
    limit: number
    has_more: boolean
  }
  summary: {
    total_courses: number
    active_courses: number
    total_enrollments: number
    active_enrollments: number
  }
  generated_at: string
}

export interface CourseReportFiltersResponse {
  filters: {
    branches: Array<{ id: string; name: string }>
    categories: Array<{ id: string; name: string }>
    difficulty_levels: Array<{ id: string; name: string }>
    active_status: Array<{ id: string; name: string }>
  }
  generated_at: string
}

// Branch Report Interfaces
export interface BranchData {
  id: string
  branch_name: string
  branch_code: string
  location: string
  state: string
  is_active: boolean
  total_enrollments: number
  active_enrollments: number
  total_coaches: number
  active_coaches: number
  total_revenue: number
  total_transactions: number
  performance_score: number
  status: string
  created_at: string
  updated_at: string
}

export interface BranchReportsResponse {
  branches: BranchData[]
  pagination: {
    total: number
    skip: number
    limit: number
    has_more: boolean
  }
  summary: {
    total_branches: number
    active_branches: number
    total_enrollments: number
    total_revenue: number
  }
  generated_at: string
}

export interface BranchReportFiltersResponse {
  filters: {
    branches: Array<{ id: string; name: string }>
    metrics: Array<{ id: string; name: string }>
    date_ranges: Array<{ id: string; name: string }>
    statuses: Array<{ id: string; name: string }>
  }
  generated_at: string
}

class ReportsAPI extends BaseAPI {
  /**
   * Validate and sanitize report filters
   */
  private validateFilters(filters?: ReportFilters): ReportFilters {
    if (!filters) return {}

    const validation = validateObject(filters, reportFiltersSchema)
    if (!validation.isValid) {
      console.warn('Filter validation errors:', validation.errors)
      toast.error('Some filter values were corrected for safety')
    }

    return validation.sanitizedValue || {}
  }

  /**
   * Validate API response structure
   */
  private validateResponse<T>(response: any, expectedFields: string[] = []): T {
    const validation = validateApiResponse(response, expectedFields)
    if (!validation.isValid) {
      console.error('API response validation errors:', validation.errors)
      throw new Error('Invalid API response format')
    }

    return response as T
  }

  /**
   * Safe parameter building with validation
   */
  private buildParams(filters?: ReportFilters): URLSearchParams {
    const params = new URLSearchParams()
    const validatedFilters = this.validateFilters(filters)

    Object.entries(validatedFilters).forEach(([key, value]) => {
      if (value && isString(value) && value.trim()) {
        params.append(key, sanitizeString(value))
      }
    })

    return params
  }

  /**
   * Get report categories with validation
   */
  async getReportCategories(): Promise<any> {
    try {
      const endpoint = '/api/reports/categories'
      const response = await this.makeRequest(endpoint, {
        method: 'GET'
      })

      return this.validateResponse(response)
    } catch (error) {
      console.error('Error fetching report categories:', error)
      throw new Error('Failed to load report categories')
    }
  }

  /**
   * Get reports for a specific category with validation
   */
  async getCategoryReports(categoryId: string): Promise<any> {
    try {
      // Validate category ID
      if (!categoryId || !isString(categoryId)) {
        throw new Error('Invalid category ID')
      }

      const sanitizedCategoryId = sanitizeString(categoryId)
      if (!sanitizedCategoryId) {
        throw new Error('Category ID cannot be empty')
      }

      const endpoint = `/api/reports/categories/${encodeURIComponent(sanitizedCategoryId)}/reports`
      const response = await this.makeRequest(endpoint, {
        method: 'GET'
      })

      return this.validateResponse(response)
    } catch (error) {
      console.error('Error fetching category reports:', error)
      throw new Error(`Failed to load reports for category: ${categoryId}`)
    }
  }

  /**
   * Get individual report data with enhanced validation
   */
  async getIndividualReport(token: string, categoryId: string, reportId: string, filters?: ReportFilters): Promise<any> {
    try {
      // Validate inputs
      if (!token || !isString(token)) {
        throw new Error('Authentication token is required')
      }

      if (!categoryId || !isString(categoryId)) {
        throw new Error('Category ID is required')
      }

      if (!reportId || !isString(reportId)) {
        throw new Error('Report ID is required')
      }

      const sanitizedCategoryId = sanitizeString(categoryId)
      const sanitizedReportId = sanitizeString(reportId)

      if (!sanitizedCategoryId || !sanitizedReportId) {
        throw new Error('Invalid category or report ID')
      }

      // Build validated parameters
      const params = this.buildParams(filters)

      // Map to appropriate API endpoint based on category with validation
      const validCategories = ['student', 'course', 'coach', 'branch', 'financial']
      if (!validCategories.includes(sanitizedCategoryId)) {
        throw new Error(`Invalid category: ${sanitizedCategoryId}`)
      }

      let endpoint = ''
      const queryString = params.toString() ? `?${params.toString()}` : ''

      switch (sanitizedCategoryId) {
        case 'student':
          endpoint = `/api/reports/students${queryString}`
          break
        case 'course':
          endpoint = `/api/reports/courses${queryString}`
          break
        case 'coach':
          endpoint = `/api/reports/coaches${queryString}`
          break
        case 'branch':
          endpoint = `/api/reports/branches${queryString}`
          break
        case 'financial':
          endpoint = `/api/reports/financial${queryString}`
          break
      }

      const response = await this.makeRequest(endpoint, {
        method: 'GET',
        token: sanitizeString(token)
      })

      return this.validateResponse(response, ['generated_at'])
    } catch (error) {
      console.error('Error fetching individual report:', error)
      throw new Error(`Failed to load ${reportId} report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get comprehensive financial reports with enhanced filtering
   */
  async getFinancialReports(
    token: string,
    filters?: {
      branch_id?: string
      payment_type?: string
      payment_method?: string
      payment_status?: string
      date_range?: string
      amount_min?: number
      amount_max?: number
      search?: string
      skip?: number
      limit?: number
    }
  ): Promise<FinancialReportsResponse> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString())
        }
      })
    }

    const endpoint = `/api/reports/financial${params.toString() ? `?${params.toString()}` : ''}`
    return await this.makeRequest(endpoint, {
      method: 'GET',
      token
    })
  }

  /**
   * Get financial report filter options
   */
  async getFinancialReportFilters(token: string): Promise<FinancialReportFiltersResponse> {
    return await this.makeRequest('/api/reports/financial/filters', {
      method: 'GET',
      token
    })
  }

  /**
   * Get comprehensive student reports
   */
  async getStudentReports(token: string, filters?: ReportFilters): Promise<StudentReportsResponse> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
    }

    const endpoint = `/api/reports/students${params.toString() ? `?${params.toString()}` : ''}`
    return await this.makeRequest(endpoint, {
      method: 'GET',
      token
    })
  }

  /**
   * Get student report filter options (branch-specific for branch managers)
   */
  async getStudentReportFilters(token: string): Promise<any> {
    return await this.makeRequest('/api/reports/students/filters', {
      method: 'GET',
      token
    })
  }

  /**
   * M08-S02: filtered student rows for Admin/Branch Manager reports
   */
  async listStudentReportRows(
    token: string,
    filters: StudentReportListFilters = {}
  ): Promise<any> {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'format') return
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    const endpoint = `/api/reports/students/list${params.toString() ? `?${params.toString()}` : ''}`
    return await this.makeRequest(endpoint, {
      method: 'GET',
      token
    })
  }

  /**
   * M08-S02: CSV/Excel export using current authorized filters (FastAPI)
   */
  async exportStudentReports(
    filters: StudentReportListFilters = {},
    token?: string
  ): Promise<{ total: number; filename: string }> {
    const authToken = token || TokenManager.getToken()
    if (!authToken) {
      throw new Error('Authentication required')
    }

    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    })
    if (!params.has('format')) {
      params.append('format', 'csv')
    }

    const response = await fetch(
      getBackendApiUrl(`reports/students/export?${params.toString()}`),
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const detail =
        typeof errorData.detail === 'string'
          ? errorData.detail
          : `Export failed: ${response.status}`
      throw new Error(detail)
    }

    const data = await response.json()
    const blob = new Blob([data.content], { type: data.content_type || 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = data.filename || 'student_report.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    return {
      total: Number(data.total || 0),
      filename: data.filename || 'student_report.csv',
    }
  }

  /**
   * Get comprehensive coach reports
   */
  async getCoachReports(token: string, filters?: ReportFilters): Promise<CoachReportsResponse> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
    }
    
    const endpoint = `/api/reports/coaches${params.toString() ? `?${params.toString()}` : ''}`
    return await this.makeRequest(endpoint, {
      method: 'GET',
      token
    })
  }

  /**
   * Get comprehensive branch reports
   */
  async getBranchReports(token: string, filters?: ReportFilters): Promise<BranchReportsResponse> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
    }
    
    const endpoint = `/api/reports/branches${params.toString() ? `?${params.toString()}` : ''}`
    return await this.makeRequest(endpoint, {
      method: 'GET',
      token
    })
  }

  /**
   * Get comprehensive course reports
   */
  async getCourseReports(token: string, filters?: ReportFilters): Promise<CourseReportsResponse> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
    }
    
    const endpoint = `/api/reports/courses${params.toString() ? `?${params.toString()}` : ''}`
    return await this.makeRequest(endpoint, {
      method: 'GET',
      token
    })
  }

  /**
   * Get available filter options for reports
   */
  async getReportFilters(token: string): Promise<ReportFilterOptionsResponse> {
    return await this.makeRequest('/api/reports/filters', {
      method: 'GET',
      token
    })
  }

  /**
   * Get individual financial report by type
   */
  async getIndividualFinancialReport(
    token: string, 
    reportType: string, 
    filters?: ReportFilters
  ): Promise<IndividualReportResponse> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
    }
    
    const endpoint = `/api/reports/financial/${reportType}${params.toString() ? `?${params.toString()}` : ''}`
    return await this.makeRequest(endpoint, {
      method: 'GET',
      token
    })
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  /**
   * Get comprehensive coach reports
   */
  async getCoachReports(token: string, filters?: {
    branch_id?: string
    course_id?: string
    area_of_expertise?: string
    professional_experience?: string
    designation_id?: string
    active_only?: boolean
    search?: string
    skip?: number
    limit?: number
  }): Promise<CoachReportsResponse> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString())
        }
      })
    }

    const endpoint = `/api/reports/masters${params.toString() ? `?${params.toString()}` : ''}`
    const raw = await this.makeRequest(endpoint, {
      method: 'GET',
      token
    })
    return {
      coachs: raw.masters ?? [],
      pagination: raw.pagination ?? { total: 0, skip: 0, limit: 50, has_more: false },
      filters_applied: raw.filters_applied ?? {},
      generated_at: raw.generated_at ?? new Date().toISOString(),
    }
  }

  /**
   * Get available filter options for coach reports
   */
  async getCoachReportFilters(token: string): Promise<CoachReportFiltersResponse> {
    return await this.makeRequest('/api/reports/masters/filters', {
      method: 'GET',
      token
    })
  }

  /**
   * Get comprehensive course reports
   */
  async getCourseReports(token: string, filters?: {
    branch_id?: string
    category_id?: string
    difficulty_level?: string
    active_only?: boolean
    search?: string
    skip?: number
    limit?: number
  }): Promise<CourseReportsResponse> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString())
        }
      })
    }

    return await this.makeRequest(`/api/reports/courses?${params.toString()}`, {
      method: 'GET',
      token
    })
  }

  /**
   * Get available filter options for course reports
   */
  async getCourseReportFilters(token: string): Promise<CourseReportFiltersResponse> {
    return await this.makeRequest('/api/reports/courses/filters', {
      method: 'GET',
      token
    })
  }

  /**
   * Get comprehensive branch reports
   */
  async getBranchReports(token: string, filters?: {
    branch_id?: string
    metric?: string
    date_range?: string
    status?: string
    skip?: number
    limit?: number
  }): Promise<BranchReportsResponse> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString())
        }
      })
    }

    return await this.makeRequest(`/api/reports/branches?${params.toString()}`, {
      method: 'GET',
      token
    })
  }

  /**
   * Get available filter options for branch reports
   */
  async getBranchReportFilters(token: string): Promise<BranchReportFiltersResponse> {
    return await this.makeRequest('/api/reports/branches/filters', {
      method: 'GET',
      token
    })
  }

  /**
   * Format percentage for display
   */
  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`
  }
}

export const reportsAPI = new ReportsAPI()
