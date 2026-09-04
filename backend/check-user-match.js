const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserMatch() {
  try {
    console.log('\n='.repeat(60));
    console.log('USER OWNERSHIP CHECK');
    console.log('='.repeat(60));

    // Check shortlists
    const shortlists = await prisma.shortlist.findMany({
      include: {
        process: {
          select: { userId: true, title: true }
        }
      }
    });

    console.log('\nSHORTLISTS (by Process Owner):');
    shortlists.forEach(s => {
      console.log(`- "${s.name}"`);
      console.log(`  Process: ${s.process.title}`);
      console.log(`  Owner: ${s.process.userId}`);
    });

    // Check reports
    const reports = await prisma.userReport.findMany();
    
    console.log('\n\nREPORTS (by User):');
    reports.forEach(r => {
      console.log(`- Process: ${r.processTitle}`);
      console.log(`  User: ${r.userId}`);
      console.log(`  Shortlisted: ${r.shortlistedCount}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('The Custom Reports API filters by userId');
    console.log('You must be logged in as the user who owns the reports');
    console.log('='.repeat(60));

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkUserMatch();
