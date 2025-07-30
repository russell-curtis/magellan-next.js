# Government Status Synchronization System

This document describes the real-time status synchronization system that automatically polls government portals for application status updates.

## Overview

The status synchronization system provides automated, real-time updates of CRBI application statuses from government portals. It ensures that the platform stays synchronized with government systems without manual intervention.

## Architecture

### Core Components

1. **GovernmentStatusSyncService** - Main service managing sync operations
2. **SyncJob** - Individual sync job for each application
3. **SyncBatch** - Batch processing of multiple sync jobs
4. **Portal Integration** - Uses the government portal framework for API calls

### Key Features

- **Automated Scheduling** - Runs sync batches every 5 minutes
- **Intelligent Intervals** - Different sync frequencies based on application status
- **Error Handling** - Exponential backoff for failed syncs
- **Rate Limiting** - Respects government portal rate limits
- **Activity Logging** - Complete audit trail of all status changes
- **Notification System** - Alerts when statuses change (framework ready)

## Sync Intervals

The system uses different sync intervals based on application status:

| Status | Interval | Reason |
|--------|----------|--------|
| `submitted_to_government` | 30 minutes | Frequent checks for new submissions |
| `under_review` | 2 hours | Less frequent for ongoing reviews |
| `requires_action` | 1 hour | Moderate frequency for action needed |
| `approved` | 24 hours | Rare checks for completed applications |
| `rejected` | 24 hours | Rare checks for completed applications |
| `error` | 4 hours | Retry failed syncs less frequently |

## Database Schema

The system uses existing tables with new fields:

### Applications Table Extensions
```sql
-- New fields added to applications table
government_reference_number VARCHAR(100), -- Reference from government portal
last_status_check TIMESTAMP              -- Last successful status check
```

## API Endpoints

### Admin Sync Management

#### GET /api/admin/government-sync
Get sync statistics and system status.

**Query Parameters:**
- `details=true` - Include detailed system information

**Response:**
```json
{
  "success": true,
  "syncEnabled": true,
  "statistics": {
    "totalJobs": 25,
    "activeJobs": 20,
    "inactiveJobs": 5,
    "failedJobs": 2,
    "averageInterval": 90,
    "nextSyncTimes": [
      {
        "applicationId": "app-123",
        "nextSync": "2024-01-15T10:45:00Z"
      }
    ]
  }
}
```

#### POST /api/admin/government-sync
Control sync operations (admin only).

**Request Body:**
```json
{
  "action": "force_batch_sync", // or "force_application_sync", "reinitialize_sync", "stop_sync"
  "applicationId": "app-123" // Required for "force_application_sync"
}
```

### Application-Level Sync

#### GET /api/applications/{id}/sync-status
Get sync status for specific application.

**Response:**
```json
{
  "success": true,
  "applicationId": "app-123",
  "currentStatus": "under_review",
  "governmentReferenceNumber": "GOV-REF-123",
  "syncInfo": {
    "isEligibleForSync": true,
    "isInSyncSystem": true,
    "lastSyncAt": "2024-01-15T09:30:00Z",
    "timeSinceLastSyncMs": 3600000,
    "timeSinceLastSyncHuman": "1 hour ago",
    "nextSyncAt": "2024-01-15T11:30:00Z"
  }
}
```

#### POST /api/applications/{id}/sync-status
Trigger manual status sync for application.

**Response:**
```json
{
  "success": true,
  "message": "Status sync completed",
  "syncResult": {
    "success": true,
    "statusChanged": true,
    "oldStatus": "submitted_to_government",
    "newStatus": "under_review",
    "syncedAt": "2024-01-15T10:00:00Z"
  }
}
```

## Status Mapping

The system maps government portal statuses to internal application statuses:

| Portal Status | Application Status | Description |
|---------------|-------------------|-------------|
| `submitted` | `submitted_to_government` | Just submitted |
| `under_review` | `under_review` | Being reviewed |
| `requires_action` | `requires_action` | Additional docs needed |
| `approved` | `approved` | Application approved |
| `rejected` | `rejected` | Application rejected |
| `cancelled` | `cancelled` | Application cancelled |

## Error Handling

### Failure Management
- **Max Failures**: 5 consecutive failures before job deactivation
- **Exponential Backoff**: Delays increase with each failure (max 8x)
- **Job Deactivation**: Failed jobs are automatically deactivated
- **Error Logging**: All failures logged with detailed error messages

### Graceful Degradation
- Portal unavailable → Skip sync, retry later
- Authentication failure → Log error, retry with backoff
- Rate limit exceeded → Automatic delay and retry
- Network timeout → Exponential backoff retry

## Batch Processing

### Batch Configuration
- **Batch Size**: 5 applications per chunk
- **Chunk Delay**: 2 seconds between chunks
- **Parallel Processing**: Within chunks only
- **Batch Frequency**: Every 5 minutes

### Batch Lifecycle
1. **Initialization** - Identify jobs needing sync
2. **Chunking** - Split jobs into manageable chunks
3. **Processing** - Process chunks with delays
4. **Result Collection** - Aggregate all results
5. **Cleanup** - Update job schedules and states

## Notifications (Framework Ready)

The system includes notification hooks for status changes:

```typescript
// Notification queued for:
- Firm admins and assigned advisors
- Status change details
- Government notes and next steps
- Estimated completion dates
```

## Performance Considerations

### Resource Usage
- **Memory**: ~1MB per 1000 sync jobs
- **CPU**: Minimal when idle, moderate during sync batches
- **Network**: Respects portal rate limits
- **Database**: Efficient queries with proper indexing

### Scaling Considerations
- Jobs stored in memory for fast access
- Database updates only when status changes
- Portal-specific rate limiting
- Configurable batch sizes and intervals

## Monitoring and Observability

### Logging
All operations are logged with context:
```
[SYNC] Starting sync batch batch-1642249200000
[SYNC] Processing 15 sync jobs
[SYNC] Status changed for application app-123: submitted_to_government -> under_review
[SYNC] Completed sync batch: 15 total, 14 successful, 1 failed, 3 status changes
```

### Activity Logs
Status changes are recorded in the activity logs table:
- Action: `government_status_sync_update`
- Old/new status values
- Government notes and next steps
- Portal information

### Statistics
Real-time statistics available via API:
- Total/active/inactive jobs
- Success/failure rates
- Average sync intervals
- Next sync schedules

## Configuration

### Environment Variables
```bash
# Sync system configuration
GOVERNMENT_SYNC_ENABLED=true
GOVERNMENT_SYNC_INTERVAL_MINUTES=5
GOVERNMENT_SYNC_BATCH_SIZE=5
GOVERNMENT_SYNC_MAX_FAILURES=5

# Auto-initialization
GOVERNMENT_SYNC_AUTO_INIT=true
GOVERNMENT_SYNC_AUTO_INIT_DELAY=10000 # ms
```

### Runtime Configuration
- Sync intervals per status type
- Maximum failure thresholds
- Batch processing limits
- Portal-specific rate limits

## Integration Points

### Automatic Registration
Applications are automatically added to sync when:
- Submitted to government portal successfully
- Government reference number is available
- Application status becomes syncable

### Portal Integration
Sync system integrates with portal framework:
- Uses portal adapters for status checks
- Respects portal authentication
- Handles portal-specific errors
- Maps portal statuses to internal statuses

### Database Integration
Sync system updates:
- Application status and timestamps
- Government reference numbers
- Last status check timestamps
- Activity logs for audit trail

## Troubleshooting

### Common Issues

1. **Applications Not Syncing**
   - Check if application has government reference number
   - Verify application status is syncable
   - Check if job was deactivated due to failures

2. **High Failure Rates**
   - Verify portal credentials and connectivity
   - Check rate limiting configuration
   - Review portal-specific error messages

3. **Sync System Not Running**
   - Check auto-initialization settings
   - Verify environment configuration
   - Check application startup logs

### Debug Commands

```bash
# Check sync statistics
curl -X GET "/api/admin/government-sync?details=true"

# Force batch sync
curl -X POST "/api/admin/government-sync" -d '{"action": "force_batch_sync"}'

# Check specific application sync
curl -X GET "/api/applications/app-123/sync-status"

# Force specific application sync  
curl -X POST "/api/applications/app-123/sync-status"
```

## Future Enhancements

### Planned Features
- **Webhook Support** - Receive push notifications from government portals
- **Advanced Scheduling** - Business hours only, holiday awareness
- **Notification System** - Email/SMS alerts for status changes
- **Analytics Dashboard** - Visual sync performance metrics
- **Multi-Region Support** - Sync jobs across different regions
- **Backup Sync Methods** - Email parsing, document scraping fallbacks

### Optimization Opportunities
- **Caching** - Cache portal authentication tokens
- **Predictive Sync** - ML-based sync timing optimization
- **Bulk Operations** - Batch status checks where portals support it
- **Event-Driven Sync** - React to specific application events