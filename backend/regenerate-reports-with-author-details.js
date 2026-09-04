/**
 * Regenerate all user reports with shortlisted author details
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function regenerateReports() {
  try {
    console.log('🔄 Regenerating reports with author details...\n');

    // Get all processes
    const processes = await prisma.process.findMany({
      include: {
        processAuthors: {
          include: {
            author: {
              include: {
                affiliations: {
                  include: {
                    affiliation: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log(`📊 Found ${processes.length} processes\n`);

    let updated = 0;
    let created = 0;

    for (const process of processes) {
      try {
        // Count candidates and shortlisted
        const candidateCount = process.processAuthors.filter(
          pa => pa.role === 'CANDIDATE'
        ).length;

        const shortlistedCount = process.processAuthors.filter(
          pa => pa.role === 'SHORTLISTED'
        ).length;

        const reviewersCount = candidateCount > 0 ? candidateCount : shortlistedCount;
        const recommendationsCount = reviewersCount;

        // Get shortlisted author details
        const shortlistedAuthorsData = process.processAuthors
          .filter(pa => pa.role === 'SHORTLISTED')
          .map(pa => ({
            name: pa.author.name,
            email: pa.author.email || undefined,
            affiliation: pa.author.affiliations?.[0]?.affiliation?.institutionName || undefined,
          }));

        console.log(`📝 ${process.title}`);
        console.log(`   - Shortlisted: ${shortlistedCount}`);
        console.log(`   - Author details: ${shortlistedAuthorsData.length}`);

        // Check if report exists
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
              reviewersCount,
              shortlistedAuthors: shortlistedAuthorsData.length > 0 
                ? JSON.stringify(shortlistedAuthorsData) 
                : null,
              reportDate: new Date(),
            },
          });
          updated++;
          console.log(`   ✓ Updated\n`);
        } else {
          // Create new report
          await prisma.userReport.create({
            data: {
              userId: process.userId,
              processId: process.id,
              processTitle: process.title,
              recommendationsCount,
              shortlistedCount,
              reviewersCount,
              shortlistedAuthors: shortlistedAuthorsData.length > 0 
                ? JSON.stringify(shortlistedAuthorsData) 
                : null,
              reportDate: new Date(),
            },
          });
          created++;
          console.log(`   ✓ Created\n`);
        }
      } catch (error) {
        console.error(`   ✗ Error: ${error.message}\n`);
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   - Updated: ${updated}`);
    console.log(`   - Created: ${created}`);
    console.log(`   - Total: ${processes.length}`);
    console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateReports();
