# Government Portal Integration Framework

This document describes the government portal integration framework for submitting CRBI applications directly to government portals.

## Overview

The framework provides a pluggable architecture for integrating with different government CRBI portals, with built-in authentication, error handling, rate limiting, and retry logic.

## Architecture

### Core Components

1. **BaseGovernmentPortalAdapter** - Abstract base class defining the interface for government portal integrations
2. **GovernmentPortalRegistry** - Central registry for managing portal adapters
3. **Portal-Specific Adapters** - Concrete implementations for each government portal (e.g., SaintKittsPortalAdapter)

### Features

- **Authentication Management** - OAuth2, API Key, Certificate-based auth
- **Rate Limiting** - Configurable per-minute and per-hour limits  
- **Retry Logic** - Exponential or linear backoff strategies
- **Error Handling** - Comprehensive error handling with fallback mechanisms
- **Activity Logging** - Full audit trail of all portal interactions
- **Document Upload** - Support for additional document submissions
- **Status Synchronization** - Real-time status updates from government portals

## Configuration

### Environment Variables

Add these environment variables for each government portal:

```bash
# Saint Kitts and Nevis Portal
SAINT_KITTS_PORTAL_URL=https://api.skncbi.gov.kn
SAINT_KITTS_CLIENT_ID=your_client_id
SAINT_KITTS_CLIENT_SECRET=your_client_secret
SAINT_KITTS_TOKEN_URL=https://api.skncbi.gov.kn/oauth/token

# Add more portals as needed
# PORTUGAL_PORTAL_URL=https://api.sef.pt
# PORTUGAL_API_KEY=your_api_key
```

### Portal Registration

Portals are automatically registered on startup if credentials are provided:

```typescript
// In government-portal-integration.ts
const saintKittsConfig: GovernmentPortalConfig = {
  countryCode: 'KN',
  portalName: 'Saint Kitts and Nevis CBI Portal',
  baseUrl: process.env.SAINT_KITTS_PORTAL_URL,
  authType: 'oauth2',
  credentials: {
    clientId: process.env.SAINT_KITTS_CLIENT_ID,
    clientSecret: process.env.SAINT_KITTS_CLIENT_SECRET,
  },
  // ... other config
}
```

## API Endpoints

### Portal Management (Admin Only)

#### GET /api/admin/government-portals
List all registered portals with optional connection testing.

**Query Parameters:**
- `test=true` - Test connections to all portals

**Response:**
```json
{
  "success": true,
  "portals": [
    {
      "countryCode": "KN",
      "portalName": "Saint Kitts and Nevis CBI Portal",
      "status": "active",
      "connectionTest": {
        "success": true,
        "responseTime": 1200,
        "testedAt": "2024-01-15T10:30:00Z"
      }
    }
  ],
  "totalPortals": 1
}
```

#### POST /api/admin/government-portals
Test specific portal connection.

**Request Body:**
```json
{
  "countryCode": "KN",
  "testType": "connection" // or "authentication", "status_check"
}
```

### Document Upload

#### POST /api/applications/{id}/government-documents
Upload additional documents to government portal.

**Form Data:**
- `file` - Document file
- `documentType` - Type of document
- `description` - Optional description
- `governmentReferenceNumber` - Government reference number

## Adding New Portal Integrations

### 1. Create Portal Adapter

Extend `BaseGovernmentPortalAdapter`:

```typescript
export class NewCountryPortalAdapter extends BaseGovernmentPortalAdapter {
  async authenticate(): Promise<AuthResult> {
    // Implement authentication logic
  }

  async submitApplication(package: GovernmentSubmissionPackage, token: string): Promise<SubmissionResponse> {
    // Implement submission logic
  }

  async checkApplicationStatus(refNumber: string, token: string): Promise<StatusCheckResponse> {
    // Implement status checking logic
  }

  async uploadDocument(refNumber: string, docData: DocumentData, token: string): Promise<DocumentUploadResponse> {
    // Implement document upload logic
  }
}
```

### 2. Configure Portal

Add configuration and register in `government-portal-integration.ts`:

```typescript
const newCountryConfig: GovernmentPortalConfig = {
  countryCode: 'XX',
  portalName: 'New Country Portal',
  baseUrl: process.env.NEW_COUNTRY_PORTAL_URL,
  authType: 'api_key', // or 'oauth2', 'certificate', 'basic_auth'
  credentials: {
    apiKey: process.env.NEW_COUNTRY_API_KEY
  },
  rateLimit: {
    requestsPerMinute: 20,
    requestsPerHour: 200
  },
  timeout: 30000,
  retryConfig: {
    maxRetries: 3,
    backoffStrategy: 'exponential',
    initialDelay: 1000
  }
}

// Register the portal
governmentPortalRegistry.registerPortal(
  'XX',
  newCountryConfig,
  new NewCountryPortalAdapter(newCountryConfig)
)
```

### 3. Add Environment Variables

Add required environment variables to `.env.local`:

```bash
NEW_COUNTRY_PORTAL_URL=https://api.newcountry.gov
NEW_COUNTRY_API_KEY=your_api_key
```

## Error Handling and Fallbacks

The system provides multiple layers of error handling:

1. **Portal-Level Errors** - Authentication failures, API errors
2. **Network-Level Errors** - Timeouts, connection issues  
3. **Rate Limiting** - Automatic backoff when limits exceeded
4. **Fallback Mechanisms** - Mock submissions when portals unavailable

### Graceful Degradation

If a government portal is unavailable:
- System falls back to mock submission process
- All data is still stored locally
- Manual submission can be done later
- Activity logs track which submissions used portals vs mocks

## Monitoring and Logging

### Activity Logs

All portal interactions are logged with:
- Portal used (or mock)
- Success/failure status  
- Response times
- Error details
- User and application context

### Portal Health Monitoring

Admin dashboard shows:
- Portal connection status
- Response times
- Error rates
- Last successful connection

## Security Considerations

### Credential Management

- All portal credentials stored as environment variables
- No hardcoded API keys or secrets
- Support for certificate-based authentication

### Data Protection

- All API calls use HTTPS
- Sensitive data encrypted in transit
- Access tokens cached securely with expiration

### Audit Trail

- Complete audit trail of all submissions
- Document upload tracking
- Status change logging
- User action attribution

## Testing

### Connection Testing

Use the admin API to test portal connections:

```bash
# Test all portals
curl -X GET "https://yourdomain.com/api/admin/government-portals?test=true"

# Test specific portal
curl -X POST "https://yourdomain.com/api/admin/government-portals" \
  -H "Content-Type: application/json" \
  -d '{"countryCode": "KN", "testType": "connection"}'
```

### Integration Testing

The framework includes built-in testing capabilities:
- Authentication testing
- Status checking with mock data
- Document upload simulation

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Check environment variables
   - Verify credentials with portal provider
   - Check token expiration

2. **Rate Limiting**
   - Review rate limit configuration
   - Implement appropriate delays
   - Monitor usage patterns

3. **Network Timeouts**
   - Increase timeout settings
   - Check portal availability
   - Verify network connectivity

### Debug Logging

Enable debug logging by setting:
```bash
DEBUG=government-portal:*
```

This will show detailed logs of all portal interactions.