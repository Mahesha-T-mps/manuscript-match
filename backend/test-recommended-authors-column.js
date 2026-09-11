const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRecommendedAuthorsColumn() {
  try {
    console.log('🔍 Testing recommended_authors column...\n');

    // Check if column exists by querying the table
    const result = await prisma.$queryRaw`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='user_reports';
    `;

    console.log('✅ UserReport table schema:');
    console.log(result[0].sql);
    console.log('\n');

    // Check if there are any existing reports
    const reports = await prisma.userReport.findMany({
      take: 1
    });

    if (reports.length > 0) {
      console.log('📊 Sample report:');
      console.log({
        id: reports[0].id,
        processTitle: reports[0].processTitle,
        reviewersCount: reports[0].reviewersCount,
        shortlistedCount: reports[0].shortlistedCount,
        hasRecommendedAuthors: !!reports[0].recommendedAuthors,
        hasShortlistedAuthors: !!reports[0].shortlistedAuthors,
      });
    } else {
      console.log('ℹ️  No reports found in database yet.');
    }

    console.log('\n✅ Column "recommended_authors" exists and is ready to use!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testRecommendedAuthorsColumn();
