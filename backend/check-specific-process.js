/**
 * Check the "reviewer test2" process details
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProcess() {
  try {
    console.log('🔍 Checking "reviewer test2" process...\n');

    // Find the process
    const process = await prisma.process.findFirst({
      where: {
        title: {
          contains: 'reviewer test2'
        }
      },
      include: {
        processAuthors: {
          include: {
            author: true,
          },
        },
      },
    });

    if (!process) {
      console.log('❌ Process not found');
      return;
    }

    console.log(`📝 Process: ${process.title}`);
    console.log(`   ID: ${process.id}`);
    console.log(`   Current Step: ${process.currentStep}`);
    console.log(`   Status: ${process.status}`);
    console.log(`   Total ProcessAuthors: ${process.processAuthors.length}\n`);

    if (process.processAuthors.length > 0) {
      console.log('📋 All Process Authors:');
      process.processAuthors.forEach((pa, index) => {
        console.log(`   ${index + 1}. ${pa.author.name}`);
        console.log(`      Role: ${pa.role}`);
        console.log(`      Author ID: ${pa.authorId}`);
        console.log(`      Created: ${pa.createdAt}`);
        console.log('');
      });

      const roleCount = {};
      process.processAuthors.forEach(pa => {
        roleCount[pa.role] = (roleCount[pa.role] || 0) + 1;
      });

      console.log('📊 Role Summary:');
      Object.keys(roleCount).forEach(role => {
        console.log(`   ${role}: ${roleCount[role]}`);
      });
    }

    // Check for duplicate author IDs
    const authorIds = process.processAuthors.map(pa => pa.authorId);
    const uniqueAuthorIds = [...new Set(authorIds)];
    
    console.log(`\n📈 Unique Authors: ${uniqueAuthorIds.length}`);
    console.log(`📈 Total Entries: ${authorIds.length}`);
    
    if (uniqueAuthorIds.length !== authorIds.length) {
      console.log('⚠️  Some authors have multiple entries (CANDIDATE + SHORTLISTED)');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProcess();
