/**
 * Check and fix validation conditions in production database
 * Run with: node check-and-fix-validation-conditions.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const VALIDATION_CONDITIONS = [
  { id: 'Publications', label: 'Publications' },
  { id: 'First/Last Author in publications', label: 'First/Last Author Publications' },
  { id: 'Relevant Publications', label: 'Relevant Publications' },
  { id: 'Publication Types', label: 'Publication Types' },
  { id: 'T&F Publications last year', label: 'Taylor & Francis Publications' },
  { id: 'Conflict of Interest', label: 'Conflict of Interest' },
  { id: 'Retraction History', label: 'Retraction History' },
  { id: 'Study Type Detection', label: 'Study Type Detection' },
  { id: 'Sanction Country', label: 'Sanction Country Check' }
];

const USER_TYPES = ['SPRINGER', 'WILEY', 'F1000', 'DMP', 'AJE RQE', 'T&F'];

async function checkAndFix() {
  console.log('🔍 Checking validation conditions...\n');

  try {
    // Check current state
    const existingCount = await prisma.userTypeValidationCondition.count();
    console.log(`Found ${existingCount} existing validation conditions`);

    if (existingCount === 0) {
      console.log('\n⚠️  No validation conditions found! Initializing...\n');
    }

    let created = 0;
    let existing = 0;

    for (const userType of USER_TYPES) {
      console.log(`\nProcessing ${userType}...`);
      
      for (const condition of VALIDATION_CONDITIONS) {
        const result = await prisma.userTypeValidationCondition.upsert({
          where: {
            userType_conditionId: {
              userType,
              conditionId: condition.id
            }
          },
          update: {},
          create: {
            userType,
            conditionId: condition.id,
            conditionLabel: condition.label,
            isEnabled: true
          }
        });

        // Check if it was just created (createdAt === updatedAt)
        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          created++;
          console.log(`  ✅ Created: ${condition.label}`);
        } else {
          existing++;
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${created} conditions`);
    console.log(`   Already existed: ${existing} conditions`);
    console.log(`   Total: ${created + existing} conditions`);

    // Verify
    const finalCount = await prisma.userTypeValidationCondition.count();
    const expectedCount = USER_TYPES.length * VALIDATION_CONDITIONS.length;
    
    if (finalCount === expectedCount) {
      console.log(`\n✅ Success! All ${finalCount} validation conditions are in place.`);
    } else {
      console.log(`\n⚠️  Warning: Expected ${expectedCount} but found ${finalCount}`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFix();
