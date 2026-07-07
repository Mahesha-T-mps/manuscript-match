const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAJEPermissions() {
  try {
    console.log('\n🔧 Fixing AJE RQE database permissions...\n');
    
    const databases = ['PubMed', 'TandFonline', 'ScienceDirect', 'WileyLibrary', 'AJE'];
    
    for (const database of databases) {
      const permission = await prisma.databasePermission.upsert({
        where: {
          userType_database: {
            userType: 'AJE RQE',
            database: database
          }
        },
        update: {
          hasAccess: true,  // Grant access to ALL databases
          updatedAt: new Date()
        },
        create: {
          userType: 'AJE RQE',
          database: database,
          hasAccess: true  // Grant access to ALL databases
        }
      });
      
      console.log(`✅ AJE RQE → ${database}: Access Granted`);
    }
    
    console.log('\n✨ AJE RQE permissions fixed!');
    console.log('\n📊 Verifying...\n');
    
    const allPerms = await prisma.databasePermission.findMany({
      where: { userType: 'AJE RQE' }
    });
    
    allPerms.forEach(p => {
      console.log(`   ${p.database}: ${p.hasAccess ? '✅ Access Granted' : '❌ Access Denied'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAJEPermissions();
