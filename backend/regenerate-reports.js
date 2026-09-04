/**
 * Regenerate reports for all processes
 * This will update the shortlisted count based on unique authors
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function regenerateReports() {
  try {
    console.log('\n='.repeat(60));
    console.log('REGENERATING REPORTS');
    console.log('='.repeat(60));

    // Get all processes that have shortlists
    const processes = await prisma.process.findMany({
      where: {
        shortlists: {
          some: {}
        }
      },
      include: {
        shortlists: true,
        processAuthors: true
      }
    });

    console.log(`\nFound ${processes.length} processes with shortlists`);

    for (const process of processes) {
      console.log(`\n📊 Processing: ${process.title}`);
      console.log(`   Shortlists: ${process.shortlists.length}`);
      console.log(`   Authors: ${process.processAuthors.length}`);

      // Count unique authors
      const uniqueAuthorIds = new Set(process.processAuthors.map(pa => pa.authorId));
      const shortlistedCount = uniqueAuthorIds.size;

      console.log(`   Unique authors: ${shortlistedCount}`);

      // Count recommendations (CANDIDATE role)
      const recommendationsCount = process.processAuthors.filter(
        pa => pa.role === 'CANDIDATE'
      ).length;

      console.log(`   Recommendations: ${recommendationsCount}`);

      // Find existing report
      const existingReport = await prisma.userReport.findFirst({
        where: { processId: process.id }
      });

      if (existingReport) {
        // Update existing report
        await prisma.userReport.update({
          where: { id: existingReport.id },
          data: {
            recommendationsCount,
            shortlistedCount,
            reportDate: new Date()
          }
        });
        console.log(`   ✅ Updated report`);
      } else {
        // Create new report
        await prisma.userReport.create({
          data: {
            userId: process.userId,
            processId: process.id,
            processTitle: process.title,
            recommendationsCount,
            shortlistedCount,
            reportDate: new Date()
          }
        });
        console.log(`   ✅ Created new report`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ REPORTS REGENERATED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log('\nNow refresh Custom Reports page to see updated counts!');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

regenerateReports();
