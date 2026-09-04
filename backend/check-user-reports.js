/**
 * Check user_reports table to see what reports exist
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserReports() {
  try {
    console.log('Checking user_reports table...\n');

    const reports = await prisma.userReport.findMany({
      orderBy: { createdAt: 'desc' },
    });

    console.log(`Found ${reports.length} reports in database\n`);
    console.log('='.repeat(80));

    if (reports.length === 0) {
      console.log('\n❌ No reports found in database');
      console.log('\nThis means reports were not generated yet.');
      console.log('Run: node generate-reports-for-existing-processes.js');
    } else {
      reports.forEach((report, index) => {
        console.log(`\nReport ${index + 1}:`);
        console.log(`  ID: ${report.id}`);
        console.log(`  User ID: ${report.userId}`);
        console.log(`  Process ID: ${report.processId}`);
        console.log(`  Process Title: ${report.processTitle}`);
        console.log(`  Recommendations Count: ${report.recommendationsCount}`);
        console.log(`  Shortlisted Count: ${report.shortlistedCount}`);
        console.log(`  Conversion Rate: ${((report.shortlistedCount / report.recommendationsCount) * 100).toFixed(1)}%`);
        console.log(`  Report Date: ${report.reportDate.toISOString()}`);
        console.log(`  Created At: ${report.createdAt.toISOString()}`);
        console.log('-'.repeat(80));
      });

      console.log('\n✅ Reports exist in database!');
      console.log('\nTo see them in the UI:');
      console.log('  1. Make sure backend server is running (npm run dev)');
      console.log('  2. Refresh browser');
      console.log('  3. Go to Reports → Custom Reports tab');
      console.log('  4. You should see the data above displayed in charts and tables');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserReports();
