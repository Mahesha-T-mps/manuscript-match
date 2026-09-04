/**
 * Verify the latest process to check if CANDIDATE entries are preserved
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyLatestProcess() {
  try {
    console.log('🔍 Checking latest processes...\n');

    // Get the most recent processes
    const processes = await prisma.process.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      include: {
        processAuthors: {
          include: {
            author: true,
          },
        },
      },
    });

    console.log(`📊 Found ${processes.length} recent processes\n`);

    for (const process of processes) {
      const candidateCount = process.processAuthors.filter(pa => pa.role === 'CANDIDATE').length;
      const shortlistedCount = process.processAuthors.filter(pa => pa.role === 'SHORTLISTED').length;
      
      console.log(`📝 ${process.title}`);
      console.log(`   Created: ${process.createdAt.toLocaleString()}`);
      console.log(`   Step: ${process.currentStep}`);
      console.log(`   CANDIDATE: ${candidateCount}`);
      console.log(`   SHORTLISTED: ${shortlistedCount}`);
      
      if (process.processAuthors.length > 0) {
        console.log(`   All roles:`, process.processAuthors.map(pa => pa.role).join(', '));
      }
      console.log('');
    }

    // Check if there are any duplicates (same author with both CANDIDATE and SHORTLISTED)
    const latestProcess = processes[0];
    if (latestProcess) {
      console.log('\n🔍 Checking for duplicate authors in latest process:');
      const authorCounts = new Map();
      
      latestProcess.processAuthors.forEach(pa => {
        const count = authorCounts.get(pa.authorId) || 0;
        authorCounts.set(pa.authorId, count + 1);
      });
      
      authorCounts.forEach((count, authorId) => {
        if (count > 1) {
          const author = latestProcess.processAuthors.find(pa => pa.authorId === authorId);
          const roles = latestProcess.processAuthors
            .filter(pa => pa.authorId === authorId)
            .map(pa => pa.role);
          console.log(`   ✓ ${author.author.name}: ${roles.join(' + ')}`);
        }
      });
      
      if (Array.from(authorCounts.values()).every(c => c === 1)) {
        console.log('   ⚠️  No duplicate authors found (old behavior - CANDIDATE was updated to SHORTLISTED)');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyLatestProcess();
