const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTeamUsers() {
  try {
    console.log('🔍 Creating team users...');

    // Define the team users
    const teamUsers = [
      { name: 'Niranjan', email: 'niranjan@test.com', password: 'niranjan123' },
      { name: 'Navya', email: 'navya@test.com', password: 'navya123' },
      { name: 'Mithun', email: 'mithun@test.com', password: 'mithun123' },
      { name: 'Shashank', email: 'shashank@test.com', password: 'shashank123' },
      { name: 'Bhushitha', email: 'bhushitha@test.com', password: 'bhushitha123' },
      { name: 'Kalpesh', email: 'kalpesh@test.com', password: 'kalpesh123' },
      { name: 'Anikt', email: 'anikt@test.com', password: 'anikt123' },
      { name: 'Harshit', email: 'harshit@test.com', password: 'harshit123' }
    ];

    // Check for existing users and delete them if they exist
    const existingEmails = teamUsers.map(user => user.email);
    const existingUsers = await prisma.user.findMany({
      where: {
        email: {
          in: existingEmails
        }
      },
      select: { email: true }
    });

    if (existingUsers.length > 0) {
      console.log('🗑️ Removing existing team users:', existingUsers.map(u => u.email));
      await prisma.user.deleteMany({
        where: {
          email: {
            in: existingEmails
          }
        }
      });
    }

    // Create new users
    console.log('👥 Creating team users...');
    const saltRounds = 12;

    for (const userData of teamUsers) {
      console.log(`🔐 Creating user: ${userData.name} (${userData.email})`);

      // Hash password with bcrypt
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      const user = await prisma.user.create({
        data: {
          email: userData.email,
          passwordHash,
          role: 'USER',
          status: 'ACTIVE'
        }
      });

      console.log(`✅ Created user: ${user.email} - ID: ${user.id}`);

      // Test password verification
      const isValid = await bcrypt.compare(userData.password, passwordHash);
      console.log(`🧪 Password verification for ${userData.email}: ${isValid ? '✅ PASS' : '❌ FAIL'}`);
    }

    console.log('\n🎉 All team users created successfully!');
    console.log('\n📝 Login credentials:');
    teamUsers.forEach(user => {
      console.log(`${user.name}: ${user.email} / ${user.password}`);
    });

    console.log('\n🚀 Users are ready to login to the system!');

  } catch (error) {
    console.error('❌ Error creating team users:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

createTeamUsers();