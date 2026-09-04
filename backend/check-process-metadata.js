/**
 * Check if authors are stored in process metadata instead of process_authors table
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProcessMetadata() {
  try {
    console.log('Checking process metadata for author data...\n');

    const processes = await prisma.process.findMany({
      orderBy: { createdAt: 'desc' },
    });

    console.log(`Found ${processes.length} processes\n`);
    console.log('='.repeat(80));

    for (const process of processes) {
      console.log(`\nProcess: "${process.title}"`);
      console.log(`  ID: ${process.id}`);
      console.log(`  Status: ${process.status}`);
      console.log(`  Current Step: ${process.currentStep}`);
      
      if (process.metadata) {
        try {
          const metadata = JSON.parse(process.metadata);
          console.log(`  Metadata keys: ${Object.keys(metadata).join(', ')}`);
          
          // Check for common author-related fields
          const authorFields = [
            'authors', 'recommendations', 'shortlist', 'shortlisted',
            'candidates', 'reviewers', 'selectedAuthors', 'manuscriptAuthors'
          ];
          
          authorFields.forEach(field => {
            if (metadata[field]) {
              const data = metadata[field];
              if (Array.isArray(data)) {
                console.log(`  Found ${field}: ${data.length} items`);
                if (data.length > 0) {
                  console.log(`    Sample:`, data[0]);
                }
              } else if (typeof data === 'object') {
                console.log(`  Found ${field}:`, Object.keys(data));
              } else {
                console.log(`  Found ${field}:`, data);
              }
            }
          });
          
          if (Object.keys(metadata).length > 0) {
            console.log(`\n  Full metadata structure:`);
            console.log(JSON.stringify(metadata, null, 2).substring(0, 500) + '...');
          }
        } catch (e) {
          console.log(`  ⚠️  Failed to parse metadata: ${e.message}`);
        }
      } else {
        console.log(`  No metadata found`);
      }
      
      console.log('-'.repeat(80));
    }

    console.log('\n' + '='.repeat(80));
    console.log('CONCLUSION');
    console.log('='.repeat(80));
    console.log('\nIf authors are stored in metadata (not process_authors table),');
    console.log('we need to extract them and populate the process_authors table.');
    console.log('\nThis would allow reports to be generated correctly.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProcessMetadata();
