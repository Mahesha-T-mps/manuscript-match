const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAJEUsers() {
  try {
    console.log('🔍 Creating AJE users...');

    // Define the AJE users from the credentials file
    const ajeUsers = [
      { name: 'Pinkal Ghanekar', email: 'pinkal.ghanekar@aje.com', password: 'Pinkal@2847', role: 'USER' },
      { name: 'Ruchira Sutar', email: 'ruchira.sutar@aje.com', password: 'Ruchira@5639', role: 'USER' },
      { name: 'Darshini Shah', email: 'darshini.shah@aje.com', password: 'Darshini@8174', role: 'USER' },
      { name: 'Abhishek Sinha', email: 'abhishek.sinha@aje.com', password: 'Abhishek@3925', role: 'USER' },
      { name: 'Anshu Kadam', email: 'anshu.kadam@aje.com', password: 'Anshu@7461', role: 'USER' },
      { name: 'Kshitija Bhosekar', email: 'kshitija.bhosekar@aje.com', password: 'Kshitija@9283', role: 'USER' },
      { name: 'Yogesh Pai', email: 'yogesh.pai@mpslimited.com', password: 'Yogesh@5746', role: 'USER' }
    ];

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    console.log(`📊 Processing ${ajeUsers.length} AJE users...`);

    for (const userData of ajeUsers) {
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

        console.log(`✅ Created user: ${user.email} - ID: ${user.id}`);
        successCount++;

        // Test password verification
        const isValid = await bcrypt.compare(userData.password, passwordHash);
        if (!isValid) {
          console.log(`❌ Password verification failed for ${userData.email}`);
        } else {
          console.log(`🧪 Password verification for ${userData.email}: ✅ PASS`);
        }

      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n🎉 AJE Users Creation Summary:');
    console.log(`✅ Successfully created: ${successCount} users`);
    console.log(`⚠️ Already existed: ${skipCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log(`📊 Total processed: ${ajeUsers.length} users`);

    if (successCount > 0) {
      console.log('\n📝 Login credentials for new AJE users:');
      ajeUsers.forEach(user => {
        console.log(`${user.name}: ${user.email} / ${user.password}`);
      });
    }

  } catch (error) {
    console.error('❌ Error creating AJE users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAJEUsers();