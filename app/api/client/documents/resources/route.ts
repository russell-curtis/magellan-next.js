import { NextResponse } from 'next/server'
import { requireClientAuth } from '@/lib/client-auth'

// For now, return mock data since we don't have agent resources table yet
// This will be replaced with actual database queries when the schema is implemented

export async function GET() {
  try {
    // Authenticate client - will throw error if not authenticated
    await requireClientAuth()

    // Mock agent resources for now
    // TODO: Replace with actual database query when agent_resources table is implemented
    const mockResources = [
      {
        id: '1',
        title: 'St. Kitts Citizenship Process Guide',
        description: 'Comprehensive guide covering the entire citizenship by investment process for St. Kitts and Nevis.',
        category: 'process',
        fileUrl: '/resources/st-kitts-process-guide.pdf',
        fileName: 'st-kitts-process-guide.pdf',
        uploadedAt: new Date().toISOString(),
        programRelevant: true
      },
      {
        id: '2',
        title: 'Investment Options Comparison',
        description: 'Detailed comparison of available investment options and their requirements.',
        category: 'investment',
        fileUrl: '/resources/investment-options.pdf',
        fileName: 'investment-options.pdf',
        uploadedAt: new Date().toISOString(),
        programRelevant: true
      },
      {
        id: '3',
        title: 'Document Preparation Checklist',
        description: 'Checklist to ensure all documents are properly prepared before submission.',
        category: 'preparation',
        fileUrl: '/resources/document-checklist.pdf',
        fileName: 'document-checklist.pdf',
        uploadedAt: new Date().toISOString(),
        programRelevant: true
      }
    ]

    return NextResponse.json({
      resources: mockResources
    })

  } catch (error) {
    console.error('Error fetching agent resources:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}