/**
 * Debug why some processes have 0 reviewers
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugZeroReviewers() {
  try {
    console.log('🔍 Debugging processes with 0 reviewers...\n');

    const processes = await prisma.process.findMany({
      include: {
        processAuthors: {
          include: {
            author: true,
          },
        },
      },
    });

    for (const process of processes) {
      const candidateCount = process.processAuthors.filter(pa => pa.role === 'CANDIDATE').length;
      const shortlistedCount = process.processAuthors.filter(pa => pa.role === 'SHORTLISTED').length;
      const allAuthorsCount = process.processAuthors.length;
      
      console.log(`\n📝 Process: ${process.title} (ID: ${process.id.substring(0, 8)}...)`);
      console.log(`   Current Step: ${process.currentStep}`);
      console.log(`   Status: ${process.status}`);
      console.log(`   Total ProcessAuthors: ${allAuthorsCount}`);
      console.log(`   - CANDIDATE: ${candidateCount}`);
      console.log(`   - SHORTLISTED: ${shortlistedCount}`);
      
      if (allAuthorsCount > 0) {
        console.log(`   Author Roles Breakdown:`);
        const roleCount = {};
        process.processAuthors.forEach(pa => {
          roleCount[pa.role] = (roleCount[pa.role] || 0) + 1;
        });
        Object.keys(roleCount).forEach(role => {
          console.log(`     - ${role}: ${roleCount[role]}`);
        });
        
        // Show first few authors
        console.log(`   First few authors:`);
        process.processAuthors.slice(0, 3).forEach(pa => {
          console.log(`     - ${pa.author.name} (${pa.role})`);
        });
      }
      
      if (candidateCount === 0 && allAuthorsCount > 0) {
        console.log(`   ⚠️  WARNING: Has authors but none are CANDIDATE role!`);
      }
      
      if (candidateCount === 0 && allAuthorsCount === 0) {
        console.log(`   ℹ️  No authors added yet (early workflow stage)`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugZeroReviewers();
