import { NextRequest, NextResponse } from 'next/server'
import { ClientService } from '@/lib/db/clients'
import { requireAuth } from '@/lib/auth-utils'
import { updateClientSchema } from '@/lib/validations/clients'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const client = await ClientService.getClientWithFamilyById(id, user.firmId)
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    
    return NextResponse.json(client)
  } catch (error) {
    console.error('Error fetching client:', error)
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error instanceof Error && error.message === 'User setup required') {
      return NextResponse.json({ error: 'User setup required' }, { status: 403 })
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    
    const validatedData = updateClientSchema.parse(body)
    
    const client = await ClientService.updateClient(
      id,
      user.firmId,
      validatedData
    )
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    
    return NextResponse.json(client)
  } catch (error) {
    console.error('Error updating client:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error instanceof Error && error.message === 'User setup required') {
      return NextResponse.json({ error: 'User setup required' }, { status: 403 })
    }
    
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireAuth()
    const { id } = await params
    
    const deleted = await ClientService.deleteClient(id, user.firmId)
    
    if (!deleted) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting client:', error)
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error instanceof Error && error.message === 'User setup required') {
      return NextResponse.json({ error: 'User setup required' }, { status: 403 })
    }
    
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}