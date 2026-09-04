/**
 * Add test data to generate custom reports
 * This creates test authors and assigns them to a process
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addTestData() {
  try {
    console.log('Adding test data for Custom Reports...\n');

    // Get first completed process
    let process = await prisma.process.findFirst({
      where: { status: 'COMPLETED' },
    });

    if (!process) {
      // If no completed process, get any process
      process = await prisma.process.findFirst();
    }

    if (!process) {
      console.error('❌ No processes found. Please create a process first.');
      return;
    }

    console.log(`✓ Using process: "${process.title}" (${process.id})\n`);

    // Create 10 test authors
    console.log('Creating 10 test authors...');
    const authorIds = [];
    
    for (let i = 1; i <= 10; i++) {
      const author = await prisma.author.create({
        data: {
          name: `Dr. Test Reviewer ${i}`,
          email: `test.reviewer${i}@example.com`,
          publicationCount: Math.floor(Math.random() * 50) + 10,
          clinicalTrials: Math.floor(Math.random() * 10),
          retractions: Math.random() < 0.9 ? 0 : 1, // 10% chance of 1 retraction
          researchAreas: JSON.stringify(['Cardiology', 'Clinical Research', 'Medical Testing']),
        },
      });
      authorIds.push(author.id);
      console.log(`  ✓ Created: ${author.name}`);
    }

    console.log(`\n✓ Created ${authorIds.length} test authors\n`);

    // Add all 10 as CANDIDATE (recommendations)
    console.log('Adding authors as CANDIDATES (recommendations)...');
    for (const authorId of authorIds) {
      await prisma.processAuthor.create({
        data: {
          processId: process.id,
          authorId: authorId,
          role: 'CANDIDATE',
        },
      });
    }
    console.log(`✓ Added ${authorIds.length} authors to Recommendations (CANDIDATE role)\n`);

    // Add 4 as SHORTLISTED
    console.log('Adding 4 authors to SHORTLISTED...');
    for (let i = 0; i < 4; i++) {
      await prisma.processAuthor.create({
        data: {
          processId: process.id,
          authorId: authorIds[i],
          role: 'SHORTLISTED',
        },
      });
    }
    console.log(`✓ Added 4 authors to Shortlist (SHORTLISTED role)\n`);

    // Generate report
    console.log('Generating custom report...');
    
    // Count recommendations and shortlisted
    const processWithAuthors = await prisma.process.findUnique({
      where: { id: process.id },
      include: {
        processAuthors: true,
      },
    });

    const recommendationsCount = processWithAuthors.processAuthors.filter(
      pa => pa.role === 'CANDIDATE'
    ).length;

    const shortlistedCount = processWithAuthors.processAuthors.filter(
      pa => pa.role === 'SHORTLISTED'
    ).length;

    // Create report
    const report = await prisma.userReport.create({
      data: {
        userId: process.userId,
        processId: process.id,
        processTitle: process.title,
        recommendationsCount,
        shortlistedCount,
        reportDate: new Date(),
      },
    });

    console.log('✓ Report generated successfully!\n');
    console.log('─'.repeat(60));
    console.log('REPORT SUMMARY');
    console.log('─'.repeat(60));
    console.log(`Process: ${process.title}`);
    console.log(`Recommendations Count: ${report.recommendationsCount}`);
    console.log(`Shortlisted Count: ${report.shortlistedCount}`);
    console.log(`Conversion Rate: ${((report.shortlistedCount / report.recommendationsCount) * 100).toFixed(1)}%`);
    console.log(`Report Date: ${report.reportDate.toISOString()}`);
    console.log('─'.repeat(60));

    console.log('\n✅ Test data added successfully!');
    console.log('\n📊 Next steps:');
    console.log('  1. Go to your application');
    console.log('  2. Navigate to Reports → Custom Reports');
    console.log('  3. You should now see:');
    console.log(`     - Total Processes: 1`);
    console.log(`     - Total Recommendations: ${recommendationsCount}`);
    console.log(`     - Total Shortlisted: ${shortlistedCount}`);
    console.log(`     - Conversion Rate: ${((shortlistedCount / recommendationsCount) * 100).toFixed(1)}%`);
    console.log('  4. Chart and table will display the data\n');

  } catch (error) {
    console.error('❌ Error adding test data:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestData();
