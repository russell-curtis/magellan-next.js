import { db } from '@/db/drizzle'
import { clients, users, applications, familyMembers } from '@/db/schema'
import { eq, and, or, ilike, desc, count, sql, inArray } from 'drizzle-orm'
import type { Client, NewClient, ClientStatus, User } from '@/db/schema'
import type { CreateClientInput, FamilyMemberInput } from '@/lib/validations/clients'

export interface FamilyMember {
  id: string
  clientId: string
  firstName: string
  lastName: string
  relationship: string
  dateOfBirth?: string | null
  placeOfBirth?: string | null
  currentCitizenships?: string[] | null
  passportNumber?: string | null
  passportExpiryDate?: string | null
  passportIssuingCountry?: string | null
  includeInApplication: boolean
  applicationStatus: string
  education?: string | null
  profession?: string | null
  medicalConditions?: string | null
  specialRequirements?: string | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ClientWithDetails extends Client {
  assignedAdvisor?: User | null
  applicationCount?: number
  totalInvestment?: string
  familyMembers?: FamilyMember[]
}

export interface ClientListParams {
  firmId: string
  page?: number
  limit?: number
  search?: string
  status?: ClientStatus
  advisorId?: string
  urgencyLevel?: string
  desiredTimeline?: string
  budgetRange?: string
  geographicPreferences?: string[]
  tags?: string[]
  hasFamily?: boolean
}

export interface ClientStats {
  total: number
  prospects: number
  active: number
  approved: number
  rejected: number
  totalNetWorth: string
  avgInvestmentBudget: string
}

export class ClientService {
  static async getClientsByFirm({
    firmId,
    page = 1,
    limit = 50,
    search,
    status,
    advisorId
  }: ClientListParams): Promise<{
    clients: ClientWithAdvisor[]
    totalCount: number
    totalPages: number
  }> {
    const offset = (page - 1) * limit
    
    const whereConditions = [eq(clients.firmId, firmId)]
    
    if (search) {
      whereConditions.push(
        or(
          ilike(clients.firstName, `%${search}%`),
          ilike(clients.lastName, `%${search}%`),
          ilike(clients.email, `%${search}%`)
        )!
      )
    }
    
    if (status) {
      whereConditions.push(eq(clients.status, status))
    }
    
    if (advisorId) {
      whereConditions.push(eq(clients.assignedAdvisorId, advisorId))
    }

    const [clientsData, totalCountResult] = await Promise.all([
      db
        .select({
          // Basic Information
          id: clients.id,
          firmId: clients.firmId,
          assignedAdvisorId: clients.assignedAdvisorId,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
          phone: clients.phone,
          alternativePhone: clients.alternativePhone,
          preferredContactMethod: clients.preferredContactMethod,
          
          // Identity & Citizenship
          dateOfBirth: clients.dateOfBirth,
          placeOfBirth: clients.placeOfBirth,
          currentCitizenships: clients.currentCitizenships,
          currentResidency: clients.currentResidency,
          passportNumber: clients.passportNumber,
          passportExpiryDate: clients.passportExpiryDate,
          passportIssuingCountry: clients.passportIssuingCountry,
          
          // Professional & Educational Background
          currentProfession: clients.currentProfession,
          industry: clients.industry,
          employmentStatus: clients.employmentStatus,
          
          // Immigration & Travel Goals
          primaryGoals: clients.primaryGoals,
          desiredTimeline: clients.desiredTimeline,
          urgencyLevel: clients.urgencyLevel,
          
          // Program Preferences & Qualification
          preferredPrograms: clients.preferredPrograms,
          programQualificationScore: clients.programQualificationScore,
          budgetRange: clients.budgetRange,
          
          // Internal Notes & Status
          status: clients.status,
          notes: clients.notes,
          tags: clients.tags,
          lastContactDate: clients.lastContactDate,
          nextFollowUpDate: clients.nextFollowUpDate,
          
          // Legacy fields for backward compatibility
          nationality: clients.nationality,
          netWorthEstimate: clients.netWorthEstimate,
          investmentBudget: clients.investmentBudget,
          sourceOfFunds: clients.sourceOfFunds,
          
          // System fields
          createdAt: clients.createdAt,
          updatedAt: clients.updatedAt,
          assignedAdvisor: {
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role
          },
          applicationCount: count(applications.id)
        })
        .from(clients)
        .leftJoin(users, eq(clients.assignedAdvisorId, users.id))
        .leftJoin(applications, eq(clients.id, applications.clientId))
        .where(and(...whereConditions))
        .groupBy(clients.id, users.id, users.name, users.email, users.role)
        .orderBy(desc(clients.createdAt))
        .limit(limit)
        .offset(offset),
      
      db
        .select({ count: count() })
        .from(clients)
        .where(and(...whereConditions))
    ])

    const totalCount = totalCountResult[0]?.count || 0
    const totalPages = Math.ceil(totalCount / limit)

    // Get comprehensive intake data for clients that have it
    const clientIds = clientsData.map(c => c.id)
    let comprehensiveData = new Map()
    
    if (clientIds.length > 0) {
      try {
        const comprehensiveFields = await db
          .select({
            id: clients.id,
            currentCitizenships: clients.currentCitizenships,
            currentResidency: clients.currentResidency,
            primaryGoals: clients.primaryGoals,
            desiredTimeline: clients.desiredTimeline,
            urgencyLevel: clients.urgencyLevel,
            budgetRange: clients.budgetRange,
            programQualificationScore: clients.programQualificationScore
          })
          .from(clients)
          .where(inArray(clients.id, clientIds))
        
        comprehensiveFields.forEach(field => {
          comprehensiveData.set(field.id, field)
        })
      } catch (error) {
        console.log('Could not fetch comprehensive fields, using legacy data only')
      }
    }

    const enrichedClients = clientsData.map(client => ({
      ...client,
      assignedAdvisor: client.assignedAdvisor?.id ? client.assignedAdvisor : null,
      // Add comprehensive fields if available
      ...comprehensiveData.get(client.id)
    }))

    return {
      clients: enrichedClients as ClientWithAdvisor[],
      totalCount,
      totalPages
    }
  }

  static async getClientById(clientId: string, firmId: string): Promise<ClientWithAdvisor | null> {
    const result = await db
      .select({
        // Basic Information
        id: clients.id,
        firmId: clients.firmId,
        assignedAdvisorId: clients.assignedAdvisorId,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        phone: clients.phone,
        alternativePhone: clients.alternativePhone,
        preferredContactMethod: clients.preferredContactMethod,
        
        // Identity & Citizenship
        dateOfBirth: clients.dateOfBirth,
        placeOfBirth: clients.placeOfBirth,
        currentCitizenships: clients.currentCitizenships,
        currentResidency: clients.currentResidency,
        passportNumber: clients.passportNumber,
        passportExpiryDate: clients.passportExpiryDate,
        passportIssuingCountry: clients.passportIssuingCountry,
        additionalPassports: clients.additionalPassports,
        languagesSpoken: clients.languagesSpoken,
        
        // Professional & Educational Background
        educationLevel: clients.educationLevel,
        educationDetails: clients.educationDetails,
        currentProfession: clients.currentProfession,
        industry: clients.industry,
        employmentStatus: clients.employmentStatus,
        yearsOfExperience: clients.yearsOfExperience,
        currentEmployer: clients.currentEmployer,
        professionalLicenses: clients.professionalLicenses,
        businessOwnership: clients.businessOwnership,
        
        // Immigration & Travel Goals
        primaryGoals: clients.primaryGoals,
        desiredTimeline: clients.desiredTimeline,
        geographicPreferences: clients.geographicPreferences,
        lifestyleRequirements: clients.lifestyleRequirements,
        travelFrequency: clients.travelFrequency,
        currentVisaRestrictions: clients.currentVisaRestrictions,
        
        // Immigration History
        previousApplications: clients.previousApplications,
        visaDenials: clients.visaDenials,
        visaDenialDetails: clients.visaDenialDetails,
        immigrationIssues: clients.immigrationIssues,
        immigrationIssueDetails: clients.immigrationIssueDetails,
        
        // Financial & Investment Readiness
        sourceOfFundsReadiness: clients.sourceOfFundsReadiness,
        sourceOfFundsTypes: clients.sourceOfFundsTypes,
        sourceOfFundsDescription: clients.sourceOfFundsDescription,
        investmentExperience: clients.investmentExperience,
        investmentPreferences: clients.investmentPreferences,
        liquidityTimeline: clients.liquidityTimeline,
        financialAdvisorsInvolved: clients.financialAdvisorsInvolved,
        
        // Compliance & Background
        isPep: clients.isPep,
        pepDetails: clients.pepDetails,
        sanctionsScreening: clients.sanctionsScreening,
        criminalBackground: clients.criminalBackground,
        criminalBackgroundDetails: clients.criminalBackgroundDetails,
        professionalReferences: clients.professionalReferences,
        
        // Program Preferences & Qualification
        preferredPrograms: clients.preferredPrograms,
        programQualificationScore: clients.programQualificationScore,
        budgetRange: clients.budgetRange,
        urgencyLevel: clients.urgencyLevel,
        referralSource: clients.referralSource,
        
        // Internal Notes & Status
        status: clients.status,
        qualificationNotes: clients.qualificationNotes,
        notes: clients.notes,
        tags: clients.tags,
        lastContactDate: clients.lastContactDate,
        nextFollowUpDate: clients.nextFollowUpDate,
        
        // Legacy fields for backward compatibility
        nationality: clients.nationality,
        netWorthEstimate: clients.netWorthEstimate,
        investmentBudget: clients.investmentBudget,
        sourceOfFunds: clients.sourceOfFunds,
        
        // System fields
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
        assignedAdvisor: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role
        },
        applicationCount: count(applications.id)
      })
      .from(clients)
      .leftJoin(users, eq(clients.assignedAdvisorId, users.id))
      .leftJoin(applications, eq(clients.id, applications.clientId))
      .where(and(eq(clients.id, clientId), eq(clients.firmId, firmId)))
      .groupBy(clients.id, users.id, users.name, users.email, users.role)

    return result[0] as ClientWithAdvisor || null
  }

  static async createClient(clientData: CreateClientInput & { firmId: string }): Promise<ClientWithDetails> {
    try {
      // Extract family members from client data
      const { familyMembers: familyMembersData, ...clientDataWithoutFamily } = clientData
      
      // Create the client
      const clientResult = await db
        .insert(clients)
        .values({
          ...clientDataWithoutFamily,
          createdAt: new Date(),
          updatedAt: new Date()
        } as any)
        .returning()

      const newClient = clientResult[0]

      // Create family members if provided
      let createdFamilyMembers: FamilyMember[] = []
      if (familyMembersData && familyMembersData.length > 0) {
        const validFamilyMembers = familyMembersData.filter(member => 
          member.firstName && member.lastName && member.relationship
        )

        if (validFamilyMembers.length > 0) {
          const familyMemberResults = await db
            .insert(familyMembers)
            .values(validFamilyMembers.map(member => ({
              ...member,
              clientId: newClient.id,
              createdAt: new Date(),
              updatedAt: new Date()
            })) as any)
            .returning()

          createdFamilyMembers = familyMemberResults as FamilyMember[]
        }
      }

      return {
        ...newClient,
        familyMembers: createdFamilyMembers
      } as ClientWithDetails
    } catch (error) {
      console.error('Error creating client:', error)
      throw error
    }
  }

  static async updateClient(
    clientId: string, 
    firmId: string, 
    updates: Partial<CreateClientInput>
  ): Promise<ClientWithDetails | null> {
    try {
      // Extract family members data from updates
      const { familyMembers: familyMembersData, ...clientData } = updates

      // Clean up client data by removing undefined values and system fields
      const cleanClientData = Object.fromEntries(
        Object.entries(clientData).filter(([key, value]) => {
          // Skip system fields that shouldn't be updated
          if (['id', 'firmId', 'createdAt', 'updatedAt'].includes(key)) {
            return false
          }
          // Skip undefined values
          if (value === undefined) {
            return false
          }
          return true
        })
      )

      // Update main client data
      const clientResult = await db
        .update(clients)
        .set({
          ...cleanClientData,
          updatedAt: new Date()
        })
        .where(and(eq(clients.id, clientId), eq(clients.firmId, firmId)))
        .returning()
      
      if (!clientResult[0]) {
        return null
      }

      const updatedClient = clientResult[0]

      // Handle family members updates if provided
      let updatedFamilyMembers: FamilyMember[] = []
      if (familyMembersData !== undefined) {
        // Delete existing family members for this client
        await db
          .delete(familyMembers)
          .where(eq(familyMembers.clientId, clientId))

        // Insert new family members if any
        if (familyMembersData && familyMembersData.length > 0) {
          const validFamilyMembers = familyMembersData.filter(member => 
            member.firstName && member.lastName && member.relationship
          )

          if (validFamilyMembers.length > 0) {
            const familyMemberResults = await db
              .insert(familyMembers)
              .values(validFamilyMembers.map(member => ({
                ...member,
                clientId: clientId,
                createdAt: new Date(),
                updatedAt: new Date()
              })) as any)
              .returning()

            updatedFamilyMembers = familyMemberResults as FamilyMember[]
          }
        }
      } else {
        // If family members not provided in update, fetch existing ones
        const existingFamilyMembers = await db
          .select()
          .from(familyMembers)
          .where(eq(familyMembers.clientId, clientId))
        
        updatedFamilyMembers = existingFamilyMembers as FamilyMember[]
      }

      return {
        ...updatedClient,
        familyMembers: updatedFamilyMembers
      } as ClientWithDetails
    } catch (error) {
      console.error('Error updating client:', error)
      throw error
    }
  }

  static async deleteClient(clientId: string, firmId: string): Promise<boolean> {
    const result = await db
      .delete(clients)
      .where(and(eq(clients.id, clientId), eq(clients.firmId, firmId)))
      .returning()

    return result.length > 0
  }

  static async getClientStats(firmId: string): Promise<ClientStats> {
    try {
      // Simplified stats query to avoid complex calculations
      const statsResult = await db
        .select({
          status: clients.status,
          count: count()
        })
        .from(clients)
        .where(eq(clients.firmId, firmId))
        .groupBy(clients.status)

      const statsByStatus = statsResult.reduce((acc, item) => {
        if (item.status && item.status !== null) {
          acc[item.status as string] = item.count
        }
        return acc
      }, {} as Record<string, number>)

      const totalClients = Object.values(statsByStatus).reduce((sum, count) => sum + count, 0)

      return {
        total: totalClients,
        prospects: statsByStatus.prospect || 0,
        active: statsByStatus.active || 0,
        approved: statsByStatus.approved || 0,
        rejected: statsByStatus.rejected || 0,
        totalNetWorth: '0', // Simplified for now
        avgInvestmentBudget: '0' // Simplified for now
      }
    } catch (error) {
      console.error('Error calculating client stats:', error)
      // Return safe defaults if calculation fails
      return {
        total: 0,
        prospects: 0,
        active: 0,
        approved: 0,
        rejected: 0,
        totalNetWorth: '0',
        avgInvestmentBudget: '0'
      }
    }
  }

  static async getAdvisorsByFirm(firmId: string): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(and(eq(users.firmId, firmId), eq(users.isActive, true)))
      .orderBy(users.name)
  }

  // Family Member Management Methods
  static async getFamilyMembersByClient(clientId: string): Promise<FamilyMember[]> {
    return db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.clientId, clientId))
      .orderBy(familyMembers.createdAt)
  }

  static async createFamilyMember(familyMemberData: FamilyMemberInput & { clientId: string }): Promise<FamilyMember> {
    const result = await db
      .insert(familyMembers)
      .values({
        ...familyMemberData,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any)
      .returning()

    return result[0] as FamilyMember
  }

  static async updateFamilyMember(
    familyMemberId: string,
    clientId: string,
    updates: Partial<FamilyMemberInput>
  ): Promise<FamilyMember | null> {
    const result = await db
      .update(familyMembers)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(and(
        eq(familyMembers.id, familyMemberId),
        eq(familyMembers.clientId, clientId)
      ))
      .returning()

    return result[0] as FamilyMember || null
  }

  static async deleteFamilyMember(familyMemberId: string, clientId: string): Promise<boolean> {
    const result = await db
      .delete(familyMembers)
      .where(and(
        eq(familyMembers.id, familyMemberId),
        eq(familyMembers.clientId, clientId)
      ))
      .returning()

    return result.length > 0
  }

  // Enhanced client retrieval with family members
  static async getClientWithFamilyById(clientId: string, firmId: string): Promise<ClientWithDetails | null> {
    const client = await this.getClientById(clientId, firmId)
    if (!client) return null

    const family = await this.getFamilyMembersByClient(clientId)
    
    return {
      ...client,
      familyMembers: family
    } as ClientWithDetails
  }

  // Program qualification and scoring
  static async calculateClientQualificationScore(clientId: string): Promise<number> {
    const client = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1)

    if (!client[0]) return 0

    const clientData = client[0]
    let score = 0

    // Basic information completeness (20 points)
    if (clientData.firstName && clientData.lastName) score += 5
    if (clientData.email && clientData.phone) score += 5
    if (clientData.currentCitizenships && clientData.currentCitizenships.length > 0) score += 5
    if (clientData.passportNumber && clientData.passportExpiryDate) score += 5

    // Professional background (20 points)
    if (clientData.employmentStatus) score += 5
    if (clientData.currentProfession && clientData.industry) score += 5
    if (clientData.educationLevel) score += 5
    if (clientData.yearsOfExperience && clientData.yearsOfExperience > 0) score += 5

    // Immigration goals and timeline (20 points)
    if (clientData.primaryGoals && clientData.primaryGoals.length > 0) score += 10
    if (clientData.desiredTimeline) score += 5
    if (clientData.urgencyLevel) score += 5

    // Financial readiness (25 points)
    if (clientData.sourceOfFundsReadiness) score += 10
    if (clientData.budgetRange) score += 10
    if (clientData.sourceOfFundsTypes && clientData.sourceOfFundsTypes.length > 0) score += 5

    // Program preferences (10 points)
    if (clientData.geographicPreferences && clientData.geographicPreferences.length > 0) score += 5
    if (clientData.preferredPrograms && clientData.preferredPrograms.length > 0) score += 5

    // Compliance readiness (5 points)
    if (clientData.sanctionsScreening === 'cleared') score += 3
    if (!clientData.criminalBackground && !clientData.visaDenials) score += 2

    // Update the score in the database
    await db
      .update(clients)
      .set({ 
        programQualificationScore: score,
        updatedAt: new Date()
      })
      .where(eq(clients.id, clientId))

    return score
  }

  // Update client status with validation and logging
  static async updateClientStatus(
    clientId: string, 
    firmId: string, 
    newStatus: ClientStatus,
    triggeredBy?: string,
    context?: { applicationId?: string; reason?: string }
  ): Promise<boolean> {
    try {
      // Verify client exists and belongs to firm
      const existingClient = await db
        .select({ id: clients.id, status: clients.status })
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.firmId, firmId)))
        .limit(1)

      if (!existingClient.length) {
        console.error(`Client not found: ${clientId} for firm: ${firmId}`)
        return false
      }

      const oldStatus = existingClient[0].status

      // Skip update if status is already the target status
      if (oldStatus === newStatus) {
        console.log(`Client ${clientId} already has status: ${newStatus}`)
        return true
      }

      // Update client status
      await db
        .update(clients)
        .set({ 
          status: newStatus,
          updatedAt: new Date()
        })
        .where(and(eq(clients.id, clientId), eq(clients.firmId, firmId)))

      console.log(`Client status updated: ${clientId} from ${oldStatus} to ${newStatus}`)
      return true

    } catch (error) {
      console.error('Error updating client status:', error)
      return false
    }
  }
}