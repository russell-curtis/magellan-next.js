import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/drizzle'
import { requireClientAuth } from '@/lib/client-auth'
import { 
  applications, 
  documentRequirements,
  crbiPrograms
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'

// Document template definitions
const DOCUMENT_TEMPLATES = {
  // Personal Documents
  'passport-copy': {
    name: 'Passport Copy Template',
    description: 'Guidelines for providing a clear, complete passport copy',
    category: 'personal',
    downloadUrl: '/templates/passport-copy-guidelines.pdf',
    requirements: [
      'Full passport pages (all pages, including blank ones)',
      'High resolution scan or photo (minimum 300 DPI)',
      'Color copy preferred',
      'Ensure all text is clearly readable',
      'Include passport expiry date'
    ]
  },
  'birth-certificate': {
    name: 'Birth Certificate Template',
    description: 'Requirements for official birth certificate submission',
    category: 'personal',
    downloadUrl: '/templates/birth-certificate-requirements.pdf',
    requirements: [
      'Official government-issued certificate',
      'Must include raised seal or watermark',
      'Full names of parents required',
      'Apostilled if from non-convention country',
      'Translated to English if in foreign language'
    ]
  },
  'marriage-certificate': {
    name: 'Marriage Certificate Template',
    description: 'Official marriage certificate requirements',
    category: 'personal',
    downloadUrl: '/templates/marriage-certificate-requirements.pdf',
    requirements: [
      'Official government-issued certificate',
      'Must include raised seal or watermark',
      'Apostilled if required',
      'English translation if applicable'
    ]
  },

  // Financial Documents
  'bank-statements': {
    name: 'Bank Statement Template',
    description: 'Requirements for bank statement submission',
    category: 'financial',
    downloadUrl: '/templates/bank-statement-requirements.pdf',
    requirements: [
      'Last 6 months of statements',
      'Official bank letterhead',
      'Account holder name clearly visible',
      'Account number and routing information',
      'Bank stamp or seal on each page'
    ]
  },
  'bank-reference-letter': {
    name: 'Bank Reference Letter Template',
    description: 'Template for official bank reference letter',
    category: 'financial',
    downloadUrl: '/templates/bank-reference-letter-template.docx',
    requirements: [
      'On official bank letterhead',
      'Account opening date',
      'Average account balance',
      'Relationship duration with bank',
      'Bank manager signature and contact details'
    ]
  },
  'source-of-funds': {
    name: 'Source of Funds Declaration',
    description: 'Template for documenting source of investment funds',
    category: 'financial',
    downloadUrl: '/templates/source-of-funds-template.docx',
    requirements: [
      'Detailed explanation of fund sources',
      'Supporting documentation references',
      'Timeline of fund accumulation',
      'Notarized signature',
      'Supporting evidence attached'
    ]
  },

  // Professional Documents
  'employment-letter': {
    name: 'Employment Verification Letter',
    description: 'Template for employment verification',
    category: 'professional',
    downloadUrl: '/templates/employment-letter-template.docx',
    requirements: [
      'On company letterhead',
      'Position title and responsibilities',
      'Employment duration',
      'Salary information',
      'HR manager signature and contact'
    ]
  },
  'cv-resume': {
    name: 'CV/Resume Template',  
    description: 'Professional CV template for immigration purposes',
    category: 'professional',
    downloadUrl: '/templates/cv-template.docx',
    requirements: [
      'Professional format',
      'Education details',
      'Work experience chronology',
      'Skills and qualifications',
      'Contact information'
    ]
  },

  // Investment Documents
  'investment-agreement': {
    name: 'Investment Agreement Template',
    description: 'Template for investment commitment documentation',
    category: 'investment',
    downloadUrl: '/templates/investment-agreement-template.pdf',
    requirements: [
      'Investment amount specification',
      'Investment vehicle details',
      'Terms and conditions',
      'Legal signatures required',
      'Notarization may be required'
    ]
  },

  // Application Forms
  'application-form': {
    name: 'Citizenship Application Form',
    description: 'Official government application form',
    category: 'application',
    downloadUrl: '/templates/citizenship-application-form.pdf',
    requirements: [
      'Complete all sections',
      'Use black ink only',
      'Print clearly or type',
      'Sign where indicated',
      'Attach required documents'
    ]
  }
}

const templatesQuerySchema = z.object({
  applicationId: z.string().optional(),
  category: z.enum(['personal', 'financial', 'professional', 'investment', 'application']).optional(),
  templateId: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    console.log('Templates API: Starting authentication...')
    const clientAuth = await requireClientAuth()
    console.log('Templates API: Authentication successful', { clientId: clientAuth.clientId })
    const client = clientAuth.client
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const query = templatesQuerySchema.safeParse({
      applicationId: searchParams.get('applicationId'),
      category: searchParams.get('category'),
      templateId: searchParams.get('templateId')
    })

    if (!query.success) {
      console.error('Template API validation error:', query.error.issues)
      return NextResponse.json({ 
        error: 'Invalid query parameters',
        details: query.error.issues 
      }, { status: 400 })
    }

    const { applicationId, category, templateId } = query.data

    // If specific template requested, return it
    if (templateId) {
      const template = DOCUMENT_TEMPLATES[templateId as keyof typeof DOCUMENT_TEMPLATES]
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }

      return NextResponse.json({
        id: templateId,
        ...template
      })
    }

    let relevantTemplates = Object.entries(DOCUMENT_TEMPLATES)

    // Filter by category if specified
    if (category) {
      relevantTemplates = relevantTemplates.filter(([, template]) => template.category === category)
    }

    // Get client's enrolled programs to determine template relevance
    let clientPrograms: string[] = []
    const clientApplications = await db
      .select({
        programName: crbiPrograms.programName,
        countryName: crbiPrograms.countryName,
        programType: crbiPrograms.programType
      })
      .from(applications)
      .innerJoin(crbiPrograms, eq(applications.programId, crbiPrograms.id))
      .where(eq(applications.clientId, client.id))

    clientPrograms = clientApplications.map(app => 
      `${app.countryName}-${app.programType}`.toLowerCase()
    )

    // If applicationId provided, get document requirements to show relevant templates
    let applicationRequirements: string[] = []
    if (applicationId) {
      // Verify client owns this application
      const application = await db
        .select()
        .from(applications)
        .where(and(
          eq(applications.id, applicationId),
          eq(applications.clientId, client.id)
        ))
        .limit(1)

      if (application.length) {
        // Get document requirements for this application
        const requirements = await db
          .select({
            documentName: documentRequirements.documentName,
            category: documentRequirements.category
          })
          .from(documentRequirements)
          .where(eq(documentRequirements.applicationId, applicationId))

        applicationRequirements = requirements.map(req => req.documentName.toLowerCase().replace(/\s+/g, '-'))
      }
    }

    // Format templates for response
    const templates = relevantTemplates.map(([id, template]) => ({
      id,
      ...template,
      isRelevant: applicationRequirements.length === 0 || 
                 applicationRequirements.includes(id) ||
                 clientPrograms.length > 0 // Show as relevant if client has any enrolled programs
    }))

    // Group templates by category
    const templatesByCategory = templates.reduce((acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = []
      }
      acc[template.category].push(template)
      return acc
    }, {} as Record<string, typeof templates>)

    return NextResponse.json({
      templates: templatesByCategory,
      applicationId,
      totalTemplates: templates.length
    })

  } catch (error) {
    console.error('Error fetching document templates:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Download a specific template
export async function POST(request: NextRequest) {
  try {
    const clientAuth = await requireClientAuth()

    const body = await request.json()
    const { templateId } = z.object({
      templateId: z.string()
    }).parse(body)

    const template = DOCUMENT_TEMPLATES[templateId as keyof typeof DOCUMENT_TEMPLATES]
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Log template download for analytics
    console.log(`Template downloaded: ${templateId} by client ${clientAuth.clientId}`)

    return NextResponse.json({
      templateId,
      downloadUrl: template.downloadUrl,
      name: template.name,
      description: template.description,
      requirements: template.requirements
    })

  } catch (error) {
    console.error('Error processing template download:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.issues 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}