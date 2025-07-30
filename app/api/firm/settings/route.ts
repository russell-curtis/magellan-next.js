import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { firms, users, applications } from '@/db/schema'
import { requireAuth } from '@/lib/auth-utils'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updateFirmSchema = z.object({
  name: z.string().min(1, 'Firm name is required'),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional()
})

export async function GET() {
  try {
    const user = await requireAuth()
    
    console.log('🔍 Firm Settings API: User data:', { 
      id: user.id, 
      firmId: user.firmId, 
      role: user.role 
    })
    
    // Get firm data with counts
    const firmData = await db
      .select({
        id: firms.id,
        name: firms.name,
        slug: firms.slug,
        subscriptionTier: firms.subscriptionTier,
        subscriptionStatus: firms.subscriptionStatus,
        settings: firms.settings,
        createdAt: firms.createdAt,
        updatedAt: firms.updatedAt
      })
      .from(firms)
      .where(eq(firms.id, user.firmId))
      .limit(1)

    console.log('🔍 Firm Settings API: Firm query result:', firmData)

    if (!firmData || !firmData.length || !firmData[0]) {
      console.error('❌ Firm Settings API: No firm found for firmId:', user.firmId)
      return NextResponse.json(
        { error: 'Firm not found' },
        { status: 404 }
      )
    }

    // Get user count for this firm
    const userCount = await db
      .select({ count: users.id })
      .from(users)
      .where(eq(users.firmId, user.firmId))

    // Get application count for this firm
    const applicationCount = await db
      .select({ count: applications.id })
      .from(applications)
      .where(eq(applications.firmId, user.firmId))

    console.log('🔍 Firm Settings API: Counts:', {
      users: userCount.length,
      applications: applicationCount.length
    })

    const firmRecord = firmData[0]
    const settings = firmRecord.settings as any || {}
    
    const firm = {
      id: firmRecord.id,
      name: firmRecord.name,
      slug: firmRecord.slug,
      subscriptionTier: firmRecord.subscriptionTier,
      subscriptionStatus: firmRecord.subscriptionStatus,
      // Extract extended details from settings JSON
      description: settings.description || null,
      website: settings.website || null,
      phone: settings.phone || null,
      email: settings.email || null,
      address: settings.address || null,
      city: settings.city || null,
      state: settings.state || null,
      country: settings.country || null,
      postalCode: settings.postalCode || null,
      createdAt: firmRecord.createdAt,
      updatedAt: firmRecord.updatedAt,
      _count: {
        users: userCount.length,
        applications: applicationCount.length
      }
    }

    console.log('✅ Firm Settings API: Returning firm data:', firm)
    return NextResponse.json({ firm })

  } catch (error) {
    console.error('❌ Firm Settings API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch firm settings' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Check if user has permission to manage firm settings
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions to update firm settings' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validatedData = updateFirmSchema.parse(body)

    // Get current firm data to merge with settings
    const currentFirm = await db
      .select({ settings: firms.settings })
      .from(firms)
      .where(eq(firms.id, user.firmId))
      .limit(1)

    if (!currentFirm.length) {
      return NextResponse.json(
        { error: 'Firm not found' },
        { status: 404 }
      )
    }

    const currentSettings = (currentFirm[0].settings as any) || {}

    // Prepare settings with extended firm details
    const updatedSettings = {
      ...currentSettings,
      description: validatedData.description || null,
      website: validatedData.website || null,
      phone: validatedData.phone || null,
      email: validatedData.email || null,
      address: validatedData.address || null,
      city: validatedData.city || null,
      state: validatedData.state || null,
      country: validatedData.country || null,
      postalCode: validatedData.postalCode || null
    }

    // Update firm data (only core fields and settings)
    const updatedFirm = await db
      .update(firms)
      .set({
        name: validatedData.name,
        settings: updatedSettings,
        updatedAt: new Date()
      })
      .where(eq(firms.id, user.firmId))
      .returning()

    if (!updatedFirm.length) {
      return NextResponse.json(
        { error: 'Firm not found' },
        { status: 404 }
      )
    }

    // Get updated firm data with counts
    const userCount = await db
      .select({ count: users.id })
      .from(users)
      .where(eq(users.firmId, user.firmId))

    const applicationCount = await db
      .select({ count: applications.id })
      .from(applications)
      .where(eq(applications.firmId, user.firmId))

    const updatedFirmRecord = updatedFirm[0]
    const updatedFirmSettings = (updatedFirmRecord.settings as any) || {}
    
    const firm = {
      id: updatedFirmRecord.id,
      name: updatedFirmRecord.name,
      slug: updatedFirmRecord.slug,
      subscriptionTier: updatedFirmRecord.subscriptionTier,
      subscriptionStatus: updatedFirmRecord.subscriptionStatus,
      // Extract extended details from settings JSON
      description: updatedFirmSettings.description || null,
      website: updatedFirmSettings.website || null,
      phone: updatedFirmSettings.phone || null,
      email: updatedFirmSettings.email || null,
      address: updatedFirmSettings.address || null,
      city: updatedFirmSettings.city || null,
      state: updatedFirmSettings.state || null,
      country: updatedFirmSettings.country || null,
      postalCode: updatedFirmSettings.postalCode || null,
      createdAt: updatedFirmRecord.createdAt,
      updatedAt: updatedFirmRecord.updatedAt,
      _count: {
        users: userCount.length,
        applications: applicationCount.length
      }
    }

    return NextResponse.json({ 
      firm,
      message: 'Firm settings updated successfully' 
    })

  } catch (error) {
    console.error('Error updating firm settings:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update firm settings' },
      { status: 500 }
    )
  }
}