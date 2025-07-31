import { db } from '@/db/drizzle'
import { clients, crbiPrograms, investmentOptions } from '@/db/schema'
import { eq, and, sql, gte, lte } from 'drizzle-orm'

export interface ProgramMatch {
  program: {
    id: string
    countryName: string
    programName: string
    programType: string
    minInvestment: string
    processingTimeMonths: number
    programDetails: any
  }
  matchScore: number
  matchReasons: string[]
  investmentOptions: Array<{
    id: string
    optionName: string
    optionType: string
    baseAmount: string
    description: string
  }>
  estimatedTimeline: string
  eligibilityStatus: 'qualified' | 'likely_qualified' | 'needs_review' | 'not_qualified'
  requirements: string[]
  considerations: string[]
}

export interface ClientQualification {
  overallScore: number
  programMatches: ProgramMatch[]
  recommendations: string[]
  nextSteps: string[]
  riskFactors: string[]
}

export class ProgramMatchingService {
  /**
   * Analyzes a client profile and returns matched CRBI programs with scoring
   */
  static async matchProgramsForClient(clientId: string): Promise<ClientQualification> {
    const client = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1)

    if (!client[0]) {
      throw new Error('Client not found')
    }

    const clientData = client[0]
    
    // Get all active CRBI programs
    const programs = await db
      .select()
      .from(crbiPrograms)
      .where(eq(crbiPrograms.isActive, true))

    const programMatches: ProgramMatch[] = []

    for (const program of programs) {
      const matchResult = await this.calculateProgramMatch(clientData, program)
      if (matchResult.matchScore > 20) { // Only include programs with reasonable match
        programMatches.push(matchResult)
      }
    }

    // Sort by match score descending
    programMatches.sort((a, b) => b.matchScore - a.matchScore)

    const overallScore = await this.calculateOverallClientScore(clientData)
    const recommendations = this.generateRecommendations(clientData, programMatches)
    const nextSteps = this.generateNextSteps(clientData, programMatches)
    const riskFactors = this.identifyRiskFactors(clientData)

    return {
      overallScore,
      programMatches: programMatches.slice(0, 5), // Top 5 matches
      recommendations,
      nextSteps,
      riskFactors
    }
  }

  /**
   * Calculates match score between client and specific program
   */
  private static async calculateProgramMatch(clientData: any, program: any): Promise<ProgramMatch> {
    let matchScore = 0
    const matchReasons: string[] = []
    const requirements: string[] = []
    const considerations: string[] = []

    // Geographic preferences matching (25 points)
    if (clientData.geographicPreferences && clientData.geographicPreferences.length > 0) {
      const regionMatches = this.getRegionMatches(program.countryName, clientData.geographicPreferences)
      if (regionMatches.length > 0) {
        matchScore += 25
        matchReasons.push(`Geographic preference match: ${regionMatches.join(', ')}`)
      }
    }

    // Budget compatibility (25 points)
    const budgetScore = this.calculateBudgetCompatibility(clientData.budgetRange, program.minInvestment)
    matchScore += budgetScore
    if (budgetScore > 15) {
      matchReasons.push('Investment budget aligns with program requirements')
    } else if (budgetScore > 0) {
      considerations.push('Investment budget may require adjustment')
    }

    // Timeline compatibility (20 points)
    const timelineScore = this.calculateTimelineCompatibility(
      clientData.desiredTimeline, 
      clientData.urgencyLevel, 
      program.processingTimeMonths
    )
    matchScore += timelineScore
    if (timelineScore > 15) {
      matchReasons.push('Processing timeline matches client expectations')
    } else if (timelineScore > 5) {
      considerations.push('Processing timeline may exceed desired timeframe')
    }

    // Citizenship goals alignment (15 points)
    if (clientData.primaryGoals && clientData.primaryGoals.length > 0) {
      const goalScore = this.calculateGoalAlignment(clientData.primaryGoals, program.programType)
      matchScore += goalScore
      if (goalScore > 10) {
        matchReasons.push('Program type aligns with client goals')
      }
    }

    // Professional background compatibility (10 points)
    const professionalScore = this.calculateProfessionalCompatibility(
      clientData.employmentStatus,
      clientData.currentProfession,
      clientData.industry,
      program
    )
    matchScore += professionalScore

    // Source of funds compatibility (5 points)
    if (clientData.sourceOfFundsReadiness === 'ready' || clientData.sourceOfFundsReadiness === '1_month') {
      matchScore += 5
      matchReasons.push('Source of funds documentation ready')
    } else if (clientData.sourceOfFundsReadiness === 'not_ready') {
      considerations.push('Source of funds documentation needs preparation')
    }

    // Get investment options for this program
    const investmentOptions = await this.getInvestmentOptionsForProgram(program.id)

    // Determine eligibility status
    const eligibilityStatus = this.determineEligibilityStatus(matchScore, clientData, program)

    // Generate program-specific requirements
    const programRequirements = this.generateProgramRequirements(program, clientData)
    requirements.push(...programRequirements)

    return {
      program: {
        id: program.id,
        countryName: program.countryName,
        programName: program.programName,
        programType: program.programType,
        minInvestment: program.minInvestment,
        processingTimeMonths: program.processingTimeMonths,
        programDetails: program.programDetails
      },
      matchScore: Math.min(matchScore, 100), // Cap at 100
      matchReasons,
      investmentOptions,
      estimatedTimeline: this.calculateEstimatedTimeline(program.processingTimeMonths, clientData),
      eligibilityStatus,
      requirements,
      considerations
    }
  }

  /**
   * Calculate overall client qualification score
   */
  private static async calculateOverallClientScore(clientData: any): Promise<number> {
    let score = 0

    // Profile completeness (30 points)
    score += this.calculateProfileCompleteness(clientData)

    // Financial readiness (25 points)
    score += this.calculateFinancialReadiness(clientData)

    // Timeline and urgency (20 points)
    score += this.calculateTimelineReadiness(clientData)

    // Professional background (15 points)
    score += this.calculateProfessionalScore(clientData)

    // Compliance readiness (10 points)
    score += this.calculateComplianceReadiness(clientData)

    return Math.min(score, 100)
  }

  // Helper methods for scoring calculations
  private static getRegionMatches(countryName: string, preferences: string[]): string[] {
    const regionMapping: Record<string, string[]> = {
      'Europe': ['Portugal', 'Spain', 'Greece', 'Malta', 'Cyprus', 'Austria', 'Ireland'],
      'Caribbean': ['St. Kitts and Nevis', 'Antigua and Barbuda', 'Dominica', 'Grenada', 'St. Lucia'],
      'Pacific': ['Vanuatu', 'Tonga'],
      'Americas': ['United States', 'Canada'],
      'Asia': ['Singapore', 'Malaysia'],
      'Middle East': ['UAE', 'Turkey']
    }

    const matches: string[] = []
    for (const preference of preferences) {
      const region = regionMapping[preference]
      if (region && region.includes(countryName)) {
        matches.push(preference)
      }
    }
    return matches
  }

  private static calculateBudgetCompatibility(budgetRange: string | null, minInvestment: string): number {
    if (!budgetRange) return 0

    const minInvestmentNum = parseFloat(minInvestment)
    
    const budgetRanges: Record<string, { min: number, max: number }> = {
      'under_500k': { min: 0, max: 500000 },
      '500k_1m': { min: 500000, max: 1000000 },
      '1m_2m': { min: 1000000, max: 2000000 },
      '2m_plus': { min: 2000000, max: Infinity }
    }

    const range = budgetRanges[budgetRange]
    if (!range) return 0

    if (minInvestmentNum <= range.max && minInvestmentNum >= range.min * 0.8) {
      return 25 // Perfect match
    } else if (minInvestmentNum <= range.max * 1.2) {
      return 15 // Close match
    } else if (minInvestmentNum <= range.max * 1.5) {
      return 8 // Possible with stretch
    }
    
    return 0
  }

  private static calculateTimelineCompatibility(
    desiredTimeline: string | null,
    urgencyLevel: string | null,
    processingTimeMonths: number
  ): number {
    if (!desiredTimeline) return 5

    const timelineMonths: Record<string, number> = {
      'immediate': 6,
      '6_months': 6,
      '1_year': 12,
      '2_years': 24,
      'exploring': 36
    }

    const clientExpectedMonths = timelineMonths[desiredTimeline] || 24
    
    if (processingTimeMonths <= clientExpectedMonths) {
      return 20
    } else if (processingTimeMonths <= clientExpectedMonths * 1.5) {
      return 12
    } else if (processingTimeMonths <= clientExpectedMonths * 2) {
      return 6
    }
    
    return 0
  }

  private static calculateGoalAlignment(primaryGoals: string[], programType: string): number {
    const goalProgramMapping: Record<string, string[]> = {
      'global_mobility': ['citizenship', 'residency'],
      'tax_optimization': ['residency', 'citizenship'],
      'education': ['citizenship', 'residency'],
      'lifestyle': ['residency', 'citizenship'],
      'business_expansion': ['residency', 'citizenship'],
      'family_security': ['citizenship']
    }

    let score = 0
    for (const goal of primaryGoals) {
      const compatiblePrograms = goalProgramMapping[goal] || []
      if (compatiblePrograms.includes(programType)) {
        score += 15 / primaryGoals.length // Distribute points across goals
      }
    }
    
    return Math.min(score, 15)
  }

  private static calculateProfessionalCompatibility(
    employmentStatus: string | null,
    profession: string | null,
    industry: string | null,
    program: any
  ): number {
    let score = 0

    // Stable employment/business ownership adds credibility
    if (employmentStatus === 'employed' || employmentStatus === 'business_owner') {
      score += 5
    }

    // Certain professions may have advantages in specific programs
    if (profession && industry) {
      score += 5
    }

    return score
  }

  private static calculateProfileCompleteness(clientData: any): number {
    let score = 0
    const requiredFields = [
      'firstName', 'lastName', 'email', 'phone',
      'currentCitizenships', 'employmentStatus', 'primaryGoals', 
      'desiredTimeline', 'sourceOfFundsReadiness', 'budgetRange'
    ]

    for (const field of requiredFields) {
      if (clientData[field] && 
          (Array.isArray(clientData[field]) ? clientData[field].length > 0 : true)) {
        score += 3
      }
    }

    return Math.min(score, 30)
  }

  private static calculateFinancialReadiness(clientData: any): number {
    let score = 0

    if (clientData.sourceOfFundsReadiness === 'ready') score += 15
    else if (clientData.sourceOfFundsReadiness === '1_month') score += 12
    else if (clientData.sourceOfFundsReadiness === '3_months') score += 8
    else if (clientData.sourceOfFundsReadiness === '6_months') score += 5

    if (clientData.budgetRange) score += 10

    return score
  }

  private static calculateTimelineReadiness(clientData: any): number {
    let score = 0

    if (clientData.desiredTimeline) score += 10
    if (clientData.urgencyLevel === 'high' || clientData.urgencyLevel === 'urgent') score += 10

    return score
  }

  private static calculateProfessionalScore(clientData: any): number {
    let score = 0

    if (clientData.employmentStatus) score += 5
    if (clientData.currentProfession) score += 5
    if (clientData.yearsOfExperience && clientData.yearsOfExperience > 5) score += 5

    return score
  }

  private static calculateComplianceReadiness(clientData: any): number {
    let score = 0

    if (clientData.sanctionsScreening === 'cleared') score += 5
    if (!clientData.criminalBackground) score += 3
    if (!clientData.visaDenials) score += 2

    return score
  }

  private static async getInvestmentOptionsForProgram(programId: string) {
    return db
      .select({
        id: investmentOptions.id,
        optionName: investmentOptions.optionName,
        optionType: investmentOptions.optionType,
        baseAmount: investmentOptions.baseAmount,
        description: investmentOptions.description
      })
      .from(investmentOptions)
      .where(and(
        eq(investmentOptions.programId, programId),
        eq(investmentOptions.isActive, true)
      ))
      .orderBy(investmentOptions.sortOrder)
  }

  private static determineEligibilityStatus(
    matchScore: number, 
    clientData: any, 
    program: any
  ): 'qualified' | 'likely_qualified' | 'needs_review' | 'not_qualified' {
    if (matchScore >= 80) return 'qualified'
    if (matchScore >= 60) return 'likely_qualified'
    if (matchScore >= 40) return 'needs_review'
    return 'not_qualified'
  }

  private static generateProgramRequirements(program: any, clientData: any): string[] {
    const requirements: string[] = []

    // Standard requirements for all programs
    requirements.push('Clean criminal background check')
    requirements.push('Source of funds documentation')
    requirements.push('Medical examination')
    requirements.push('Valid passport')

    // Program-specific requirements
    if (program.programType === 'citizenship') {
      requirements.push('Oath of allegiance')
      requirements.push('Residency requirements (if applicable)')
    }

    // Investment-specific requirements
    requirements.push(`Minimum investment of ${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(parseFloat(program.minInvestment))}`)

    return requirements
  }

  private static calculateEstimatedTimeline(processingTimeMonths: number, clientData: any): string {
    let adjustedMonths = processingTimeMonths

    // Adjust based on client readiness
    if (clientData.sourceOfFundsReadiness === 'ready') {
      adjustedMonths -= 1
    } else if (clientData.sourceOfFundsReadiness === 'not_ready') {
      adjustedMonths += 3
    }

    return `${adjustedMonths} months (estimated)`
  }

  private static generateRecommendations(clientData: any, programMatches: ProgramMatch[]): string[] {
    const recommendations: string[] = []

    if (programMatches.length === 0) {
      recommendations.push('Complete client profile to identify suitable programs')
      return recommendations
    }

    const topMatch = programMatches[0]
    
    if (topMatch.matchScore >= 80) {
      recommendations.push(`${topMatch.program.programName} is an excellent match for your profile`)
    } else if (topMatch.matchScore >= 60) {
      recommendations.push(`Consider ${topMatch.program.programName} as a strong option`)
      recommendations.push('Review program requirements and timeline carefully')
    } else {
      recommendations.push('Multiple programs may be suitable - detailed consultation recommended')
    }

    // Budget-based recommendations
    if (clientData.budgetRange === 'under_500k') {
      recommendations.push('Focus on government bond and donation-based programs')
    } else if (clientData.budgetRange === '2m_plus') {
      recommendations.push('Premium real estate and business investment options available')
    }

    return recommendations
  }

  private static generateNextSteps(clientData: any, programMatches: ProgramMatch[]): string[] {
    const nextSteps: string[] = []

    // Document preparation
    if (clientData.sourceOfFundsReadiness !== 'ready') {
      nextSteps.push('Prepare source of funds documentation')
    }

    // Due diligence
    if (clientData.sanctionsScreening !== 'cleared') {
      nextSteps.push('Complete sanctions and PEP screening')
    }

    // Program-specific next steps
    if (programMatches.length > 0) {
      nextSteps.push('Schedule consultation to discuss top program matches')
      nextSteps.push('Review investment options and timelines')
    }

    nextSteps.push('Prepare preliminary application documents')

    return nextSteps
  }

  private static identifyRiskFactors(clientData: any): string[] {
    const riskFactors: string[] = []

    if (clientData.visaDenials) {
      riskFactors.push('Previous visa denials may require additional documentation')
    }

    if (clientData.criminalBackground) {
      riskFactors.push('Criminal background requires careful evaluation')
    }

    if (clientData.isPep) {
      riskFactors.push('PEP status requires enhanced due diligence')
    }

    if (clientData.sourceOfFundsReadiness === 'not_ready') {
      riskFactors.push('Source of funds documentation not yet prepared')
    }

    return riskFactors
  }
}