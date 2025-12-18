const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeUser() {
  try {
    console.log('🔍 Looking for user: harshith@test.com');

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'harshith@test.com' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true
      }
    });

    if (!existingUser) {
      console.log('⚠️ User harshith@test.com not found');
      return;
    }

    console.log('📋 Found user:', existingUser);

    // Delete the user
    await prisma.user.delete({
      where: { email: 'harshith@test.com' }
    });

    console.log('✅ Successfully removed user: harshith@test.com');

    // Verify deletion
    const verifyUser = await prisma.user.findUnique({
      where: { email: 'harshith@test.com' }
    });

    if (!verifyUser) {
      console.log('🧪 Verification: User successfully deleted');
    } else {
      console.log('❌ Verification failed: User still exists');
    }

  } catch (error) {
    console.error('❌ Error removing user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

removeUser();