/**
 * Regenerate all user reports with reviewers count
 * This script updates existing reports to include the reviewersCount field
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function regenerateReports() {
  try {
    console.log('🔄 Starting report regeneration with reviewers count...\n');

    // Get all processes
    const processes = await prisma.process.findMany({
      include: {
        processAuthors: {
          include: {
            author: true,
          },
        },
        shortlists: true,
      },
    });

    console.log(`📊 Found ${processes.length} processes to process\n`);

    let updated = 0;
    let created = 0;
    let skipped = 0;

    for (const process of processes) {
      try {
        // Count candidates and shortlisted
        const candidateCount = process.processAuthors.filter(
          pa => pa.role === 'CANDIDATE'
        ).length;

        const shortlistedCount = process.processAuthors.filter(
          pa => pa.role === 'SHORTLISTED'
        ).length;

        // Total reviewers = candidates OR shortlisted if no candidates
        const reviewersCount = candidateCount > 0 ? candidateCount : shortlistedCount;
        const recommendationsCount = reviewersCount;

        console.log(`Process: ${process.title}`);
        console.log(`  - CANDIDATE: ${candidateCount}`);
        console.log(`  - SHORTLISTED: ${shortlistedCount}`);
        console.log(`  - Total Reviewers: ${reviewersCount}`);

        // Check if report already exists
        const existingReport = await prisma.userReport.findFirst({
          where: {
            processId: process.id,
          },
        });

        if (existingReport) {
          // Update existing report
          await prisma.userReport.update({
            where: { id: existingReport.id },
            data: {
              processTitle: process.title,
              recommendationsCount,
              shortlistedCount,
              reviewersCount, // Add reviewers count
              reportDate: new Date(),
            },
          });
          updated++;
          console.log(`  ✓ Updated existing report\n`);
        } else {
          // Create new report
          await prisma.userReport.create({
            data: {
              userId: process.userId,
              processId: process.id,
              processTitle: process.title,
              recommendationsCount,
              shortlistedCount,
              reviewersCount, // Add reviewers count
              reportDate: new Date(),
            },
          });
          created++;
          console.log(`  ✓ Created new report\n`);
        }
      } catch (error) {
        console.error(`  ✗ Error processing process ${process.id}:`, error.message);
        skipped++;
      }
    }

    console.log('\n📈 Summary:');
    console.log(`  - Updated: ${updated}`);
    console.log(`  - Created: ${created}`);
    console.log(`  - Skipped: ${skipped}`);
    console.log(`  - Total: ${processes.length}`);
    console.log('\n✅ Report regeneration complete!');

  } catch (error) {
    console.error('❌ Error regenerating reports:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateReports();
