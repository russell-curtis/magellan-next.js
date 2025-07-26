# Cloudflare R2 Configuration Guide

This guide will help you set up Cloudflare R2 for secure document storage in the Magellan application.

## Required Environment Variables

Add these variables to your `.env.local` file:

```bash
# Cloudflare R2 Configuration
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_DOCUMENTS_BUCKET=magellan-documents
R2_THUMBNAILS_BUCKET=magellan-thumbnails
```

## Setup Steps

### 1. Create Cloudflare Account and Enable R2

1. Sign up for a Cloudflare account at https://cloudflare.com
2. Navigate to R2 Object Storage in your dashboard
3. Enable R2 (may require payment method for usage-based billing)

### 2. Create R2 Buckets

Create two buckets for your application:

```bash
# Primary documents bucket
magellan-documents

# Thumbnails bucket (for future use)
magellan-thumbnails
```

### 3. Generate R2 API Tokens

1. Go to "Manage R2 API Tokens" in your R2 dashboard
2. Create a new API token with:
   - **Token name**: `magellan-app-token`
   - **Permissions**: `Object Read and Write`
   - **Bucket restrictions**: Include both buckets created above
3. Copy the generated Access Key ID and Secret Access Key

### 4. Get Your Account ID

1. In your Cloudflare dashboard, look for "Account ID" in the right sidebar
2. Copy this value for the `CLOUDFLARE_ACCOUNT_ID` environment variable

### 5. Configure CORS (Optional)

If you plan to upload files directly from the browser, configure CORS on your buckets:

```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## Security Features

### File Access Control

- All files are stored with server-side encryption (AES256)
- Access is controlled through signed URLs with configurable expiration
- Files are organized by application ID for isolation

### File Validation

- File type validation based on extension and MIME type
- File size limits enforced per document requirement
- Secure file naming to prevent conflicts and attacks

### Storage Organization

```
Documents Bucket Structure:
├── documents/
│   ├── {applicationId}/
│   │   ├── {timestamp}-{randomId}-{filename}
│   │   └── ...
│   └── ...
└── thumbnails/
    ├── {applicationId}/
    │   ├── {timestamp}-{randomId}-{filename}.webp
    │   └── ...
    └── ...
```

## Usage Examples

### Generate Signed URL for Download

```typescript
import { generateSignedUrl } from '@/lib/r2-storage'

// For viewing in browser
const viewUrl = await generateSignedUrl(fileKey, {
  expiresIn: 3600, // 1 hour
  contentDisposition: 'inline'
})

// For downloading
const downloadUrl = await generateSignedUrl(fileKey, {
  expiresIn: 3600,
  fileName: 'document.pdf',
  contentDisposition: 'attachment'
})
```

### Upload File

```typescript
import { uploadToR2, generateFileKey } from '@/lib/r2-storage'

const fileKey = generateFileKey(applicationId, file.name)
const result = await uploadToR2(file, fileKey, {
  contentType: file.type,
  metadata: {
    'application-id': applicationId,
    'uploaded-by': userId
  }
})
```

## Cost Considerations

R2 pricing (as of 2024):
- **Storage**: $0.015 per GB per month
- **Class A operations** (write, list): $4.50 per million requests
- **Class B operations** (read): $0.36 per million requests
- **Data transfer**: Free for first 10GB/month, then $0.09 per GB

For a typical CRBI application with ~100 documents per client:
- Storage: ~$0.15/month per 10GB
- Operations: ~$0.01/month per 1000 document operations
- Very cost-effective for document management

## Monitoring and Maintenance

### File Cleanup

The system includes utilities for cleaning up old or orphaned files:

```typescript
import { cleanupOldFiles, batchDeleteFromR2 } from '@/lib/r2-storage'

// Clean up files older than 30 days (customize as needed)
await cleanupOldFiles(30)

// Batch delete specific files
await batchDeleteFromR2(['file-key-1', 'file-key-2'])
```

### Error Handling

All R2 operations include proper error handling:
- Network timeouts and retries
- Invalid file formats rejected
- Graceful degradation if R2 is unavailable
- Comprehensive logging for debugging

## Troubleshooting

### Common Issues

1. **Access Denied**: Check API token permissions and bucket access
2. **CORS Errors**: Verify CORS configuration if uploading from browser
3. **File Not Found**: Ensure file keys are correctly generated and stored
4. **Size Limits**: Verify file sizes are within R2 limits (5TB max per object)

### Debug Mode

Set `NODE_ENV=development` to enable additional logging:

```typescript
// Additional R2 operation logging in development
console.log('R2 Operation:', { bucket, key, operation })
```