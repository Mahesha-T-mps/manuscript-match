const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkReportsUsers() {
  try {
    const reports = await prisma.userReport.findMany({
      include: {
        user: {
          select: { email: true }
        }
      }
    });

    console.log('\n='.repeat(60));
    console.log('USER REPORTS WITH EMAILS');
    console.log('='.repeat(60));

    reports.forEach((r, i) => {
      console.log(`\n${i + 1}. User: ${r.user?.email || 'UNKNOWN'}`);
      console.log(`   User ID: ${r.userId}`);
      console.log(`   Process: ${r.processTitle}`);
      console.log(`   Recommendations: ${r.recommendationsCount}`);
      console.log(`   Shortlisted: ${r.shortlistedCount}`);
    });

    console.log('\n' + '='.repeat(60));
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkReportsUsers();
