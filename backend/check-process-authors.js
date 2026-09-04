const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProcessAuthors() {
  try {
    const processId = '6d6d7289-d5d7-4c40-a947-e6bf50d2995b';
    
    const process = await prisma.process.findFirst({
      where: { id: processId },
      include: {
        processAuthors: {
          include: {
            author: true
          }
        }
      }
    });

    if (!process) {
      console.log('Process not found');
      return;
    }

    console.log('\n='.repeat(60));
    console.log('PROCESS AUTHORS');
    console.log('='.repeat(60));
    console.log('Process:', process.title);
    console.log('Process ID:', process.id);
    console.log('Total Authors:', process.processAuthors.length);
    console.log('');

    process.processAuthors.forEach((pa, i) => {
      console.log(`${i + 1}. ${pa.author.name}`);
      console.log(`   Email: ${pa.author.email || 'NO EMAIL'}`);
      console.log(`   Author ID: ${pa.author.id}`);
      console.log(`   Role: ${pa.role}`);
      console.log('');
    });

    console.log('='.repeat(60));
    
    if (process.processAuthors.length === 0) {
      console.log('❌ No authors found for this process!');
      console.log('   The reviewers you see in UI are probably from ScholarFinder API,');
      console.log('   but they are not saved as Authors in the database.');
    } else if (process.processAuthors.every(pa => !pa.author.email)) {
      console.log('⚠️  Authors exist but have NO EMAIL addresses!');
      console.log('   The shortlist service maps reviewers by email,');
      console.log('   so it cannot find matching author IDs.');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkProcessAuthors();
