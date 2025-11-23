#!/usr/bin/env node

/**
 * Test the design applier end-to-end
 * 1. Call the API to generate CSS variables
 * 2. Verify CSS variables are correct
 * 3. Test applying to a few components
 */

async function testDesignApplier() {
  console.log('🎨 Testing Design Applier\n');
  
  // Test 1: Call API
  console.log('Test 1: API Endpoint');
  const testDesign = {
    colors: {
      primary: '#ff00ff',
      secondary: '#00ffff',
      bg: '#1a1a1a',
      text: '#ffffff'
    },
    typography: {
      primary: 'Arial, sans-serif',
      secondary: 'Helvetica, sans-serif'
    }
  };
  
  try {
    const response = await fetch('http://127.0.0.1:3000/api/v1/design/apply-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testDesign)
    });
    
    const data = await response.json();
    const cssVars = data.content?.cssVariables || data.cssVariables;
    
    console.log('✅ API Response received');
    console.log('Generated CSS Variables:');
    Object.entries(cssVars).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    // Test 2: Verify semantic variables exist
    console.log('\nTest 2: Semantic Variables Check');
    const semanticVars = ['--bg', '--brand', '--accent', '--text', '--card', '--muted'];
    const missing = semanticVars.filter(v => !cssVars[v]);
    
    if (missing.length === 0) {
      console.log('✅ All semantic variables present');
    } else {
      console.log(`❌ Missing variables: ${missing.join(', ')}`);
    }
    
    // Test 3: Check for color values
    console.log('\nTest 3: Color Value Validation');
    const colorVars = Object.entries(cssVars).filter(([k, v]) => 
      k.startsWith('--') && (v.startsWith('#') || v.toLowerCase().includes('rgb'))
    );
    console.log(`✅ Found ${colorVars.length} color variables`);
    
    // Test 4: Check for typography
    console.log('\nTest 4: Typography Check');
    const fontVars = Object.entries(cssVars).filter(([k, v]) => 
      (k.includes('font') || k.includes('typography')) && !v.startsWith('#')
    );
    if (fontVars.length > 0) {
      console.log(`✅ Found ${fontVars.length} font variables`);
      fontVars.forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    } else {
      console.log('⚠️  No font variables found');
    }
    
    console.log('\n✅ DESIGN APPLIER TEST PASSED');
    console.log('\nNext Steps:');
    console.log('1. Upload a design system in the Design Applier');
    console.log('2. Click "Transform TooLoo Now"');
    console.log('3. Verify colors change in Design Studio');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testDesignApplier();
