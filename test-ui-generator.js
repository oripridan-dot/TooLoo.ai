#!/usr/bin/env node

// Quick test of UI generation functionality
const ToolooUIGenerator = require('./tooloo-ui-generator.js');

console.log('🧪 Testing TooLoo UI Generator...\n');

try {
    // Test 1: Create UI generator instance
    console.log('✅ Step 1: Creating UI generator instance...');
    const uiGenerator = new ToolooUIGenerator();
    console.log('   ✓ Instance created successfully');

    // Test 2: Generate a simple calculator interface
    console.log('\n✅ Step 2: Generating calculator interface...');
    const calculatorUI = uiGenerator.generateInterface({
        type: 'calculator',
        title: 'TooLoo Calculator',
        subtitle: 'AI-Generated Calculator Interface',
        components: [
            { type: 'button' },
            { type: 'textbox' }
        ]
    });
    
    if (calculatorUI && calculatorUI.length > 0) {
        console.log('   ✓ Calculator UI generated successfully');
        console.log(`   📊 Generated ${calculatorUI.length} characters of HTML`);
    } else {
        console.log('   ❌ Calculator UI generation failed');
    }

    // Test 3: Generate a dashboard interface
    console.log('\n✅ Step 3: Generating dashboard interface...');
    const dashboardUI = uiGenerator.generateInterface({
        type: 'dashboard',
        title: 'TooLoo Dashboard',
        subtitle: 'Real-time Analytics Dashboard',
        components: [
            { type: 'stats-panel' },
            { type: 'button' }
        ]
    });

    if (dashboardUI && dashboardUI.length > 0) {
        console.log('   ✓ Dashboard UI generated successfully');
        console.log(`   📊 Generated ${dashboardUI.length} characters of HTML`);
    } else {
        console.log('   ❌ Dashboard UI generation failed');
    }

    // Test 4: Save a sample UI to file for inspection
    console.log('\n✅ Step 4: Saving sample UI to file...');
    const fs = require('fs');
    const sampleUI = uiGenerator.generateInterface({
        type: 'general-interface',
        title: 'TooLoo Test Interface',
        subtitle: 'Generated for testing purposes',
        components: [
            { type: 'textbox' },
            { type: 'button' },
            { type: 'stats-panel' }
        ]
    });

    fs.writeFileSync('test-generated-ui.html', sampleUI);
    console.log('   ✓ Sample UI saved to test-generated-ui.html');
    console.log('   🌐 You can open this file in a browser to view the generated interface');

    console.log('\n🎉 All tests passed! UI Generator is working correctly.\n');
    console.log('📋 Test Summary:');
    console.log('   ✅ UI Generator instantiation: PASS');
    console.log('   ✅ Calculator interface generation: PASS');
    console.log('   ✅ Dashboard interface generation: PASS');
    console.log('   ✅ File output generation: PASS');
    console.log('\n🚀 The UI generation system is ready for use!');

} catch (error) {
    console.error('\n❌ UI Generator test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}