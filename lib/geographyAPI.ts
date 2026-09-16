import { BaseAPI } from './baseAPI'

export interface GeoState {
  id: string
  name: string
  code: string
  slug?: string
  is_active: boolean
  display_order?: number
  city_count?: number
  created_at?: string
  updated_at?: string
}

export interface GeoCity {
  id: string
  name: string
  code: string
  slug?: string
  state_id?: string | null
  state?: string
  state_name?: string
  country?: string
  timezone?: string
  is_active: boolean
  display_order?: number
  branch_count?: number
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface StatePayload {
  name: string
  code?: string
  slug?: string
  is_active?: boolean
  display_order?: number
}

export interface CityPayload {
  name: string
  state_id: string
  code?: string
  slug?: string
  is_active?: boolean
  display_order?: number
  description?: string
}

class GeographyAPI extends BaseAPI {
  async getStates(token: string, params?: { active_only?: boolean; search?: string }) {
    const query = new URLSearchParams()
    query.set('active_only', params?.active_only ? 'true' : 'false')
    if (params?.search) query.set('search', params.search)
    return this.makeRequest(`/api/states?${query.toString()}`, { method: 'GET', token })
  }

  async createState(token: string, body: StatePayload) {
    return this.makeRequest('/api/states', { method: 'POST', token, body })
  }

  async updateState(token: string, id: string, body: Partial<StatePayload>) {
    return this.makeRequest(`/api/states/${id}`, { method: 'PUT', token, body })
  }

  async getCities(token: string, params?: { state_id?: string; active_only?: boolean; search?: string }) {
    const query = new URLSearchParams()
    query.set('active_only', params?.active_only ? 'true' : 'false')
    if (params?.state_id) query.set('state_id', params.state_id)
    if (params?.search) query.set('search', params.search)
    return this.makeRequest(`/api/cities?${query.toString()}`, { method: 'GET', token })
  }

  async createCity(token: string, body: CityPayload) {
    return this.makeRequest('/api/cities', { method: 'POST', token, body })
  }

  async updateCity(token: string, id: string, body: Partial<CityPayload>) {
    return this.makeRequest(`/api/cities/${id}`, { method: 'PUT', token, body })
  }
}

export const geographyAPI = new GeographyAPI()
