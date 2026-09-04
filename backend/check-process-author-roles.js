/**
 * Check what roles are used in ProcessAuthor table
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRoles() {
  try {
    console.log('🔍 Checking ProcessAuthor roles...\n');

    const processAuthors = await prisma.processAuthor.findMany({
      include: {
        author: true,
        process: true
      }
    });

    console.log(`📊 Found ${processAuthors.length} processAuthor entries\n`);

    // Group by role
    const roleGroups = {};
    processAuthors.forEach(pa => {
      if (!roleGroups[pa.role]) {
        roleGroups[pa.role] = [];
      }
      roleGroups[pa.role].push(pa);
    });

    console.log('Roles found:');
    Object.keys(roleGroups).forEach(role => {
      console.log(`  - ${role}: ${roleGroups[role].length} entries`);
    });

    console.log('\n📋 Sample entries by role:\n');
    Object.keys(roleGroups).forEach(role => {
      console.log(`\n${role} (${roleGroups[role].length} total):`);
      roleGroups[role].slice(0, 3).forEach(pa => {
        console.log(`  - Process: ${pa.process.title}`);
        console.log(`    Author: ${pa.author.name}`);
        console.log(`    Role: ${pa.role}`);
      });
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRoles();
