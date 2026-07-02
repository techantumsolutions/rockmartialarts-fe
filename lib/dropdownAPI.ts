import { BaseAPI } from './baseAPI'

// Interface for dropdown option
export interface DropdownOption {
  value: string
  label: string
  is_active: boolean
  order?: number
}

// Interface for dropdown category
export interface DropdownCategory {
  id?: string
  category: string
  options: DropdownOption[]
  created_at?: string
  updated_at?: string
}

// Supported dropdown categories
export type DropdownCategoryType = 
  | 'countries'
  | 'designations'
  | 'specializations'
  | 'experience_ranges'
  | 'genders'
  | 'emergency_relations'
  | 'qualifications'
  | 'passing_years'
  | 'difficulty_levels'
  | 'banks'
  | 'locations'
  | 'course_durations'
  | 'student_levels'

export class DropdownAPI extends BaseAPI {
  private readonly endpoint = '/api/dropdown-settings'

  /**
   * Get all dropdown categories
   */
  async getAllCategories(token: string): Promise<DropdownCategory[]> {
    return this.makeRequest(`${this.endpoint}`, {
      method: 'GET',
      token
    })
  }

  /**
   * Get options for a specific category
   */
  async getCategoryOptions(category: DropdownCategoryType, token?: string): Promise<DropdownOption[]> {
    return this.makeRequest(`${this.endpoint}/${category}`, {
      method: 'GET',
      token
    })
  }

  /**
   * Update options for a specific category
   */
  async updateCategoryOptions(
    category: DropdownCategoryType, 
    options: DropdownOption[], 
    token: string
  ): Promise<DropdownCategory> {
    return this.makeRequest(`${this.endpoint}/${category}`, {
      method: 'PUT',
      body: { options },
      token
    })
  }

  /**
   * Add a new option to a category
   */
  async addOption(
    category: DropdownCategoryType, 
    option: DropdownOption, 
    token: string
  ): Promise<DropdownCategory> {
    return this.makeRequest(`${this.endpoint}/${category}/options`, {
      method: 'POST',
      body: option,
      token
    })
  }

  /**
   * Delete an option from a category
   */
  async deleteOption(
    category: DropdownCategoryType, 
    value: string, 
    token: string
  ): Promise<void> {
    return this.makeRequest(`${this.endpoint}/${category}/options/${encodeURIComponent(value)}`, {
      method: 'DELETE',
      token
    })
  }

  /**
   * Reset a category to default options
   */
  async resetCategory(category: DropdownCategoryType, token: string): Promise<DropdownCategory> {
    return this.makeRequest(`${this.endpoint}/${category}/reset`, {
      method: 'POST',
      token
    })
  }

  /**
   * Get default options for a category (without authentication)
   */
  getDefaultOptions(category: DropdownCategoryType): DropdownOption[] {
    const defaults: Record<DropdownCategoryType, DropdownOption[]> = {
      countries: [
        { value: 'India', label: 'India', is_active: true, order: 1 },
        { value: 'USA', label: 'USA', is_active: true, order: 2 },
        { value: 'UK', label: 'UK', is_active: true, order: 3 },
        { value: 'Canada', label: 'Canada', is_active: true, order: 4 },
        { value: 'Australia', label: 'Australia', is_active: true, order: 5 },
      ],
      designations: [
        { value: 'Founder', label: 'Founder', is_active: true, order: 0 },
        { value: 'Senior Coach', label: 'Senior Coach', is_active: true, order: 1 },
        { value: 'Coach Instructor', label: 'Coach Instructor', is_active: true, order: 2 },
        { value: 'Senior Instructor', label: 'Senior Instructor', is_active: true, order: 3 },
        { value: 'Instructor', label: 'Instructor', is_active: true, order: 4 },
        { value: 'Assistant Instructor', label: 'Assistant Instructor', is_active: true, order: 5 },
        { value: 'Head Coach', label: 'Head Coach', is_active: true, order: 6 },
        { value: 'Coach', label: 'Coach', is_active: true, order: 7 },
        { value: 'Assistant Coach', label: 'Assistant Coach', is_active: true, order: 8 },
      ],
      specializations: [
        { value: 'Taekwondo', label: 'Taekwondo', is_active: true, order: 1 },
        { value: 'Karate', label: 'Karate', is_active: true, order: 2 },
        { value: 'Kung Fu', label: 'Kung Fu', is_active: true, order: 3 },
        { value: 'Kick Boxing', label: 'Kick Boxing', is_active: true, order: 4 },
        { value: 'Self Defense', label: 'Self Defense', is_active: true, order: 5 },
        { value: 'Mixed Martial Arts', label: 'Mixed Martial Arts', is_active: true, order: 6 },
        { value: 'Judo', label: 'Judo', is_active: true, order: 7 },
        { value: 'Jiu-Jitsu', label: 'Jiu-Jitsu', is_active: true, order: 8 },
        { value: 'Muay Thai', label: 'Muay Thai', is_active: true, order: 9 },
        { value: 'Boxing', label: 'Boxing', is_active: true, order: 10 },
        { value: 'Kuchipudi Dance', label: 'Kuchipudi Dance', is_active: true, order: 11 },
        { value: 'Bharatanatyam', label: 'Bharatanatyam', is_active: true, order: 12 },
        { value: 'Gymnastics', label: 'Gymnastics', is_active: true, order: 13 },
        { value: 'Yoga', label: 'Yoga', is_active: true, order: 14 },
      ],
      experience_ranges: [
        { value: '0-1 years', label: '0-1 years', is_active: true, order: 1 },
        { value: '1-3 years', label: '1-3 years', is_active: true, order: 2 },
        { value: '3-5 years', label: '3-5 years', is_active: true, order: 3 },
        { value: '5-10 years', label: '5-10 years', is_active: true, order: 4 },
        { value: '10+ years', label: '10+ years', is_active: true, order: 5 },
      ],
      genders: [
        { value: 'male', label: 'Male', is_active: true, order: 1 },
        { value: 'female', label: 'Female', is_active: true, order: 2 },
        { value: 'other', label: 'Other', is_active: true, order: 3 },
      ],
      emergency_relations: [
        { value: 'spouse', label: 'Spouse', is_active: true, order: 1 },
        { value: 'parent', label: 'Parent', is_active: true, order: 2 },
        { value: 'sibling', label: 'Sibling', is_active: true, order: 3 },
        { value: 'friend', label: 'Friend', is_active: true, order: 4 },
        { value: 'other', label: 'Other', is_active: true, order: 5 },
      ],
      difficulty_levels: [
        { value: 'Beginner', label: 'Beginner', is_active: true, order: 1 },
        { value: 'Intermediate', label: 'Intermediate', is_active: true, order: 2 },
        { value: 'Advanced', label: 'Advanced', is_active: true, order: 3 },
        { value: 'Expert', label: 'Expert', is_active: true, order: 4 },
      ],
      banks: [
        { value: 'State Bank of India', label: 'State Bank of India', is_active: true, order: 1 },
        { value: 'HDFC Bank', label: 'HDFC Bank', is_active: true, order: 2 },
        { value: 'ICICI Bank', label: 'ICICI Bank', is_active: true, order: 3 },
        { value: 'Axis Bank', label: 'Axis Bank', is_active: true, order: 4 },
        { value: 'Punjab National Bank', label: 'Punjab National Bank', is_active: true, order: 5 },
        { value: 'Bank of Baroda', label: 'Bank of Baroda', is_active: true, order: 6 },
        { value: 'Canara Bank', label: 'Canara Bank', is_active: true, order: 7 },
        { value: 'Union Bank of India', label: 'Union Bank of India', is_active: true, order: 8 },
      ],
      qualifications: [],
      course_durations: [
        { value: '1_month', label: '1 Month', is_active: true, order: 1 },
        { value: '3_months', label: '3 Months', is_active: true, order: 2 },
        { value: '6_months', label: '6 Months', is_active: true, order: 3 },
        { value: '1_year', label: '1 Year', is_active: true, order: 4 },
        { value: '2_years', label: '2 Years', is_active: true, order: 5 },
      ],
      passing_years: [],
      locations: [
        { value: 'Hyderabad', label: 'Hyderabad', is_active: true, order: 1 },
        { value: 'Mumbai', label: 'Mumbai', is_active: true, order: 2 },
      ],
      student_levels: [
        { value: 'Beginner', label: 'Beginner', is_active: true, order: 1 },
        { value: 'Intermediate', label: 'Intermediate', is_active: true, order: 2 },
        { value: 'Expert', label: 'Expert', is_active: true, order: 3 },
      ],
    }

    return defaults[category] || []
  }
}

// Export singleton instance
export const dropdownAPI = new DropdownAPI()
