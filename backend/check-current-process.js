const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProcess() {
  try {
    const processId = 'ced089aa-d605-45db-951c-e9db2dd17a85';
    
    const process = await prisma.process.findFirst({
      where: { id: processId },
      include: {
        processAuthors: {
          include: { author: true }
        }
      }
    });

    console.log('\n='.repeat(60));
    console.log('CURRENT PROCESS CHECK');
    console.log('='.repeat(60));
    console.log('Process ID:', processId);
    console.log('Process Title:', process?.title || 'NOT FOUND');
    console.log('Authors Count:', process?.processAuthors?.length || 0);
    console.log('');

    if (process && process.processAuthors.length > 0) {
      console.log('Authors:');
      process.processAuthors.forEach((pa, i) => {
        console.log(`${i + 1}. ${pa.author.name} (${pa.author.email})`);
      });
    } else {
      console.log('❌ NO AUTHORS IN DATABASE for this process!');
      console.log('');
      console.log('This is why the shortlist cannot be saved:');
      console.log('- You selected reviewer: marcelor1@hotmail.com');
      console.log('- But this email does not exist in database authors');
      console.log('- So author ID mapping returns empty array');
      console.log('- Backend sync is skipped');
    }

    console.log('\n' + '='.repeat(60));

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkProcess();
