/**
 * Generate reports for all existing processes
 * This script will create/update reports for processes that already have shortlists
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function generateReportsForExistingProcesses() {
  try {
    console.log('Starting report generation for existing processes...\n');

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

    console.log(`Found ${processes.length} processes\n`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const process of processes) {
      // Count recommendations (authors with RECOMMENDATION role)
      const recommendationsCount = process.processAuthors.filter(
        pa => pa.role === 'RECOMMENDATION'
      ).length;

      // Count shortlisted authors (authors with SHORTLIST role)
      const shortlistedCount = process.processAuthors.filter(
        pa => pa.role === 'SHORTLIST'
      ).length;

      // Only create report if there are recommendations or shortlists
      if (recommendationsCount > 0 || shortlistedCount > 0) {
        // Check if report already exists
        const existingReport = await prisma.userReport.findFirst({
          where: { processId: process.id },
        });

        if (existingReport) {
          // Update existing report
          await prisma.userReport.update({
            where: { id: existingReport.id },
            data: {
              processTitle: process.title,
              recommendationsCount,
              shortlistedCount,
              reportDate: new Date(),
            },
          });
          console.log(`✓ Updated report for process: ${process.title}`);
          console.log(`  Recommendations: ${recommendationsCount}, Shortlisted: ${shortlistedCount}`);
        } else {
          // Create new report
          await prisma.userReport.create({
            data: {
              userId: process.userId,
              processId: process.id,
              processTitle: process.title,
              recommendationsCount,
              shortlistedCount,
              reportDate: new Date(),
            },
          });
          console.log(`✓ Created report for process: ${process.title}`);
          console.log(`  Recommendations: ${recommendationsCount}, Shortlisted: ${shortlistedCount}`);
          createdCount++;
        }
      } else {
        console.log(`⊘ Skipped process (no data): ${process.title}`);
        skippedCount++;
      }
    }

    console.log('\n--- Summary ---');
    console.log(`Total processes: ${processes.length}`);
    console.log(`Reports created/updated: ${createdCount}`);
    console.log(`Processes skipped: ${skippedCount}`);
    console.log('\n✓ Report generation completed successfully!');

  } catch (error) {
    console.error('Error generating reports:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateReportsForExistingProcesses();
