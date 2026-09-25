// API utility functions for course management
import { BaseAPI } from './baseAPI'

export interface CourseCreateData {
  title: string
  code: string
  description: string
  martial_art_style_id: string
  difficulty_level: string
  category_id: string
  instructor_id: string
  student_requirements: {
    max_students: number
    min_age: number
    max_age: number
    prerequisites: string[]
  }
  course_content: {
    syllabus: string
    equipment_required: string[]
  }
  media_resources: {
    course_image_url?: string
    promo_video_url?: string
    video_poster_url?: string
  }
  pricing: {
    currency: string
    amount: number
    branch_specific_pricing: boolean
  }
  settings: {
    offers_certification: boolean
    active: boolean
  }
}

export interface CourseCreateResponse {
  message: string
  course_id: string
}

export interface APIError {
  error: string
  details?: string[]
}

class CourseAPI extends BaseAPI {
  async createCourse(data: CourseCreateData, token: string): Promise<CourseCreateResponse> {
    return await this.makeRequest('/api/courses', {
      method: 'POST',
      body: data,
      token
    })
  }

  async getCourses(token: string): Promise<any> {
    return await this.makeRequest('/api/courses', {
      method: 'GET',
      token
    })
  }

  // Method to test API connectivity
  async testConnection(): Promise<any> {
    return await this.makeRequest('/api/test', {
      method: 'GET'
    })
  }

  // Method to get course by ID
  async getCourseById(courseId: string, token: string): Promise<any> {
    return await this.makeRequest(`/api/courses/${courseId}`, {
      method: 'GET',
      token
    })
  }

  // Method to update course
  async updateCourse(courseId: string, data: Partial<CourseCreateData>, token: string): Promise<any> {
    return await this.makeRequest(`/api/courses/${courseId}`, {
      method: 'PUT',
      body: data,
      token
    })
  }

  // Method to delete course
  async deleteCourse(courseId: string, token: string): Promise<any> {
    return await this.makeRequest(`/api/courses/${courseId}`, {
      method: 'DELETE',
      token
    })
  }
}

export const courseAPI = new CourseAPI()

// Helper function to map form data to API format
export function mapFormDataToAPI(formData: any, prerequisites: string[]): CourseCreateData {
  return {
    title: formData.courseTitle,
    code: formData.courseCode,
    description: formData.description,
    martial_art_style_id: formData.martialArtsStyle || 'style-default-uuid',
    difficulty_level: formData.difficultyLevel || 'Beginner',
    category_id: formData.category || 'category-default-uuid',
    instructor_id: formData.instructor || 'instructor-default-uuid',
    student_requirements: {
      max_students: parseInt(formData.maxStudents) || 20,
      min_age: parseInt(formData.minAge) || 6,
      max_age: parseInt(formData.maxAge) || 65,
      prerequisites: prerequisites
    },
    course_content: {
      syllabus: formData.syllabus || '',
      equipment_required: formData.equipmentRequired 
        ? formData.equipmentRequired.split('\n').filter((item: string) => item.trim())
        : []
    },
    media_resources: {
      course_image_url: formData.imageUrl || undefined,
      promo_video_url: formData.videoUrl || undefined,
      video_poster_url: formData.videoPosterUrl || undefined
    },
    pricing: {
      currency: formData.currency || 'INR',
      amount: parseFloat(formData.price) || 0,
      branch_specific_pricing: formData.branchSpecificPricing || false
    },
    settings: {
      offers_certification: formData.certificationOffered || false,
      active: formData.isActive || true
    }
  }
}
