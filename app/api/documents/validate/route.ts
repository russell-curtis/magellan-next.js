// app/api/documents/validate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DocumentQualityValidator } from '@/lib/document-validation'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentType = formData.get('documentType') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!documentType) {
      return NextResponse.json(
        { error: 'Document type is required' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Validate document quality
    const validationResult = await DocumentQualityValidator.validateDocument(
      fileBuffer,
      file.name,
      documentType
    )

    return NextResponse.json({
      success: true,
      validation: validationResult,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Document validation error:', error)
    return NextResponse.json(
      { 
        error: 'Document validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to validate documents.' },
    { status: 405 }
  )
}