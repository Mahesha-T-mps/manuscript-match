const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function addTwoNewUsers() {
  try {
    console.log('🔍 Adding two new MPS users...');

    // Define the two new users
    const newUsers = [
      { email: 'sivanandini.nedunchezhian@mpslimited.com', firstName: 'Sivanandini', password: 'Sivanandini4582', role: 'USER' },
      { email: 'abaaranjita@mpslimited.com', firstName: 'Abaaranjita', password: 'Abaaranjita7293', role: 'USER' }
    ];

    let successCount = 0;
    let skipCount = 0;

    for (const userData of newUsers) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: userData.email }
        });

        if (existingUser) {
          console.log(`⚠️ User already exists: ${userData.email}`);
          skipCount++;
          continue;
        }

        console.log(`🔐 Creating user: ${userData.email}`);

        // Hash password with bcrypt
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(userData.password, saltRounds);

        const user = await prisma.user.create({
          data: {
            email: userData.email,
            passwordHash,
            role: userData.role,
            status: 'ACTIVE'
          }
        });

        console.log(`✅ Created user: ${user.email} - Password: ${userData.password}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }

    console.log('\n🎉 Summary:');
    console.log(`✅ Successfully created: ${successCount} users`);
    console.log(`⚠️ Already existed: ${skipCount} users`);

    if (successCount > 0) {
      console.log('\n📝 New user credentials:');
      newUsers.forEach(user => {
        console.log(`${user.email} / ${user.password}`);
      });
    }

  } catch (error) {
    console.error('❌ Error adding new users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTwoNewUsers();