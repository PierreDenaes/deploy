#!/usr/bin/env node

/**
 * Script to check for missing required environment variables
 * Run this to verify Render deployment configuration
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'OPENAI_API_KEY',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CLOUDINARY_CLOUD_NAME'
];

const optionalEnvVars = [
  'NODE_ENV',
  'PORT',
  'CORS_ORIGIN',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
  'MAX_FILE_SIZE',
  'UPLOAD_PATH',
  'OPENAI_MODEL',
  'OPENAI_VISION_MODEL',
  'OPENAI_MAX_TOKENS',
  'OPENAI_TEMPERATURE',
  'AI_CONFIDENCE_THRESHOLD',
  'AI_MAX_RETRIES',
  'AI_TIMEOUT_MS',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN'
];

console.log('🔍 Checking environment variables...\n');

const missing = [];
const present = [];

// Check required variables
requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    present.push(varName);
    console.log(`✅ ${varName}: Set`);
  } else {
    missing.push(varName);
    console.log(`❌ ${varName}: MISSING (required)`);
  }
});

console.log('\n📝 Optional variables:');
optionalEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: ${process.env[varName]}`);
  } else {
    console.log(`⚪ ${varName}: Not set (optional)`);
  }
});

console.log('\n📊 Summary:');
console.log(`✅ Required variables present: ${present.length}/${requiredEnvVars.length}`);
console.log(`❌ Missing required variables: ${missing.length}`);

if (missing.length > 0) {
  console.log('\n🚨 Missing required environment variables:');
  missing.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('\n💡 Add these variables in your Render dashboard under Environment tab');
  
  console.log('\n🔧 Suggested values for missing variables:');
  missing.forEach(varName => {
    switch(varName) {
      case 'JWT_SECRET':
        console.log(`   ${varName}: Generate a random 64-character string`);
        break;
      case 'JWT_REFRESH_SECRET':
        console.log(`   ${varName}: Generate a different random 64-character string`);
        break;
      case 'OPENAI_API_KEY':
        console.log(`   ${varName}: Your OpenAI API key from https://platform.openai.com/api-keys`);
        break;
      case 'CLOUDINARY_API_KEY':
      case 'CLOUDINARY_API_SECRET':
      case 'CLOUDINARY_CLOUD_NAME':
        console.log(`   ${varName}: Get from your Cloudinary dashboard`);
        break;
      case 'DATABASE_URL':
        console.log(`   ${varName}: Should be automatically set by Render when database is connected`);
        break;
      default:
        console.log(`   ${varName}: Check documentation for required value`);
    }
  });
  
  process.exit(1);
} else {
  console.log('\n🎉 All required environment variables are set!');
  process.exit(0);
}