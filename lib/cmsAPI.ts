import { BaseAPI } from './baseAPI'
import type { PopupFormSettings } from '@/lib/popupForm'

export type { PopupFormSettings }

export interface SEOSettings {
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
  og_image?: string
}

export interface HomepageSection {
  hero_title?: string
  hero_subtitle?: string
  about_title?: string
  about_subtitle?: string
  courses_title?: string
  courses_subtitle?: string
  testimonials_title?: string
  testimonials_subtitle?: string
  cta_title?: string
  cta_subtitle?: string
  popup_form?: PopupFormSettings
}

export interface FooterContent {
  footer_text?: string
  copyright_text?: string
  address?: string
  phone?: string
  email?: string
  social_facebook?: string
  social_instagram?: string
  social_twitter?: string
  social_youtube?: string
}

export interface BrandingSettings {
  navbar_logo?: string
  footer_logo?: string
  favicon?: string
}

export interface CMSContentResponse {
  id: string
  homepage: HomepageSection
  footer: FooterContent
  branding: BrandingSettings
  page_seo: Record<string, SEOSettings>
  created_at?: string
  updated_at?: string
}

export interface CMSContentUpdate {
  homepage?: HomepageSection
  footer?: FooterContent
  branding?: BrandingSettings
  page_seo?: Record<string, SEOSettings>
}

export class CMSAPI extends BaseAPI {
  private readonly endpoint = '/api/cms'

  async getCMSContent(token: string): Promise<CMSContentResponse> {
    return this.makeRequest(`${this.endpoint}`, {
      method: 'GET',
      token
    })
  }

  async updateCMSContent(data: CMSContentUpdate, token: string): Promise<CMSContentResponse> {
    return this.makeRequest(`${this.endpoint}`, {
      method: 'PUT',
      body: data,
      token
    })
  }
}

export const cmsAPI = new CMSAPI()
