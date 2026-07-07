const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const USER_TYPES = ['SPRINGER', 'WILEY', 'F1000', 'DMP', 'AJE RQE', 'T&F'];
const DATABASES = ['PubMed', 'TandFonline', 'ScienceDirect', 'WileyLibrary', 'AJE'];

async function fixAllPermissions() {
  try {
    console.log('🔧 Setting up database permissions for all user types...\n');

    let updated = 0;

    for (const userType of USER_TYPES) {
      console.log(`\n📋 ${userType}:`);
      
      for (const database of DATABASES) {
        // Default: All users get all databases EXCEPT AJE (only AJE RQE gets AJE)
        const hasAccess = database === 'AJE' ? userType === 'AJE RQE' : true;

        const permission = await prisma.databasePermission.upsert({
          where: {
            userType_database: {
              userType,
              database
            }
          },
          update: {
            hasAccess,
            updatedAt: new Date()
          },
          create: {
            userType,
            database,
            hasAccess
          }
        });

        const icon = hasAccess ? '✅' : '❌';
        console.log(`   ${icon} ${database}`);
        updated++;
      }
    }

    console.log(`\n✨ Updated ${updated} database permissions!`);
    
    console.log('\n📊 Summary by User Type:\n');
    
    for (const userType of USER_TYPES) {
      const perms = await prisma.databasePermission.findMany({
        where: { userType, hasAccess: true }
      });
      const dbList = perms.map(p => p.database).join(', ');
      console.log(`${userType}: ${dbList}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllPermissions();
