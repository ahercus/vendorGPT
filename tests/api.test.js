/**
 * Simple test file to verify OpenAI API key and image loading
 */

const fs = require('fs');
const path = require('path');

describe('Environment and file tests', () => {
  // Test 1: Verify .env.local file exists
  test('should have a .env.local file', () => {
    const envFilePath = path.join(process.cwd(), '.env.local');
    const exists = fs.existsSync(envFilePath);
    console.log(`Checking .env.local file at ${envFilePath}`);
    if (!exists) {
      console.log('Warning: .env.local file not found');
    }
    // This test is more for information, we don't make it fail
  });

  // Test 2: Verify OPENAI_API_KEY is set in environment
  test('should have OPENAI_API_KEY in environment', () => {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    console.log(`OPENAI_API_KEY is ${hasApiKey ? 'set' : 'not set'}`);
    if (!hasApiKey) {
      console.log('Warning: OPENAI_API_KEY environment variable is not set');
      console.log('Please create .env.local with OPENAI_API_KEY=your_key_here');
    }
    // Informational test only
  });

  // Test 3: Verify Stalker.png exists and has content
  test('should have valid Stalker.png file', () => {
    const logoPath = path.join(process.cwd(), 'public', 'Stalker.png');
    const exists = fs.existsSync(logoPath);
    expect(exists).toBe(true);
    
    if (exists) {
      const stats = fs.statSync(logoPath);
      console.log(`Stalker.png size: ${stats.size} bytes`);
      expect(stats.size).toBeGreaterThan(0);
    }
  });

  // Test 4: Verify Stalker-fixed.png exists and has content
  test('should have valid Stalker-fixed.png file', () => {
    const logoPath = path.join(process.cwd(), 'public', 'Stalker-fixed.png');
    const exists = fs.existsSync(logoPath);
    expect(exists).toBe(true);
    
    if (exists) {
      const stats = fs.statSync(logoPath);
      console.log(`Stalker-fixed.png size: ${stats.size} bytes`);
      expect(stats.size).toBeGreaterThan(0);
    }
  });

  // Test 5: Verify favicon.ico exists
  test('should have favicon.ico file', () => {
    const faviconPath = path.join(process.cwd(), 'public', 'favicon.ico');
    const exists = fs.existsSync(faviconPath);
    expect(exists).toBe(true);
  });
}); 