/**
 * Check if authors have affiliation data
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAffiliations() {
  try {
    console.log('🔍 Checking author affiliations...\n');

    // Get some shortlisted authors
    const processAuthors = await prisma.processAuthor.findMany({
      where: {
        role: 'SHORTLISTED'
      },
      take: 5,
      include: {
        author: {
          include: {
            affiliations: {
              include: {
                affiliation: true,
              },
            },
          },
        },
      },
    });

    console.log(`Found ${processAuthors.length} shortlisted authors\n`);

    for (const pa of processAuthors) {
      console.log(`📝 ${pa.author.name}`);
      console.log(`   Email: ${pa.author.email || 'N/A'}`);
      console.log(`   Affiliations count: ${pa.author.affiliations?.length || 0}`);
      
      if (pa.author.affiliations && pa.author.affiliations.length > 0) {
        pa.author.affiliations.forEach((af, idx) => {
          console.log(`   Affiliation ${idx + 1}:`);
          console.log(`     ID: ${af.affiliation.id}`);
          console.log(`     Institution: ${af.affiliation.institutionName}`);
          console.log(`     Department: ${af.affiliation.department || 'N/A'}`);
          console.log(`     Country: ${af.affiliation.country}`);
        });
      } else {
        console.log(`   ⚠️  No affiliations found`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAffiliations();
