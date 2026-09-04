/**
 * Add a reviewer as an author to a process
 * This syncs ScholarFinder reviewers with ManuscriptMatch database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addReviewerToProcess() {
  try {
    const processId = 'ced089aa-d605-45db-951c-e9db2dd17a85';
    const reviewerEmail = 'marcelor1@hotmail.com';
    const reviewerName = 'Marcelo Rudzinski';

    console.log('\n='.repeat(60));
    console.log('ADDING REVIEWER TO DATABASE');
    console.log('='.repeat(60));

    // 1. Check if author already exists
    let author = await prisma.author.findFirst({
      where: { email: reviewerEmail }
    });

    if (author) {
      console.log('✓ Author already exists:', author.name);
    } else {
      // 2. Create author
      author = await prisma.author.create({
        data: {
          name: reviewerName,
          email: reviewerEmail,
          publicationCount: 14, // From your reviewer data
          clinicalTrials: 0,
          retractions: 0
        }
      });
      console.log('✓ Created author:', author.name);
    }

    // 3. Link author to process
    const existing = await prisma.processAuthor.findFirst({
      where: {
        processId,
        authorId: author.id,
        role: 'CANDIDATE'
      }
    });

    if (existing) {
      console.log('✓ Author already linked to process');
    } else {
      await prisma.processAuthor.create({
        data: {
          processId,
          authorId: author.id,
          role: 'CANDIDATE'
        }
      });
      console.log('✓ Linked author to process');
    }

    console.log('\n='.repeat(60));
    console.log('SUCCESS!');
    console.log('='.repeat(60));
    console.log('Author ID:', author.id);
    console.log('Email:', author.email);
    console.log('');
    console.log('Now try creating the shortlist again!');
    console.log('The service should be able to map the email to author ID.');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

addReviewerToProcess();
