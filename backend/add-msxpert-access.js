const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addMSXpertAccess() {
  try {
    console.log('🔧 Adding MSXpert access to users...\n');
    
    // Give MSXpert access to specific users
    const usersToUpdate = [
      'admin@test.com',           // Admin user
      'springer.admin@example.com', // Springer admin
      'wiley.test@example.com',   // Wiley test user
      'f1000.test@example.com',   // F1000 test user
    ];
    
    for (const email of usersToUpdate) {
      const user = await prisma.user.findUnique({
        where: { email }
      });
      
      if (user) {
        await prisma.user.update({
          where: { email },
          data: { msxpertAccess: true }
        });
        console.log(`✅ Added MSXpert access to: ${email}`);
      } else {
        console.log(`❌ User not found: ${email}`);
      }
    }
    
    // Give MSXpert access to all ADMIN users
    const adminUsers = await prisma.user.updateMany({
      where: { role: 'ADMIN' },
      data: { msxpertAccess: true }
    });
    
    console.log(`\n✅ Added MSXpert access to ${adminUsers.count} admin users`);
    
    // Show summary
    const usersWithAccess = await prisma.user.findMany({
      where: { msxpertAccess: true },
      select: { email: true, role: true, userType: true }
    });
    
    console.log('\n📋 Users with MSXpert access:');
    console.log('================================');
    usersWithAccess.forEach(user => {
      console.log(`${user.email} (${user.role} - ${user.userType})`);
    });
    
    console.log(`\n🎉 Total users with MSXpert access: ${usersWithAccess.length}`);
    
  } catch (error) {
    console.error('❌ Error adding MSXpert access:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMSXpertAccess();