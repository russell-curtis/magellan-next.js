// Test script to verify original document notification system
const { originalDocumentService } = require('./lib/services/original-documents.ts')

async function testNotification() {
  console.log('🧪 Testing original document notification...')
  
  // Simulate requesting an original document
  const testInput = {
    applicationId: 'test-app-id',
    documentRequirementId: 'test-doc-req-id',
    digitalDocumentId: null,
    shippingAddress: '123 Test Street, Test City, TC 12345',
    clientInstructions: 'Please handle with care',
    isUrgent: true,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    internalNotes: 'Test notification'
  }
  
  const result = await originalDocumentService.requestOriginalDocument(
    testInput,
    'test-user-id',
    'test-firm-id'
  )
  
  console.log('📋 Test result:', result)
}

testNotification().catch(console.error)