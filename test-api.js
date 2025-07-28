// Test API call to trigger original document notification
const fetch = require('node-fetch');

async function testOriginalDocumentRequest() {
  try {
    console.log('🧪 Testing original document request API...');
    
    // You'll need to replace these with actual values from your database
    const applicationId = 'your-application-id-here';
    const documentRequirementId = 'your-document-requirement-id-here';
    
    const requestBody = {
      action: 'request_single',
      documentRequirementId: documentRequirementId,
      shippingAddress: '123 Test Street, Test City, TC 12345',
      clientInstructions: 'Testing notification system',
      isUrgent: true,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      internalNotes: 'API test for notifications'
    };
    
    console.log('📤 Making request to:', `http://localhost:3001/api/applications/${applicationId}/original-documents`);
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`http://localhost:3001/api/applications/${applicationId}/original-documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to add authentication headers here
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    console.log('📥 Response status:', response.status);
    console.log('📥 Response body:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

// Note: This test requires authentication and real database IDs
console.log('⚠️  This test script needs to be configured with real database IDs and authentication');
console.log('⚠️  Check the server logs at http://localhost:3001 when making a real request from the UI');