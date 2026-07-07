const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUserPermissionsAPI() {
  try {
    console.log('\n🔍 Simulating API call for AJE RQE user...\n');
    
    // Simulate what the API does
    const userType = 'AJE RQE';
    
    // Fetch permissions for user's type from database
    const permissions = await prisma.databasePermission.findMany({
      where: {
        userType: userType,
        hasAccess: true
      }
    });

    // Extract accessible database names
    const accessibleDatabases = permissions.map(p => p.database);

    console.log(`User Type: ${userType}`);
    console.log(`Accessible Databases: ${accessibleDatabases.join(', ')}\n`);
    
    console.log('Expected databases in frontend:');
    accessibleDatabases.forEach(db => {
      console.log(`  ✅ ${db}`);
    });

    console.log('\n📊 All permissions for AJE RQE:');
    const allPerms = await prisma.databasePermission.findMany({
      where: { userType: 'AJE RQE' }
    });
    allPerms.forEach(p => {
      console.log(`  ${p.database}: ${p.hasAccess ? '✅ Granted' : '❌ Denied'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testUserPermissionsAPI();
