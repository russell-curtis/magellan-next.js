import { NextResponse } from 'next/server'
import { ClientService } from '@/lib/db/clients'
import { requireAuth } from '@/lib/auth-utils'

export async function GET() {
  try {
    const user = await requireAuth()
    
    const stats = await ClientService.getClientStats(user.firmId)
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching client analytics:', error)
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error instanceof Error && error.message === 'User setup required') {
      return NextResponse.json({ error: 'User setup required' }, { status: 403 })
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch client analytics' },
      { status: 500 }
    )
  }
}