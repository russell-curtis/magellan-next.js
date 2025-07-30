# Multi-Country CRBI Support System

This document describes the comprehensive multi-country support system for CRBI (Citizenship and Residency by Investment) programs implemented in the Magellan platform.

## Overview

The multi-country support system provides comprehensive coverage of major CRBI programs worldwide, with focus on programs offering digital integration capabilities and high market demand among advisory firms in Europe and the Middle East.

## Supported Programs (2024-2025)

### European Golden Visa Programs

#### 🇵🇹 Portugal Golden Visa
- **Status**: ✅ Active with Full Portal Integration
- **Type**: Residency by Investment
- **Processing Time**: 10-12 months
- **Investment Range**: €250K - €1.5M
- **Portal Integration**: Full OAuth2 integration with SEF
- **Key Features**:
  - Path to citizenship in 5 years
  - Investment fund options (€250K minimum)
  - Real estate rehabilitation (€400K)
  - Business/job creation (€500K)

#### 🇬🇷 Greece Golden Visa  
- **Status**: ✅ Active with Full Portal Integration
- **Type**: Residency by Investment
- **Processing Time**: 8-10 months
- **Investment Range**: €400K - €800K
- **Portal Integration**: Full OAuth2 integration
- **Key Features**:
  - Different pricing for Athens/Thessaloniki vs other areas
  - Real estate investment focus
  - Government bonds option
  - Family inclusion

### Caribbean CBI Programs

#### 🇬🇩 Grenada (#1 Ranked CBI)
- **Status**: ✅ Active with Full Portal Integration
- **Type**: Citizenship by Investment
- **Processing Time**: 6 months
- **Investment Range**: $150K - $400K
- **Portal Integration**: Full API key integration
- **Key Features**:
  - E-2 visa treaty with USA
  - National Transformation Fund donation ($150K)
  - Real estate investment ($270K)
  - Strong family pricing

#### 🇱🇨 Saint Lucia (#2 Ranked CBI)
- **Status**: ✅ Active with Partial Portal Integration
- **Type**: Citizenship by Investment
- **Processing Time**: 6 months
- **Investment Range**: $100K - $300K
- **Portal Integration**: Partial API integration
- **Key Features**:
  - Most family-friendly pricing
  - National Economic Fund ($100K)
  - Real estate options ($300K)

#### 🇦🇬 Antigua & Barbuda
- **Status**: ✅ Active with Partial Portal Integration
- **Type**: Citizenship by Investment
- **Processing Time**: 6 months
- **Investment Range**: $100K - $400K
- **Portal Integration**: Partial API integration
- **Key Features**:
  - Special family rates (family of 4 for $100K)
  - Multiple investment routes
  - Business investment options

#### 🇰🇳 Saint Kitts & Nevis (Original CBI)
- **Status**: ✅ Active with Full Portal Integration
- **Type**: Citizenship by Investment
- **Processing Time**: 4 months (fastest)
- **Investment Range**: $250K - $400K
- **Portal Integration**: Full OAuth2 integration
- **Key Features**:
  - Fastest processing globally
  - Excellent reputation
  - SISC fund contribution
  - 7-year real estate holding

#### 🇻🇺 Vanuatu (Fastest Global)
- **Status**: ✅ Active (No Digital Portal)
- **Type**: Citizenship by Investment
- **Processing Time**: 2-3 months
- **Investment Range**: $130K - $180K
- **Portal Integration**: None (agent-based processing)
- **Key Features**:
  - Fastest processing time globally
  - Flat family rates
  - Development Support Program

#### 🇩🇲 Dominica
- **Status**: ✅ Active (No Digital Portal)
- **Type**: Citizenship by Investment
- **Processing Time**: 6-9 months
- **Investment Range**: $100K - $200K
- **Portal Integration**: None (traditional processing)
- **Key Features**:
  - Competitive pricing
  - Economic Diversification Fund
  - Nature-focused investment options

### Other Programs

#### 🇹🇷 Turkey
- **Status**: ✅ Active (No Digital Portal)
- **Type**: Citizenship by Investment
- **Processing Time**: 6-10 months
- **Investment Range**: $400K - $1M
- **Portal Integration**: None
- **Key Features**:
  - European positioning
  - Real estate focus ($400K)
  - Bank deposit option ($500K)

## Portal Integration Architecture

### Integration Levels

#### Full Integration (4 countries)
- **Countries**: Portugal, Greece, Grenada, Saint Kitts & Nevis
- **Features**:
  - Real-time application submission
  - Automated status synchronization
  - Document upload capabilities
  - Government reference number tracking
  - Webhook status updates

#### Partial Integration (2 countries)
- **Countries**: Saint Lucia, Antigua & Barbuda
- **Features**:
  - Basic application submission
  - Limited status checking
  - Manual document upload
  - Periodic status sync

#### No Integration (3 countries)
- **Countries**: Dominica, Vanuatu, Turkey
- **Features**:
  - Program information only
  - Manual processing workflows
  - Traditional agent-based submission

### Technical Implementation

#### Portal Adapters
Each country with digital capabilities has a dedicated portal adapter:

```typescript
// Portugal Golden Visa
export class PortugalGoldenVisaAdapter extends BaseGovernmentPortalAdapter {
  // OAuth2 authentication with SEF
  // Portuguese API format transformation
  // Document type mapping for SEF requirements
}

// Greece Golden Visa  
export class GreeceGoldenVisaAdapter extends BaseGovernmentPortalAdapter {
  // OAuth2 authentication with migration portal
  // Greek API format transformation
  // Investment type validation
}

// Grenada CBI
export class GrenadaCBIAdapter extends BaseGovernmentPortalAdapter {
  // API Key authentication
  // CBI-specific document categories
  // Investment route mapping
}
```

#### Configuration Management
Portal configurations are environment-driven:

```bash
# Portugal Configuration
PORTUGAL_PORTAL_URL=https://api.sef.pt
PORTUGAL_CLIENT_ID=your_client_id
PORTUGAL_CLIENT_SECRET=your_client_secret
PORTUGAL_TOKEN_URL=https://api.sef.pt/oauth/token

# Greece Configuration  
GREECE_PORTAL_URL=https://api.migration.gov.gr
GREECE_CLIENT_ID=your_client_id
GREECE_CLIENT_SECRET=your_client_secret

# Grenada Configuration
GRENADA_PORTAL_URL=https://api.cbigrenada.gov.gd
GRENADA_API_KEY=your_api_key
```

## Database Schema

### Programs Table Enhancement
```sql
CREATE TABLE crbi_programs (
  id UUID PRIMARY KEY,
  program_name VARCHAR(255) NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  country_name VARCHAR(100) NOT NULL,
  program_type VARCHAR(50) NOT NULL, -- 'citizenship_by_investment' | 'residency_by_investment'
  description TEXT,
  min_investment DECIMAL(15,2) NOT NULL DEFAULT 0,
  max_investment DECIMAL(15,2),
  processing_time_months INTEGER,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB, -- includes portal integration info
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(country_code, program_name)
);
```

### Investment Options Table
```sql
CREATE TABLE investment_options (
  id UUID PRIMARY KEY,
  program_id UUID REFERENCES crbi_programs(id) ON DELETE CASCADE,
  option_type VARCHAR(100) NOT NULL, -- 'Donation', 'Real Estate', 'Business Investment', etc.
  option_name VARCHAR(255) NOT NULL,
  description TEXT,
  base_amount DECIMAL(15,2) NOT NULL,
  family_pricing JSONB, -- structured pricing for family members
  holding_period_months INTEGER, -- holding period requirement
  conditions JSONB,
  eligibility_requirements JSONB,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Program Management

#### GET /api/admin/crbi-programs
List all CRBI programs with portal status.

**Query Parameters:**
- `include_options=true` - Include investment options
- `type=citizenship_by_investment` - Filter by program type
- `country=PT` - Filter by country code
- `portal=integrated` - Filter by portal integration level

**Response:**
```json
{
  "success": true,
  "programs": [
    {
      "id": "uuid",
      "programName": "Portugal Golden Visa",
      "countryCode": "PT",
      "countryName": "Portugal",
      "programType": "residency_by_investment",
      "minInvestment": 250000,
      "maxInvestment": 1500000,
      "processingTimeMonths": 12,
      "portalStatus": {
        "hasDigitalPortal": true,
        "portalIntegrationLevel": "full",
        "isPortalRegistered": true,
        "portalName": "Portugal SEF Golden Visa Portal",
        "portalStatus": "active"
      },
      "investmentOptions": [...]
    }
  ],
  "statistics": {
    "totalPrograms": 9,
    "byType": {
      "citizenship": 7,
      "residency": 2
    },
    "byRegion": {
      "europe": 2,
      "caribbean": 6,
      "other": 1
    },
    "portalIntegration": {
      "withPortals": 6,
      "integrated": 4,
      "noPortals": 3
    }
  }
}
```

#### POST /api/admin/crbi-programs
Manage programs and test portal integrations.

**Actions Supported:**
- `create_program` - Add new CRBI program
- `test_portal_integration` - Test portal connectivity
- `sync_programs` - Sync with registered portals

### Document Requirements by Country

Each country has specific document requirements and validation rules:

#### Portugal Requirements
- **Identity**: Portuguese-format passport validation
- **Financial**: EUR-denominated financial statements
- **Investment**: SEF-approved investment documentation
- **Legal**: Portuguese apostille requirements

#### Caribbean Requirements (Standardized)
- **Identity**: CARICOM-compatible identity documents
- **Financial**: USD-denominated source of funds
- **Background**: International criminal record checks
- **Medical**: Comprehensive health certificates

## Status Synchronization

### Multi-Country Status Mapping
Different countries use different status terminologies:

| Internal Status | Portugal | Greece | Grenada | St. Kitts |
|----------------|----------|--------|---------|-----------|
| `submitted` | `submetido` | `submitted` | `received` | `submitted` |
| `under_review` | `em_analise` | `under_review` | `under_review` | `in_review` |
| `requires_action` | `documentos_em_falta` | `additional_documents_required` | `additional_info_required` | `action_required` |
| `approved` | `aprovado` | `approved` | `approved` | `approved` |
| `rejected` | `rejeitado` | `rejected` | `declined` | `rejected` |

### Sync Intervals by Region
- **European Programs**: 2-hour intervals (government office hours)
- **Caribbean Programs**: 4-hour intervals (time zone considerations)
- **Other Programs**: 6-hour intervals (limited portal availability)

## Investment Route Mapping

### Program-Specific Investment Types

#### Portugal Golden Visa Routes
```typescript
const portugalInvestmentTypes = {
  'Investment Fund': 'fundos_investimento',
  'Real Estate Investment': 'imobiliario', 
  'Business Creation': 'criacao_empresas',
  'Research Activities': 'atividades_investigacao',
  'Art and Heritage': 'arte_patrimonio'
}
```

#### Greece Golden Visa Routes
```typescript
const greeceInvestmentTypes = {
  'Real Estate Investment': 'real_estate',
  'Government Bonds': 'government_bonds',
  'Business Investment': 'business_investment',
  'Bank Deposits': 'bank_deposits'
}
```

#### Caribbean CBI Routes (Standardized)
```typescript
const caribbeanInvestmentRoutes = {
  'Donation': 'government_contribution',
  'Real Estate': 'approved_real_estate',
  'Government Securities': 'government_bonds',
  'Business Investment': 'enterprise_investment'
}
```

## Regional Compliance Considerations

### European Programs (Portugal, Greece)
- **GDPR Compliance**: Full data protection compliance
- **AML Requirements**: Enhanced due diligence for EU standards
- **Reporting**: FATCA and CRS compliance
- **Processing**: Business hours alignment with government offices

### Caribbean Programs
- **KYC/AML**: Caribbean Financial Action Task Force standards
- **Source of Funds**: Comprehensive documentation requirements
- **Background Checks**: International criminal record verification
- **Agent Authorization**: Licensed agent requirements

### Document Authentication
- **European**: Apostille requirements under Hague Convention
- **Caribbean**: Consular authentication and notarization
- **Translation**: Certified translations to local languages

## Monitoring and Analytics

### Program Performance Metrics
- **Processing Times**: Real vs. advertised processing times
- **Approval Rates**: Success rates by program and investment route
- **Portal Uptime**: Government portal availability statistics
- **Document Completion**: Average document compilation times

### Multi-Country Dashboard
- Regional program comparison
- Investment amount trends by country
- Processing time analytics
- Portal integration health monitoring

## Future Expansion Roadmap

### Phase 1 Targets (Next 6 months)
- **Italy Golden Visa**: New program integration
- **Hungary Golden Visa**: Recently relaunched program
- **UAE Golden Visa**: High-value Middle East market

### Phase 2 Targets (6-12 months)
- **Cyprus Investment Program**: If relaunched
- **New Zealand Investor Visa**: Pacific expansion
- **Canada Investor Programs**: North American market

### Advanced Features
- **Multi-Language Support**: Native language portals
- **Currency Integration**: Real-time exchange rates
- **Compliance Automation**: Automated AML/KYC checking
- **Agent Network**: Authorized agent management system

## Success Metrics

### Integration Success Indicators
- **Portal Connectivity**: 99%+ uptime for integrated portals
- **Status Sync Accuracy**: <2% discrepancy with manual checks
- **Processing Time Prediction**: ±10% accuracy for time estimates
- **Document Completion**: 30%+ reduction in preparation time

### Business Impact
- **Market Coverage**: 80%+ of European/Middle East CRBI market
- **Firm Adoption**: Support for multi-jurisdictional advisory firms
- **Revenue Growth**: Expanded market reach and premium features
- **Client Satisfaction**: Improved transparency and processing speed

The multi-country support system positions Magellan as the comprehensive solution for CRBI advisory firms operating across multiple jurisdictions, with the technical infrastructure to scale to additional countries as markets evolve.