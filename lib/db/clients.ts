import { db } from '@/db/drizzle'
import { clients, users, applications } from '@/db/schema'
import { eq, and, or, ilike, desc, count, sql } from 'drizzle-orm'
import type { Client, NewClient, ClientStatus, User } from '@/db/schema'

export interface ClientWithAdvisor extends Client {
  assignedAdvisor?: User | null
  applicationCount?: number
  totalInvestment?: string
}

export interface ClientListParams {
  firmId: string
  page?: number
  limit?: number
  search?: string
  status?: ClientStatus
  advisorId?: string
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
          id: clients.id,
          firmId: clients.firmId,
          assignedAdvisorId: clients.assignedAdvisorId,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
          phone: clients.phone,
          nationality: clients.nationality,
          dateOfBirth: clients.dateOfBirth,
          passportNumber: clients.passportNumber,
          netWorthEstimate: clients.netWorthEstimate,
          investmentBudget: clients.investmentBudget,
          preferredPrograms: clients.preferredPrograms,
          sourceOfFunds: clients.sourceOfFunds,
          status: clients.status,
          notes: clients.notes,
          tags: clients.tags,
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
        nationality: clients.nationality,
        dateOfBirth: clients.dateOfBirth,
        passportNumber: clients.passportNumber,
        netWorthEstimate: clients.netWorthEstimate,
        investmentBudget: clients.investmentBudget,
        preferredPrograms: clients.preferredPrograms,
        sourceOfFunds: clients.sourceOfFunds,
        status: clients.status,
        notes: clients.notes,
        tags: clients.tags,
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

  static async createClient(clientData: Omit<NewClient, 'id' | 'createdAt' | 'updatedAt'> & { firmId: string }): Promise<Client> {
    const result = await db
      .insert(clients)
      .values({
        ...clientData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning()

    return result[0]
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
    const [statsResult, netWorthResult] = await Promise.all([
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
          totalNetWorth: sql<string>`COALESCE(SUM(${clients.netWorthEstimate}), 0)`,
          avgInvestmentBudget: sql<string>`COALESCE(AVG(${clients.investmentBudget}), 0)`
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

    const totalNetWorth = netWorthResult[0]?.totalNetWorth || '0'
    const avgInvestmentBudget = netWorthResult[0]?.avgInvestmentBudget || '0'

    return {
      total: Object.values(statsByStatus).reduce((sum, count) => sum + count, 0),
      prospects: statsByStatus.prospect || 0,
      active: statsByStatus.active || 0,
      approved: statsByStatus.approved || 0,
      rejected: statsByStatus.rejected || 0,
      totalNetWorth,
      avgInvestmentBudget
    }
  }

  static async getAdvisorsByFirm(firmId: string): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(and(eq(users.firmId, firmId), eq(users.isActive, true)))
      .orderBy(users.name)
  }
}