/**
 * Check a report to see author details
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkReport() {
  try {
    console.log('🔍 Checking reports with author details...\n');

    const reports = await prisma.userReport.findMany({
      where: {
        shortlistedCount: {
          gt: 0
        }
      },
      take: 3
    });

    console.log(`Found ${reports.length} reports with shortlisted authors\n`);

    for (const report of reports) {
      console.log(`📝 ${report.processTitle}`);
      console.log(`   Shortlisted Count: ${report.shortlistedCount}`);
      console.log(`   Has Author Details: ${report.shortlistedAuthors ? 'Yes' : 'No'}`);
      
      if (report.shortlistedAuthors) {
        try {
          const authors = JSON.parse(report.shortlistedAuthors);
          console.log(`   Authors (${authors.length}):`);
          authors.forEach((author, idx) => {
            console.log(`     ${idx + 1}. ${author.name}`);
            if (author.email) console.log(`        Email: ${author.email}`);
            if (author.affiliation) console.log(`        Affiliation: ${author.affiliation}`);
          });
        } catch (e) {
          console.log(`   Error parsing: ${e.message}`);
        }
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReport();
