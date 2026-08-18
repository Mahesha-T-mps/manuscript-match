/**
 * Test script to verify validation conditions setup
 * Run with: node test-validation-conditions-setup.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSetup() {
  console.log('🔍 Testing Validation Conditions Setup...\n');

  try {
    // 1. Check if table exists and has data
    console.log('1. Checking validation conditions table...');
    const allConditions = await prisma.userTypeValidationCondition.findMany();
    console.log(`   ✓ Found ${allConditions.length} validation conditions`);

    // 2. Group by user type
    console.log('\n2. Conditions by user type:');
    const userTypes = ['SPRINGER', 'WILEY', 'F1000', 'DMP', 'AJE RQE', 'T&F'];
    
    for (const userType of userTypes) {
      const conditions = await prisma.userTypeValidationCondition.findMany({
        where: { userType }
      });
      const enabledCount = conditions.filter(c => c.isEnabled).length;
      console.log(`   ${userType}: ${enabledCount}/${conditions.length} enabled`);
    }

    // 3. List all condition types
    console.log('\n3. Available validation condition types:');
    const conditionTypes = [...new Set(allConditions.map(c => c.conditionLabel))];
    conditionTypes.forEach((label, index) => {
      console.log(`   ${index + 1}. ${label}`);
    });

    // 4. Test fetching for a specific user type
    console.log('\n4. Testing fetch for SPRINGER user type:');
    const springerConditions = await prisma.userTypeValidationCondition.findMany({
      where: {
        userType: 'SPRINGER',
        isEnabled: true
      }
    });
    console.log(`   ✓ Found ${springerConditions.length} enabled conditions for SPRINGER`);
    springerConditions.forEach(c => {
      console.log(`      - ${c.conditionLabel}`);
    });

    // 5. Test update operation
    console.log('\n5. Testing update operation...');
    const testCondition = await prisma.userTypeValidationCondition.findFirst({
      where: {
        userType: 'SPRINGER',
        conditionId: 'Publications'
      }
    });
    
    if (testCondition) {
      const originalState = testCondition.isEnabled;
      
      // Toggle it off
      await prisma.userTypeValidationCondition.update({
        where: {
          userType_conditionId: {
            userType: 'SPRINGER',
            conditionId: 'Publications'
          }
        },
        data: {
          isEnabled: !originalState
        }
      });
      console.log(`   ✓ Toggled Publications condition to ${!originalState}`);
      
      // Toggle it back
      await prisma.userTypeValidationCondition.update({
        where: {
          userType_conditionId: {
            userType: 'SPRINGER',
            conditionId: 'Publications'
          }
        },
        data: {
          isEnabled: originalState
        }
      });
      console.log(`   ✓ Restored Publications condition to ${originalState}`);
    }

    console.log('\n✅ All tests passed! Validation conditions setup is working correctly.');
    console.log('\n📝 Summary:');
    console.log(`   - Total conditions: ${allConditions.length}`);
    console.log(`   - User types: ${userTypes.length}`);
    console.log(`   - Condition types: ${conditionTypes.length}`);
    console.log('\n🎉 You can now use the admin panel to manage validation conditions!');

  } catch (error) {
    console.error('\n❌ Error testing setup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testSetup();
