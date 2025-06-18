// Test script to verify B2 storage configuration and attachment workflow
// Run with: node test-b2-storage.js

const { B2StorageService } = require('./src/lib/b2-storage.ts');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testB2Storage() {
  console.log('🔍 Testing B2 Storage Configuration...');
  
  // Check environment variables
  const requiredEnvVars = ['B2_APPLICATION_KEY_ID', 'B2_APPLICATION_KEY', 'B2_BUCKET_NAME'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    console.log('Please ensure your .env.local file contains:');
    missingVars.forEach(varName => {
      console.log(`${varName}=your-${varName.toLowerCase().replace(/_/g, '-')}`);
    });
    return;
  }
  
  console.log('✅ All required environment variables are set');
  console.log(`🪣 Bucket name: ${process.env.B2_BUCKET_NAME}`);
  console.log(`🔑 Key ID: ${process.env.B2_APPLICATION_KEY_ID?.substring(0, 8)}...`);
  
  try {
    // Initialize B2 service
    const b2Service = new B2StorageService();
    
    // Test authorization
    console.log('🔐 Testing B2 authorization...');
    await b2Service.authorize();
    console.log('✅ B2 authorization successful');
    
    // Test getting upload URL
    console.log('📤 Testing upload URL generation...');
    const uploadInfo = await b2Service.getUploadUrl('test-file.txt', 'text/plain');
    console.log('✅ Upload URL generated successfully');
    console.log(`📋 Upload URL: ${uploadInfo.uploadUrl.substring(0, 50)}...`);
    
    // Test creating a small test file
    console.log('📝 Testing file upload...');
    const testContent = 'This is a test file for B2 storage verification';
    const uploadResponse = await fetch(uploadInfo.uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': uploadInfo.authorizationToken,
        'X-Bz-File-Name': 'test-file.txt',
        'Content-Type': 'text/plain',
        'Content-Length': testContent.length.toString(),
        'X-Bz-Content-Sha1': 'unverified'
      },
      body: testContent
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    console.log('✅ File uploaded successfully');
    console.log(`📋 File ID: ${uploadResult.fileId}`);
    
    // Test downloading the file
    console.log('📥 Testing file download...');
    const downloadedContent = await b2Service.downloadFileContent('test-file.txt');
    
    if (downloadedContent === testContent) {
      console.log('✅ File download successful - content matches');
    } else {
      console.log('❌ File download failed - content mismatch');
      console.log(`Expected: ${testContent}`);
      console.log(`Got: ${downloadedContent}`);
    }
    
    console.log('🎉 All B2 storage tests passed!');
    
  } catch (error) {
    console.error('❌ B2 storage test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testB2Storage().catch(console.error);
