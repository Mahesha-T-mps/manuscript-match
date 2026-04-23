const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserTypes() {
  try {
    console.log('🔍 Checking user types in database...\n');
    
    // Get all users and their userType
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        userType: true,
        createdAt: true
      }
    });
    
    console.log(`Found ${users.length} users:\n`);
    
    users.forEach(user => {
      console.log(`📧 ${user.email}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   User Type: ${user.userType || 'NOT SET'}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });
    
    // Check if userType column exists by trying to update
    console.log('🧪 Testing userType field update...');
    const testUser = users.find(u => u.email === 'springer.test@example.com');
    if (testUser) {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { userType: 'SPRINGER' }
      });
      console.log('✅ userType field update successful');
      
      // Verify the update
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
        select: { email: true, userType: true }
      });
      console.log(`✅ Verified: ${updatedUser.email} now has userType: ${updatedUser.userType}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking user types:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserTypes();