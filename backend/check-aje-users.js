const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAJEUsers() {
  try {
    console.log('\n🔍 Checking AJE users...\n');
    
    const ajeUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: 'aje.com'
        }
      },
      select: {
        email: true,
        userType: true,
        role: true,
        name: true
      }
    });

    if (ajeUsers.length === 0) {
      console.log('❌ No AJE users found in database');
    } else {
      console.log(`✅ Found ${ajeUsers.length} AJE users:\n`);
      ajeUsers.forEach(user => {
        console.log(`📧 ${user.email}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   User Type: ${user.userType || 'NOT SET'} ${user.userType === 'AJE RQE' ? '✅' : '❌ WRONG!'}`);
        console.log(`   Role: ${user.role}`);
        console.log('');
      });
    }

    // Check database permissions
    console.log('\n🔍 Checking database permissions for AJE RQE...\n');
    
    const ajePermissions = await prisma.databasePermission.findMany({
      where: {
        userType: 'AJE RQE'
      }
    });

    if (ajePermissions.length === 0) {
      console.log('❌ No database permissions found for AJE RQE');
      console.log('   Run: node scripts/init-database-permissions.js');
    } else {
      console.log(`✅ Found ${ajePermissions.length} permissions for AJE RQE:\n`);
      ajePermissions.forEach(perm => {
        console.log(`   ${perm.database}: ${perm.hasAccess ? '✅ Access Granted' : '❌ Access Denied'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAJEUsers();
