import { NextRequest, NextResponse } from 'next/server'
import { ClientService } from '@/lib/db/clients'
import { requireAuth } from '@/lib/auth-utils'
import { createClientSchema, clientQuerySchema } from '@/lib/validations/clients'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    const queryParams = clientQuerySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      advisorId: searchParams.get('advisorId')
    })

    const result = await ClientService.getClientsByFirm({
      firmId: user.firmId,
      ...queryParams
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching clients:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    
    const validatedData = createClientSchema.parse(body)
    
    const client = await ClientService.createClient({
      ...validatedData,
      firmId: user.firmId,
      assignedAdvisorId: validatedData.assignedAdvisorId || null
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('Error creating client:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    )
  }
}