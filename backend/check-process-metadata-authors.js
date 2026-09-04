/**
 * Check process metadata for author/affiliation data
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMetadata() {
  try {
    const process = await prisma.process.findFirst({
      where: {
        title: {
          contains: 'custom test3'
        }
      }
    });

    if (!process) {
      console.log('Process not found');
      return;
    }

    console.log('Process:', process.title);
    console.log('\nMetadata:', process.metadata);
    
    if (process.metadata) {
      try {
        const parsed = JSON.parse(process.metadata);
        console.log('\nParsed metadata keys:', Object.keys(parsed));
        
        if (parsed.authors) {
          console.log('\nAuthors in metadata:');
          parsed.authors.forEach((author, idx) => {
            console.log(`  ${idx + 1}. ${author.name || 'No name'}`);
            console.log(`     Email: ${author.email || 'N/A'}`);
            console.log(`     Affiliations:`, author.affiliations || 'None');
          });
        } else {
          console.log('\nNo authors in metadata');
        }
      } catch (e) {
        console.log('Error parsing:', e.message);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMetadata();
