import { db } from '@/db/drizzle'
import { clients, users, applications, familyMembers } from '@/db/schema'
import { eq, and, or, ilike, desc, count, sql } from 'drizzle-orm'
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
  qualified: number
  active: number
  approved: number
  rejected: number
  inactive: number
  avgQualificationScore: number
  urgentCount: number
  familyApplications: number
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
          id: clients.id,
          firmId: clients.firmId,
          assignedAdvisorId: clients.assignedAdvisorId,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
          phone: clients.phone,
          alternativePhone: clients.alternativePhone,
          preferredContactMethod: clients.preferredContactMethod,
          dateOfBirth: clients.dateOfBirth,
          currentCitizenships: clients.currentCitizenships,
          currentResidency: clients.currentResidency,
          passportNumber: clients.passportNumber,
          passportExpiryDate: clients.passportExpiryDate,
          passportIssuingCountry: clients.passportIssuingCountry,
          employmentStatus: clients.employmentStatus,
          currentProfession: clients.currentProfession,
          industry: clients.industry,
          primaryGoals: clients.primaryGoals,
          desiredTimeline: clients.desiredTimeline,
          urgencyLevel: clients.urgencyLevel,
          budgetRange: clients.budgetRange,
          sourceOfFundsReadiness: clients.sourceOfFundsReadiness,
          programQualificationScore: clients.programQualificationScore,
          preferredPrograms: clients.preferredPrograms,
          status: clients.status,
          notes: clients.notes,
          tags: clients.tags,
          lastContactDate: clients.lastContactDate,
          nextFollowUpDate: clients.nextFollowUpDate,
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

    return {
      clients: clientsData as ClientWithAdvisor[],
      totalCount,
      totalPages
    }
  }

  static async getClientById(clientId: string, firmId: string): Promise<ClientWithAdvisor | null> {
    const result = await db
      .select({
        id: clients.id,
        firmId: clients.firmId,
        assignedAdvisorId: clients.assignedAdvisorId,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        phone: clients.phone,
        alternativePhone: clients.alternativePhone,
        preferredContactMethod: clients.preferredContactMethod,
        dateOfBirth: clients.dateOfBirth,
        currentCitizenships: clients.currentCitizenships,
        currentResidency: clients.currentResidency,
        passportNumber: clients.passportNumber,
        passportExpiryDate: clients.passportExpiryDate,
        passportIssuingCountry: clients.passportIssuingCountry,
        employmentStatus: clients.employmentStatus,
        currentProfession: clients.currentProfession,
        industry: clients.industry,
        primaryGoals: clients.primaryGoals,
        desiredTimeline: clients.desiredTimeline,
        urgencyLevel: clients.urgencyLevel,
        budgetRange: clients.budgetRange,
        sourceOfFundsReadiness: clients.sourceOfFundsReadiness,
        programQualificationScore: clients.programQualificationScore,
        preferredPrograms: clients.preferredPrograms,
        status: clients.status,
        notes: clients.notes,
        tags: clients.tags,
        lastContactDate: clients.lastContactDate,
        nextFollowUpDate: clients.nextFollowUpDate,
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
    return await db.transaction(async (tx) => {
      // Extract family members from client data
      const { familyMembers: familyMembersData, ...clientDataWithoutFamily } = clientData
      
      // Create the client
      const clientResult = await tx
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
          const familyMemberResults = await tx
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
    })
  }

  static async updateClient(
    clientId: string, 
    firmId: string, 
    updates: Partial<Omit<Client, 'id' | 'firmId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Client | null> {
    const result = await db
      .update(clients)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(and(eq(clients.id, clientId), eq(clients.firmId, firmId)))
      .returning()

    return result[0] || null
  }

  static async deleteClient(clientId: string, firmId: string): Promise<boolean> {
    const result = await db
      .delete(clients)
      .where(and(eq(clients.id, clientId), eq(clients.firmId, firmId)))
      .returning()

    return result.length > 0
  }

  static async getClientStats(firmId: string): Promise<ClientStats> {
    const [statsResult, qualificationResult] = await Promise.all([
      db
        .select({
          status: clients.status,
          count: count()
        })
        .from(clients)
        .where(eq(clients.firmId, firmId))
        .groupBy(clients.status),
      
      db
        .select({
          avgQualificationScore: sql<string>`COALESCE(AVG(${clients.programQualificationScore}), 0)`,
          urgentCount: sql<string>`COALESCE(COUNT(CASE WHEN ${clients.urgencyLevel} IN ('high', 'urgent') THEN 1 END), 0)`,
          familyApplications: sql<string>`COALESCE(COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM ${familyMembers} WHERE ${familyMembers.clientId} = ${clients.id}) THEN ${clients.id} END), 0)`
        })
        .from(clients)
        .where(eq(clients.firmId, firmId))
    ])

    const statsByStatus = statsResult.reduce((acc, item) => {
      if (item.status && item.status !== null) {
        acc[item.status as string] = item.count
      }
      return acc
    }, {} as Record<string, number>)

    const avgQualificationScore = parseFloat(qualificationResult[0]?.avgQualificationScore || '0')
    const urgentCount = parseInt(qualificationResult[0]?.urgentCount || '0')
    const familyApplications = parseInt(qualificationResult[0]?.familyApplications || '0')

    return {
      total: Object.values(statsByStatus).reduce((sum, count) => sum + count, 0),
      prospects: statsByStatus.prospect || 0,
      qualified: statsByStatus.qualified || 0,
      active: statsByStatus.active || 0,
      approved: statsByStatus.approved || 0,
      rejected: statsByStatus.rejected || 0,
      inactive: statsByStatus.inactive || 0,
      avgQualificationScore,
      urgentCount,
      familyApplications
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
}