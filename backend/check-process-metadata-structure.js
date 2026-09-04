/**
 * Check process metadata structure to understand where reviewers are stored
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMetadata() {
  try {
    console.log('🔍 Checking process metadata structure...\n');

    // Get all processes with metadata
    const processes = await prisma.process.findMany({
      where: {
        metadata: {
          not: null
        }
      }
    });

    console.log(`📊 Found ${processes.length} processes with metadata\n`);

    for (const process of processes) {
      console.log(`\n📝 Process: ${process.title} (ID: ${process.id})`);
      console.log(`Current Step: ${process.currentStep}`);
      
      try {
        const metadata = typeof process.metadata === 'string' 
          ? JSON.parse(process.metadata) 
          : process.metadata;
        
        console.log('Metadata keys:', Object.keys(metadata));
        
        if (metadata.stepData) {
          console.log('Step Data keys:', Object.keys(metadata.stepData));
          
          if (metadata.stepData.shortlist) {
            console.log('Shortlist Data:', JSON.stringify(metadata.stepData.shortlist, null, 2));
          } else {
            console.log('No shortlist data found');
          }
        } else {
          console.log('No stepData found');
        }
        
        console.log('\nFull Metadata:', JSON.stringify(metadata, null, 2));
      } catch (error) {
        console.error('Error parsing metadata:', error.message);
      }
      
      console.log('\n' + '='.repeat(80));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMetadata();
