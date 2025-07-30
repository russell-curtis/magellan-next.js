// Government Portal Integration Framework
// Provides pluggable architecture for integrating with different government CRBI portals

import { GovernmentSubmissionPackage } from './government-submission'
import { db } from '@/db/drizzle'
import { activityLogs } from '@/db/schema'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface GovernmentPortalConfig {
  countryCode: string
  portalName: string
  baseUrl: string
  apiVersion: string
  authType: 'api_key' | 'oauth2' | 'certificate' | 'basic_auth'
  credentials: {
    apiKey?: string
    clientId?: string
    clientSecret?: string
    certificatePath?: string
    username?: string
    password?: string
    tokenUrl?: string
    scope?: string[]
  }
  rateLimit: {
    requestsPerMinute: number
    requestsPerHour: number
  }
  timeout: number
  retryConfig: {
    maxRetries: number
    backoffStrategy: 'linear' | 'exponential'
    initialDelay: number
  }
}

export interface SubmissionResponse {
  success: boolean
  submissionId?: string
  governmentReferenceNumber?: string
  submittedAt?: string
  trackingUrl?: string
  estimatedProcessingTime?: string
  errors?: string[]
  warnings?: string[]
  metadata?: Record<string, unknown>
}

export interface StatusCheckResponse {
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'requires_action' | 'cancelled'
  lastUpdated: string
  governmentNotes?: string
  nextSteps?: string[]
  documentsRequested?: {
    documentType: string
    description: string
    deadline: string
    priority: 'required' | 'optional'
  }[]
  estimatedCompletionDate?: string
  metadata?: Record<string, unknown>
}

export interface DocumentUploadResponse {
  success: boolean
  documentId?: string
  uploadUrl?: string
  errors?: string[]
}

// ============================================================================
// BASE GOVERNMENT PORTAL ADAPTER
// ============================================================================

export abstract class BaseGovernmentPortalAdapter {
  protected config: GovernmentPortalConfig
  protected rateLimitTracker: Map<string, { count: number; resetTime: number }> = new Map()

  constructor(config: GovernmentPortalConfig) {
    this.config = config
  }

  /**
   * Authenticate with the government portal
   */
  abstract authenticate(): Promise<{ success: boolean; accessToken?: string; expiresAt?: Date; error?: string }>

  /**
   * Submit application package to government portal
   */
  abstract submitApplication(
    submissionPackage: GovernmentSubmissionPackage,
    accessToken: string
  ): Promise<SubmissionResponse>

  /**
   * Check application status
   */
  abstract checkApplicationStatus(
    governmentReferenceNumber: string,
    accessToken: string
  ): Promise<StatusCheckResponse>

  /**
   * Upload additional documents
   */
  abstract uploadDocument(
    governmentReferenceNumber: string,
    documentData: {
      fileName: string
      fileBuffer: Buffer
      documentType: string
      description?: string
    },
    accessToken: string
  ): Promise<DocumentUploadResponse>

  /**
   * Rate limiting check
   */
  protected async checkRateLimit(): Promise<void> {
    const now = Date.now()
    const minuteKey = `${this.config.countryCode}_minute_${Math.floor(now / 60000)}`
    const hourKey = `${this.config.countryCode}_hour_${Math.floor(now / 3600000)}`

    // Check minute limit
    const minuteTracker = this.rateLimitTracker.get(minuteKey) || { count: 0, resetTime: now + 60000 }
    if (minuteTracker.count >= this.config.rateLimit.requestsPerMinute) {
      const waitTime = minuteTracker.resetTime - now
      if (waitTime > 0) {
        throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`)
      }
    }

    // Check hour limit
    const hourTracker = this.rateLimitTracker.get(hourKey) || { count: 0, resetTime: now + 3600000 }
    if (hourTracker.count >= this.config.rateLimit.requestsPerHour) {
      const waitTime = hourTracker.resetTime - now
      if (waitTime > 0) {
        throw new Error(`Hourly rate limit exceeded. Please wait ${Math.ceil(waitTime / 60000)} minutes.`)
      }
    }

    // Update counters
    this.rateLimitTracker.set(minuteKey, { count: minuteTracker.count + 1, resetTime: minuteTracker.resetTime })
    this.rateLimitTracker.set(hourKey, { count: hourTracker.count + 1, resetTime: hourTracker.resetTime })
  }

  /**
   * HTTP request with retry logic
   */
  protected async makeRequest(
    url: string,
    options: RequestInit,
    accessToken?: string
  ): Promise<Response> {
    await this.checkRateLimit()

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Magellan-CRBI-Platform/1.0',
      ...options.headers,
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    }

    let lastError: Error
    for (let attempt = 0; attempt <= this.config.retryConfig.maxRetries; attempt++) {
      try {
        console.log(`Making request to ${url} (attempt ${attempt + 1}/${this.config.retryConfig.maxRetries + 1})`)
        
        const response = await fetch(url, requestOptions)
        
        // Don't retry on 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500 && attempt === 0) {
          return response
        }
        
        // Retry on 5xx errors (server errors) or network issues
        if (response.ok || response.status < 500) {
          return response
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      } catch (error) {
        lastError = error as Error
        console.error(`Request attempt ${attempt + 1} failed:`, error)
        
        if (attempt < this.config.retryConfig.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt)
          console.log(`Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw new Error(`Request failed after ${this.config.retryConfig.maxRetries + 1} attempts: ${lastError.message}`)
  }

  /**
   * Calculate backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = this.config.retryConfig.initialDelay
    
    if (this.config.retryConfig.backoffStrategy === 'exponential') {
      return baseDelay * Math.pow(2, attempt)
    } else {
      return baseDelay * (attempt + 1)
    }
  }

  /**
   * Log activity for audit trail
   */
  protected async logActivity(
    action: string,
    applicationId: string,
    firmId: string,
    userId: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      await db.insert(activityLogs).values({
        firmId,
        userId,
        applicationId,
        action: `government_portal_${action}`,
        entityType: 'government_submission',
        entityId: applicationId,
        newValues: {
          portal: this.config.portalName,
          countryCode: this.config.countryCode,
          timestamp: new Date().toISOString(),
          ...metadata
        }
      })
    } catch (error) {
      console.error('Failed to log government portal activity:', error)
      // Don't throw - logging failures shouldn't break the main flow
    }
  }
}

// ============================================================================
// SAINT KITTS AND NEVIS ADAPTER (EXAMPLE IMPLEMENTATION)
// ============================================================================

export class SaintKittsPortalAdapter extends BaseGovernmentPortalAdapter {
  async authenticate(): Promise<{ success: boolean; accessToken?: string; expiresAt?: Date; error?: string }> {
    try {
      const authUrl = `${this.config.baseUrl}/api/${this.config.apiVersion}/auth/token`
      
      const response = await this.makeRequest(authUrl, {
        method: 'POST',
        body: JSON.stringify({
          client_id: this.config.credentials.clientId,
          client_secret: this.config.credentials.clientSecret,
          grant_type: 'client_credentials',
          scope: this.config.credentials.scope?.join(' ') || 'crbi_submission'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          success: false,
          error: `Authentication failed: ${errorData.error_description || errorData.error || 'Unknown error'}`
        }
      }

      const tokenData = await response.json()
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))

      return {
        success: true,
        accessToken: tokenData.access_token,
        expiresAt
      }
    } catch (error) {
      return {
        success: false,
        error: `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  async submitApplication(
    submissionPackage: GovernmentSubmissionPackage,
    accessToken: string
  ): Promise<SubmissionResponse> {
    try {
      const submissionUrl = `${this.config.baseUrl}/api/${this.config.apiVersion}/applications/submit`
      
      // Transform our submission package to Saint Kitts format
      const saintKittsPayload = {
        application_type: 'citizenship_by_investment',
        applicant: {
          first_name: submissionPackage.clientInfo.firstName,
          last_name: submissionPackage.clientInfo.lastName,
          email: submissionPackage.clientInfo.email
        },
        program: {
          type: submissionPackage.countryCode,
          investment_option: submissionPackage.programName
        },
        documents: submissionPackage.documents.map(doc => ({
          document_type: doc.category,
          file_name: doc.fileName,
          document_id: doc.documentId,
          uploaded_at: doc.uploadedAt
        })),
        submission_metadata: submissionPackage.submissionMetadata
      }

      const response = await this.makeRequest(submissionUrl, {
        method: 'POST',
        body: JSON.stringify(saintKittsPayload)
      }, accessToken)

      const responseData = await response.json()

      if (!response.ok) {
        return {
          success: false,
          errors: [responseData.error || 'Submission failed']
        }
      }

      return {
        success: true,
        submissionId: responseData.submission_id,
        governmentReferenceNumber: responseData.reference_number,
        submittedAt: responseData.submitted_at,
        trackingUrl: responseData.tracking_url,
        estimatedProcessingTime: responseData.estimated_processing_time,
        warnings: responseData.warnings || []
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Submission error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  async checkApplicationStatus(
    governmentReferenceNumber: string,
    accessToken: string
  ): Promise<StatusCheckResponse> {
    try {
      const statusUrl = `${this.config.baseUrl}/api/${this.config.apiVersion}/applications/${governmentReferenceNumber}/status`
      
      const response = await this.makeRequest(statusUrl, {
        method: 'GET'
      }, accessToken)

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`)
      }

      const statusData = await response.json()

      return {
        status: this.mapSaintKittsStatus(statusData.status),
        lastUpdated: statusData.last_updated,
        governmentNotes: statusData.notes,
        nextSteps: statusData.next_steps || [],
        documentsRequested: statusData.requested_documents?.map((doc: {
          type: string
          description: string
          deadline: string
          required: boolean
        }) => ({
          documentType: doc.type,
          description: doc.description,
          deadline: doc.deadline,
          priority: doc.required ? 'required' : 'optional'
        })) || [],
        estimatedCompletionDate: statusData.estimated_completion,
        metadata: {
          rawStatus: statusData.status,
          portalData: statusData
        }
      }
    } catch (error) {
      // Return default status if check fails
      return {
        status: 'under_review',
        lastUpdated: new Date().toISOString(),
        governmentNotes: `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextSteps: ['Manual status verification required']
      }
    }
  }

  async uploadDocument(
    governmentReferenceNumber: string,
    documentData: {
      fileName: string
      fileBuffer: Buffer
      documentType: string
      description?: string
    },
    accessToken: string
  ): Promise<DocumentUploadResponse> {
    try {
      const uploadUrl = `${this.config.baseUrl}/api/${this.config.apiVersion}/applications/${governmentReferenceNumber}/documents`
      
      const formData = new FormData()
      formData.append('file', new Blob([documentData.fileBuffer]), documentData.fileName)
      formData.append('document_type', documentData.documentType)
      if (documentData.description) {
        formData.append('description', documentData.description)
      }

      const response = await this.makeRequest(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {} // Let fetch set Content-Type for FormData
      }, accessToken)

      const responseData = await response.json()

      if (!response.ok) {
        return {
          success: false,
          errors: [responseData.error || 'Document upload failed']
        }
      }

      return {
        success: true,
        documentId: responseData.document_id,
        uploadUrl: responseData.download_url
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  private mapSaintKittsStatus(saintKittsStatus: string): StatusCheckResponse['status'] {
    const statusMap: Record<string, StatusCheckResponse['status']> = {
      'submitted': 'submitted',
      'in_review': 'under_review',
      'under_review': 'under_review',
      'additional_docs_required': 'requires_action',
      'approved': 'approved',
      'rejected': 'rejected',
      'cancelled': 'cancelled'
    }

    return statusMap[saintKittsStatus.toLowerCase()] || 'under_review'
  }
}

// ============================================================================
// GOVERNMENT PORTAL REGISTRY
// ============================================================================

export class GovernmentPortalRegistry {
  private adapters: Map<string, BaseGovernmentPortalAdapter> = new Map()
  private configs: Map<string, GovernmentPortalConfig> = new Map()

  /**
   * Register a portal adapter
   */
  registerPortal(countryCode: string, config: GovernmentPortalConfig, adapter: BaseGovernmentPortalAdapter): void {
    this.configs.set(countryCode, config)
    this.adapters.set(countryCode, adapter)
    console.log(`Registered government portal for ${countryCode}: ${config.portalName}`)
  }

  /**
   * Get portal adapter for country
   */
  getPortalAdapter(countryCode: string): BaseGovernmentPortalAdapter | null {
    return this.adapters.get(countryCode.toUpperCase()) || null
  }

  /**
   * Get portal config for country
   */
  getPortalConfig(countryCode: string): GovernmentPortalConfig | null {
    return this.configs.get(countryCode.toUpperCase()) || null
  }

  /**
   * List all registered portals
   */
  getRegisteredPortals(): Array<{ countryCode: string; portalName: string; status: 'active' | 'inactive' }> {
    return Array.from(this.configs.entries()).map(([countryCode, config]) => ({
      countryCode,
      portalName: config.portalName,
      status: 'active' // TODO: Add health check logic
    }))
  }

  /**
   * Test portal connectivity
   */
  async testPortalConnection(countryCode: string): Promise<{ success: boolean; error?: string; responseTime?: number }> {
    const adapter = this.getPortalAdapter(countryCode)
    if (!adapter) {
      return { success: false, error: 'Portal not registered' }
    }

    const startTime = Date.now()
    try {
      const authResult = await adapter.authenticate()
      const responseTime = Date.now() - startTime

      return {
        success: authResult.success,
        error: authResult.error,
        responseTime
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      }
    }
  }
}

// ============================================================================
// PORTAL REGISTRY INSTANCE AND INITIALIZATION
// ============================================================================

export const governmentPortalRegistry = new GovernmentPortalRegistry()

// Initialize Saint Kitts portal (example)
const saintKittsConfig: GovernmentPortalConfig = {
  countryCode: 'KN',
  portalName: 'Saint Kitts and Nevis CBI Portal',
  baseUrl: process.env.SAINT_KITTS_PORTAL_URL || 'https://api.skncbi.gov.kn',
  apiVersion: 'v1',
  authType: 'oauth2',
  credentials: {
    clientId: process.env.SAINT_KITTS_CLIENT_ID,
    clientSecret: process.env.SAINT_KITTS_CLIENT_SECRET,
    tokenUrl: process.env.SAINT_KITTS_TOKEN_URL,
    scope: ['crbi_submission', 'document_upload', 'status_check']
  },
  rateLimit: {
    requestsPerMinute: 10,
    requestsPerHour: 100
  },
  timeout: 30000,
  retryConfig: {
    maxRetries: 3,
    backoffStrategy: 'exponential',
    initialDelay: 1000
  }
}

// Register Saint Kitts portal
if (saintKittsConfig.credentials.clientId && saintKittsConfig.credentials.clientSecret) {
  governmentPortalRegistry.registerPortal(
    'KN',
    saintKittsConfig,
    new SaintKittsPortalAdapter(saintKittsConfig)
  )
}