/**
 * Check what fields authors have
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAuthorFields() {
  try {
    const author = await prisma.author.findFirst({
      where: {
        email: {
          not: null
        }
      }
    });

    if (author) {
      console.log('Author fields:', Object.keys(author));
      console.log('\nSample author data:');
      console.log(JSON.stringify(author, null, 2));
    } else {
      console.log('No authors found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAuthorFields();
