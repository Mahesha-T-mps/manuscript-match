/**
 * Display all shortlist-related data from database
 * This shows what's actually stored in the database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function displayDatabaseContent() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('DATABASE CONTENT - SHORTLIST DATA');
    console.log('='.repeat(80));

    // 1. Check Processes
    console.log('\n📁 PROCESSES:');
    console.log('-'.repeat(80));
    const processes = await prisma.process.findMany({
      select: {
        id: true,
        title: true,
        userId: true,
        status: true,
        currentStep: true,
        createdAt: true,
        _count: {
          select: {
            shortlists: true,
            processAuthors: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (processes.length === 0) {
      console.log('❌ No processes found in database');
    } else {
      processes.forEach((process, i) => {
        console.log(`\n${i + 1}. Process: ${process.title}`);
        console.log(`   ID: ${process.id}`);
        console.log(`   User ID: ${process.userId}`);
        console.log(`   Status: ${process.status}`);
        console.log(`   Current Step: ${process.currentStep}`);
        console.log(`   Created: ${process.createdAt.toISOString()}`);
        console.log(`   Authors: ${process._count.processAuthors}`);
        console.log(`   Shortlists: ${process._count.shortlists}`);
      });
    }

    // 2. Check Shortlisted Reviewers
    console.log('\n\n⭐ SHORTLISTS:');
    console.log('-'.repeat(80));
    const shortlists = await prisma.shortlist.findMany({
      include: {
        process: {
          select: {
            id: true,
            title: true,
            userId: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    if (shortlists.length === 0) {
      console.log('❌ No shortlists found in database');
      console.log('\nThis means:');
      console.log('- No reviewers have been shortlisted yet');
      console.log('- OR the shortlist data is not being saved properly');
    } else {
      console.log(`Found ${shortlists.length} shortlists\n`);
      
      // Group by process
      const byProcess = {};
      shortlists.forEach(sl => {
        const processId = sl.processId;
        if (!byProcess[processId]) {
          byProcess[processId] = {
            process: sl.process,
            shortlists: []
          };
        }
        byProcess[processId].shortlists.push(sl);
      });

      Object.values(byProcess).forEach((group, i) => {
        console.log(`\n${i + 1}. Process: ${group.process.title}`);
        console.log(`   Process ID: ${group.process.id}`);
        console.log(`   User ID: ${group.process.userId}`);
        console.log(`   Shortlists: ${group.shortlists.length}`);
        console.log('');
        
        group.shortlists.forEach((shortlist, j) => {
          console.log(`   ${j + 1}. ${shortlist.name}`);
          console.log(`      ID: ${shortlist.id}`);
          console.log(`      Added: ${shortlist.createdAt.toISOString()}`);
          console.log('');
        });
      });
    }

    // 3. Check Authors
    console.log('\n\n👤 AUTHORS:');
    console.log('-'.repeat(80));
    const authors = await prisma.author.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        publicationCount: true,
        clinicalTrials: true,
        retractions: true,
        createdAt: true,
        _count: {
          select: {
            processAuthors: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    if (authors.length === 0) {
      console.log('❌ No authors found in database');
    } else {
      console.log(`Found ${authors.length} authors\n`);
      
      authors.forEach((author, i) => {
        console.log(`${i + 1}. ${author.name || 'No Name'}`);
        console.log(`   Email: ${author.email || 'No Email'}`);
        console.log(`   Publications: ${author.publicationCount}`);
        console.log(`   Clinical Trials: ${author.clinicalTrials}`);
        console.log(`   Retractions: ${author.retractions}`);
        console.log(`   Used in Processes: ${author._count.processAuthors}`);
        console.log(`   Created: ${author.createdAt.toISOString()}`);
        console.log('');
      });
    }

    // 4. Check User Reports
    console.log('\n\n📊 USER REPORTS:');
    console.log('-'.repeat(80));
    const reports = await prisma.userReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (reports.length === 0) {
      console.log('❌ No user reports found in database');
    } else {
      reports.forEach((report, i) => {
        console.log(`\n${i + 1}. Report for User: ${report.userId}`);
        console.log(`   Process: ${report.processTitle}`);
        console.log(`   Process ID: ${report.processId}`);
        console.log(`   Recommendations: ${report.recommendationsCount}`);
        console.log(`   Shortlisted: ${report.shortlistedCount}`);
        console.log(`   Report Date: ${report.reportDate.toISOString()}`);
      });
    }

    // 5. Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Processes: ${processes.length}`);
    console.log(`Total Shortlists: ${shortlists.length}`);
    console.log(`Total Authors: ${authors.length}`);
    console.log(`Total Reports: ${reports.length}`);
    
    if (shortlists.length === 0) {
      console.log('\n⚠️  WARNING: No shortlists in database!');
      console.log('\nPossible reasons:');
      console.log('1. Reviewers haven\'t been shortlisted yet in the UI');
      console.log('2. The shortlist API is not saving to database');
      console.log('3. The database table exists but is empty');
      console.log('\nNext steps:');
      console.log('- Try shortlisting a reviewer in the UI');
      console.log('- Check Network tab to see if API request succeeds');
      console.log('- Run this script again to verify data was saved');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

displayDatabaseContent();
