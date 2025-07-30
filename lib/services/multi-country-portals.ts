// Multi-Country Government Portal Adapters
// Implementations for major CRBI programs with digital integration capabilities

import { 
  BaseGovernmentPortalAdapter,
  GovernmentPortalConfig,
  GovernmentSubmissionPackage,
  SubmissionResponse,
  StatusCheckResponse,
  DocumentUploadResponse,
  governmentPortalRegistry
} from './government-portal-integration'

// ============================================================================
// PORTUGAL GOLDEN VISA ADAPTER
// ============================================================================

export class PortugalGoldenVisaAdapter extends BaseGovernmentPortalAdapter {
  async authenticate(): Promise<{ success: boolean; accessToken?: string; expiresAt?: Date; error?: string }> {
    try {
      const authUrl = `${this.config.baseUrl}/oauth/token`
      
      const response = await this.makeRequest(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.credentials.clientId!,
          client_secret: this.config.credentials.clientSecret!,
          scope: 'arim-portal-api'
        }).toString()
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          success: false,
          error: `Portugal portal authentication failed: ${errorData.error_description || 'Authentication error'}`
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
        error: `Portugal authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  async submitApplication(
    submissionPackage: GovernmentSubmissionPackage,
    accessToken: string
  ): Promise<SubmissionResponse> {
    try {
      const submissionUrl = `${this.config.baseUrl}/api/v1/golden-visa/applications`
      
      // Transform to Portugal SEF format
      const portugalPayload = {
        aplicacao_tipo: 'artigo_D6_investimento', // D6 investment visa
        requerente: {
          nome_completo: `${submissionPackage.clientInfo.firstName} ${submissionPackage.clientInfo.lastName}`,
          email: submissionPackage.clientInfo.email,
          nacionalidade: submissionPackage.clientInfo.nationality || 'Unknown'
        },
        investimento: {
          tipo: this.mapInvestmentType(submissionPackage.programName),
          valor_euros: submissionPackage.submissionMetadata.investmentAmount || 500000,
          descricao: submissionPackage.programName
        },
        documentos: submissionPackage.documents.map(doc => ({
          tipo_documento: this.mapDocumentType(doc.category),
          nome_ficheiro: doc.fileName,
          documento_id: doc.documentId,
          data_carregamento: doc.uploadedAt,
          categoria: doc.category
        })),
        metadados_submissao: {
          plataforma: 'Magellan-CRBI',
          total_documentos: submissionPackage.submissionMetadata.totalDocuments,
          data_compilacao: submissionPackage.submissionMetadata.compiledAt
        }
      }

      const response = await this.makeRequest(submissionUrl, {
        method: 'POST',
        body: JSON.stringify(portugalPayload)
      }, accessToken)

      const responseData = await response.json()

      if (!response.ok) {
        return {
          success: false,
          errors: [responseData.erro || 'Portugal submission failed']
        }
      }

      return {
        success: true,
        submissionId: responseData.numero_pedido,
        governmentReferenceNumber: responseData.referencia_sef,
        submittedAt: responseData.data_submissao,
        trackingUrl: `${this.config.baseUrl}/consulta/${responseData.referencia_sef}`,
        estimatedProcessingTime: '10-12 months',
        warnings: responseData.avisos || []
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Portugal submission error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  async checkApplicationStatus(
    governmentReferenceNumber: string,
    accessToken: string
  ): Promise<StatusCheckResponse> {
    try {
      const statusUrl = `${this.config.baseUrl}/api/v1/applications/${governmentReferenceNumber}/status`
      
      const response = await this.makeRequest(statusUrl, {
        method: 'GET'
      }, accessToken)

      if (!response.ok) {
        throw new Error(`Portugal status check failed: ${response.statusText}`)
      }

      const statusData = await response.json()

      return {
        status: this.mapPortugalStatus(statusData.estado),
        lastUpdated: statusData.ultima_atualizacao,
        governmentNotes: statusData.observacoes,
        nextSteps: statusData.proximos_passos || [],
        documentsRequested: statusData.documentos_solicitados?.map((doc: {
          tipo: string
          descricao: string
          prazo: string
          obrigatorio: boolean
        }) => ({
          documentType: doc.tipo,
          description: doc.descricao,
          deadline: doc.prazo,
          priority: doc.obrigatorio ? 'required' : 'optional'
        })) || [],
        estimatedCompletionDate: statusData.previsao_conclusao,
        metadata: {
          rawStatus: statusData.estado,
          processingStage: statusData.fase_processamento,
          portalData: statusData
        }
      }
    } catch (error) {
      return {
        status: 'under_review',
        lastUpdated: new Date().toISOString(),
        governmentNotes: `Portugal status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextSteps: ['Manual verification with SEF required']
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
      const uploadUrl = `${this.config.baseUrl}/api/v1/applications/${governmentReferenceNumber}/documents`
      
      const formData = new FormData()
      formData.append('ficheiro', new Blob([documentData.fileBuffer]), documentData.fileName)
      formData.append('tipo_documento', this.mapDocumentType(documentData.documentType))
      if (documentData.description) {
        formData.append('descricao', documentData.description)
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
          errors: [responseData.erro || 'Portugal document upload failed']
        }
      }

      return {
        success: true,
        documentId: responseData.documento_id,
        uploadUrl: responseData.url_consulta
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Portugal upload error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  private mapInvestmentType(programName: string): string {
    const typeMap: Record<string, string> = {
      'Real Estate Investment': 'imobiliario',
      'Investment Fund': 'fundos_investimento',
      'Business Investment': 'criacao_empresas',
      'Research Activities': 'atividades_investigacao',
      'Art and Heritage': 'arte_patrimonio'
    }
    
    return typeMap[programName] || 'imobiliario'
  }

  private mapDocumentType(category: string): string {
    const typeMap: Record<string, string> = {
      'identity': 'documento_identificacao',
      'financial': 'comprovativo_financeiro',
      'background': 'certificado_antecedentes',
      'medical': 'certificado_medico',
      'investment': 'prova_investimento'
    }
    
    return typeMap[category] || 'outros'
  }

  private mapPortugalStatus(portugalStatus: string): StatusCheckResponse['status'] {
    const statusMap: Record<string, StatusCheckResponse['status']> = {
      'submetido': 'submitted',
      'em_analise': 'under_review',
      'documentos_em_falta': 'requires_action',
      'aprovado': 'approved',
      'rejeitado': 'rejected',
      'cancelado': 'cancelled'
    }

    return statusMap[portugalStatus.toLowerCase()] || 'under_review'
  }
}

// ============================================================================
// GREECE GOLDEN VISA ADAPTER
// ============================================================================

export class GreeceGoldenVisaAdapter extends BaseGovernmentPortalAdapter {
  async authenticate(): Promise<{ success: boolean; accessToken?: string; expiresAt?: Date; error?: string }> {
    try {
      const authUrl = `${this.config.baseUrl}/auth/oauth2/token`
      
      const response = await this.makeRequest(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.config.credentials.clientId,
          client_secret: this.config.credentials.clientSecret,
          grant_type: 'client_credentials',
          scope: 'investment-visa-api'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          success: false,
          error: `Greece portal authentication failed: ${errorData.error_description || 'Authentication error'}`
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
        error: `Greece authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  async submitApplication(
    submissionPackage: GovernmentSubmissionPackage,
    accessToken: string
  ): Promise<SubmissionResponse> {
    try {
      const submissionUrl = `${this.config.baseUrl}/api/v2/investment-residence/applications`
      
      // Transform to Greece format
      const greecePayload = {
        application_type: 'investment_residence_permit',
        applicant: {
          first_name: submissionPackage.clientInfo.firstName,
          last_name: submissionPackage.clientInfo.lastName,
          email: submissionPackage.clientInfo.email,
          nationality: submissionPackage.clientInfo.nationality || 'Unknown'
        },
        investment: {
          type: this.mapGreeceInvestmentType(submissionPackage.programName),
          amount_eur: submissionPackage.submissionMetadata.investmentAmount || 400000,
          description: submissionPackage.programName
        },
        documents: submissionPackage.documents.map(doc => ({
          document_type: this.mapGreeceDocumentType(doc.category),
          filename: doc.fileName,
          document_id: doc.documentId,
          uploaded_at: doc.uploadedAt,
          category: doc.category
        })),
        submission_metadata: {
          platform: 'Magellan-CRBI',
          total_documents: submissionPackage.submissionMetadata.totalDocuments,
          compiled_at: submissionPackage.submissionMetadata.compiledAt
        }
      }

      const response = await this.makeRequest(submissionUrl, {
        method: 'POST',
        body: JSON.stringify(greecePayload)
      }, accessToken)

      const responseData = await response.json()

      if (!response.ok) {
        return {
          success: false,
          errors: [responseData.error || 'Greece submission failed']
        }
      }

      return {
        success: true,
        submissionId: responseData.application_number,
        governmentReferenceNumber: responseData.government_reference,
        submittedAt: responseData.submitted_at,
        trackingUrl: `${this.config.baseUrl}/track/${responseData.government_reference}`,
        estimatedProcessingTime: '8-10 months',
        warnings: responseData.warnings || []
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Greece submission error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  async checkApplicationStatus(
    governmentReferenceNumber: string,
    accessToken: string
  ): Promise<StatusCheckResponse> {
    try {
      const statusUrl = `${this.config.baseUrl}/api/v2/applications/${governmentReferenceNumber}/status`
      
      const response = await this.makeRequest(statusUrl, {
        method: 'GET'
      }, accessToken)

      if (!response.ok) {
        throw new Error(`Greece status check failed: ${response.statusText}`)
      }

      const statusData = await response.json()

      return {
        status: this.mapGreeceStatus(statusData.status),
        lastUpdated: statusData.last_updated,
        governmentNotes: statusData.notes,
        nextSteps: statusData.next_steps || [],
        documentsRequested: statusData.requested_documents?.map((doc: {
          type: string
          description: string
          deadline: string
          mandatory: boolean
        }) => ({
          documentType: doc.type,
          description: doc.description,
          deadline: doc.deadline,
          priority: doc.mandatory ? 'required' : 'optional'
        })) || [],
        estimatedCompletionDate: statusData.estimated_completion,
        metadata: {
          rawStatus: statusData.status,
          processingStage: statusData.processing_stage,
          portalData: statusData
        }
      }
    } catch (error) {
      return {
        status: 'under_review',
        lastUpdated: new Date().toISOString(),
        governmentNotes: `Greece status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextSteps: ['Manual verification required']
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
      const uploadUrl = `${this.config.baseUrl}/api/v2/applications/${governmentReferenceNumber}/documents`
      
      const formData = new FormData()
      formData.append('file', new Blob([documentData.fileBuffer]), documentData.fileName)
      formData.append('document_type', this.mapGreeceDocumentType(documentData.documentType))
      if (documentData.description) {
        formData.append('description', documentData.description)
      }

      const response = await this.makeRequest(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {}
      }, accessToken)

      const responseData = await response.json()

      if (!response.ok) {
        return {
          success: false,
          errors: [responseData.error || 'Greece document upload failed']
        }
      }

      return {
        success: true,
        documentId: responseData.document_id,
        uploadUrl: responseData.view_url
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Greece upload error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  private mapGreeceInvestmentType(programName: string): string {
    const typeMap: Record<string, string> = {
      'Real Estate Investment': 'real_estate',
      'Government Bonds': 'government_bonds',
      'Business Investment': 'business_investment',
      'Bank Deposits': 'bank_deposits'
    }
    
    return typeMap[programName] || 'real_estate'
  }

  private mapGreeceDocumentType(category: string): string {
    const typeMap: Record<string, string> = {
      'identity': 'identity_document',
      'financial': 'financial_proof',
      'background': 'criminal_record',
      'medical': 'medical_certificate',
      'investment': 'investment_proof'
    }
    
    return typeMap[category] || 'other'
  }

  private mapGreeceStatus(greeceStatus: string): StatusCheckResponse['status'] {
    const statusMap: Record<string, StatusCheckResponse['status']> = {
      'submitted': 'submitted',
      'under_review': 'under_review',
      'additional_documents_required': 'requires_action',
      'approved': 'approved',
      'rejected': 'rejected',
      'cancelled': 'cancelled'
    }

    return statusMap[greeceStatus.toLowerCase()] || 'under_review'
  }
}

// ============================================================================
// GRENADA CBI ADAPTER (Caribbean)
// ============================================================================

export class GrenadaCBIAdapter extends BaseGovernmentPortalAdapter {
  async authenticate(): Promise<{ success: boolean; accessToken?: string; expiresAt?: Date; error?: string }> {
    try {
      const authUrl = `${this.config.baseUrl}/api/v1/auth/token`
      
      const response = await this.makeRequest(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.credentials.apiKey
        },
        body: JSON.stringify({
          grant_type: 'api_key',
          api_key: this.config.credentials.apiKey
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          success: false,
          error: `Grenada CBI authentication failed: ${errorData.message || 'Authentication error'}`
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
        error: `Grenada authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  async submitApplication(
    submissionPackage: GovernmentSubmissionPackage,
    accessToken: string
  ): Promise<SubmissionResponse> {
    try {
      const submissionUrl = `${this.config.baseUrl}/api/v1/cbi/applications`
      
      // Transform to Grenada CBI format
      const grenadaPayload = {
        program_type: 'citizenship_by_investment',
        investment_route: this.mapGrenadaInvestmentRoute(submissionPackage.programName),
        main_applicant: {
          first_name: submissionPackage.clientInfo.firstName,
          last_name: submissionPackage.clientInfo.lastName,
          email: submissionPackage.clientInfo.email
        },
        investment_details: {
          amount_usd: submissionPackage.submissionMetadata.investmentAmount || 150000,
          investment_type: submissionPackage.programName
        },
        documents: submissionPackage.documents.map(doc => ({
          document_category: this.mapGrenadaDocumentCategory(doc.category),
          file_name: doc.fileName,
          document_id: doc.documentId,
          upload_timestamp: doc.uploadedAt
        })),
        application_metadata: {
          submitted_via: 'Magellan-CRBI-Platform',
          document_count: submissionPackage.submissionMetadata.totalDocuments,
          compilation_date: submissionPackage.submissionMetadata.compiledAt
        }
      }

      const response = await this.makeRequest(submissionUrl, {
        method: 'POST',
        body: JSON.stringify(grenadaPayload)
      }, accessToken)

      const responseData = await response.json()

      if (!response.ok) {
        return {
          success: false,
          errors: [responseData.message || 'Grenada CBI submission failed']
        }
      }

      return {
        success: true,
        submissionId: responseData.application_id,
        governmentReferenceNumber: responseData.cbi_reference_number,
        submittedAt: responseData.submission_date,
        trackingUrl: `${this.config.baseUrl}/portal/track/${responseData.cbi_reference_number}`,
        estimatedProcessingTime: '6 months',
        warnings: responseData.warnings || []
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Grenada submission error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  async checkApplicationStatus(
    governmentReferenceNumber: string,
    accessToken: string
  ): Promise<StatusCheckResponse> {
    try {
      const statusUrl = `${this.config.baseUrl}/api/v1/applications/${governmentReferenceNumber}/status`
      
      const response = await this.makeRequest(statusUrl, {
        method: 'GET'
      }, accessToken)

      if (!response.ok) {
        throw new Error(`Grenada status check failed: ${response.statusText}`)
      }

      const statusData = await response.json()

      return {
        status: this.mapGrenadaStatus(statusData.application_status),
        lastUpdated: statusData.last_status_update,
        governmentNotes: statusData.government_comments,
        nextSteps: statusData.next_actions || [],
        documentsRequested: statusData.additional_documents?.map((doc: {
          document_type: string
          description: string
          submission_deadline: string
          is_mandatory: boolean
        }) => ({
          documentType: doc.document_type,
          description: doc.description,
          deadline: doc.submission_deadline,
          priority: doc.is_mandatory ? 'required' : 'optional'
        })) || [],
        estimatedCompletionDate: statusData.expected_completion_date,
        metadata: {
          rawStatus: statusData.application_status,
          cbiStage: statusData.processing_stage,
          portalData: statusData
        }
      }
    } catch (error) {
      return {
        status: 'under_review',
        lastUpdated: new Date().toISOString(),
        governmentNotes: `Grenada status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextSteps: ['Contact authorized agent for manual update']
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
      const uploadUrl = `${this.config.baseUrl}/api/v1/applications/${governmentReferenceNumber}/documents`
      
      const formData = new FormData()
      formData.append('document', new Blob([documentData.fileBuffer]), documentData.fileName)
      formData.append('category', this.mapGrenadaDocumentCategory(documentData.documentType))
      if (documentData.description) {
        formData.append('description', documentData.description)
      }

      const response = await this.makeRequest(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {}
      }, accessToken)

      const responseData = await response.json()

      if (!response.ok) {
        return {
          success: false,
          errors: [responseData.message || 'Grenada document upload failed']
        }
      }

      return {
        success: true,
        documentId: responseData.document_reference,
        uploadUrl: responseData.portal_view_link
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Grenada upload error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  private mapGrenadaInvestmentRoute(programName: string): string {
    const routeMap: Record<string, string> = {
      'National Transformation Fund': 'ntf_donation',
      'Real Estate Investment': 'approved_real_estate',
      'Government Securities': 'government_securities'
    }
    
    return routeMap[programName] || 'ntf_donation'
  }

  private mapGrenadaDocumentCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'identity': 'identification_documents',
      'financial': 'financial_documentation',
      'background': 'police_clearance',
      'medical': 'medical_reports',
      'investment': 'investment_evidence'
    }
    
    return categoryMap[category] || 'supporting_documents'
  }

  private mapGrenadaStatus(grenadaStatus: string): StatusCheckResponse['status'] {
    const statusMap: Record<string, StatusCheckResponse['status']> = {
      'received': 'submitted',
      'under_review': 'under_review',
      'additional_info_required': 'requires_action',
      'approved': 'approved',
      'declined': 'rejected',
      'withdrawn': 'cancelled'
    }

    return statusMap[grenadaStatus.toLowerCase()] || 'under_review'
  }
}

// ============================================================================
// PORTAL CONFIGURATIONS AND REGISTRATION
// ============================================================================

// Portugal Golden Visa Configuration
const portugalConfig: GovernmentPortalConfig = {
  countryCode: 'PT',
  portalName: 'Portugal SEF Golden Visa Portal',
  baseUrl: process.env.PORTUGAL_PORTAL_URL || 'https://api.sef.pt',
  apiVersion: 'v1',
  authType: 'oauth2',
  credentials: {
    clientId: process.env.PORTUGAL_CLIENT_ID,
    clientSecret: process.env.PORTUGAL_CLIENT_SECRET,
    tokenUrl: process.env.PORTUGAL_TOKEN_URL,
    scope: ['arim-portal-api']
  },
  rateLimit: {
    requestsPerMinute: 20,
    requestsPerHour: 200
  },
  timeout: 45000,
  retryConfig: {
    maxRetries: 3,
    backoffStrategy: 'exponential',
    initialDelay: 2000
  }
}

// Greece Golden Visa Configuration
const greeceConfig: GovernmentPortalConfig = {
  countryCode: 'GR',
  portalName: 'Greece Investment Residence Portal',
  baseUrl: process.env.GREECE_PORTAL_URL || 'https://api.migration.gov.gr',
  apiVersion: 'v2',
  authType: 'oauth2',
  credentials: {
    clientId: process.env.GREECE_CLIENT_ID,
    clientSecret: process.env.GREECE_CLIENT_SECRET,
    tokenUrl: process.env.GREECE_TOKEN_URL,
    scope: ['investment-visa-api']
  },
  rateLimit: {
    requestsPerMinute: 15,
    requestsPerHour: 150
  },
  timeout: 40000,
  retryConfig: {
    maxRetries: 3,
    backoffStrategy: 'exponential',
    initialDelay: 1500
  }
}

// Grenada CBI Configuration
const grenadaConfig: GovernmentPortalConfig = {
  countryCode: 'GD',
  portalName: 'Grenada CBI Portal',
  baseUrl: process.env.GRENADA_PORTAL_URL || 'https://api.cbigrenada.gov.gd',
  apiVersion: 'v1',
  authType: 'api_key',
  credentials: {
    apiKey: process.env.GRENADA_API_KEY
  },
  rateLimit: {
    requestsPerMinute: 25,
    requestsPerHour: 300
  },
  timeout: 30000,
  retryConfig: {
    maxRetries: 3,
    backoffStrategy: 'linear',
    initialDelay: 1000
  }
}

// Register all portals
export function registerMultiCountryPortals(): void {
  console.log('Registering multi-country government portals...')

  // Register Portugal
  if (portugalConfig.credentials.clientId && portugalConfig.credentials.clientSecret) {
    governmentPortalRegistry.registerPortal(
      'PT',
      portugalConfig,
      new PortugalGoldenVisaAdapter(portugalConfig)
    )
    console.log('✓ Portugal Golden Visa portal registered')
  }

  // Register Greece
  if (greeceConfig.credentials.clientId && greeceConfig.credentials.clientSecret) {
    governmentPortalRegistry.registerPortal(
      'GR',
      greeceConfig,
      new GreeceGoldenVisaAdapter(greeceConfig)
    )
    console.log('✓ Greece Golden Visa portal registered')
  }

  // Register Grenada
  if (grenadaConfig.credentials.apiKey) {
    governmentPortalRegistry.registerPortal(
      'GD',
      grenadaConfig,
      new GrenadaCBIAdapter(grenadaConfig)
    )
    console.log('✓ Grenada CBI portal registered')
  }

  console.log('Multi-country portal registration completed')
}

// Auto-register portals on module load
registerMultiCountryPortals()