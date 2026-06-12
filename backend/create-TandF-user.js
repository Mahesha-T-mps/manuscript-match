const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTandFUsers() {
  try {
    console.log('🔍 Creating T&F users...');

    // Define the TandF users from the credentials file
    const tandfUsers = [
      { name: 'Harini Varadarajan', email: 'harini.v@tandfindia.com', password: 'Harini@2846', role: 'USER' },
      { name: 'Haritha Dharmaraj', email: 'haritha.dharmaraj@tandfindia.com', password: 'Haritha@5639', role: 'USER' },
      { name: 'Sudeshna Mukherjee', email: 'sudeshna.mukherjee@tandfindia.com', password: 'Sudeshna@8174', role: 'USER' },
      { name: 'Ruchika Aggarwal', email: 'ruchika.aggarwal@tandfindia.com', password: 'Ruchika@3925', role: 'USER' },
      { name: 'Prajukta Priyadarshini', email: 'prajukta.priyadarshini@tandfindia.com', password: 'Prajukta@8008', role: 'USER' },
      { name: 'Isha Chandra', email: 'isha.chandra@tandfindia.com', password: 'Isha@5392', role: 'USER' },
      { name: 'Neha Bakshi', email: 'neha.bakshi@tandfindia.com', password: 'Neha@3125', role: 'USER' },
      { name: 'Sukrit Bhattacharyya', email: 'sukrit.bhattacharyya@tandfindia.com', password: 'Sukrit@9185', role: 'USER' }
    ];

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    console.log(`📊 Processing ${tandfUsers.length} T&F users...`);

    for (const userData of tandfUsers) {
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

    console.log('\n🎉 T&F Users Creation Summary:');
    console.log(`✅ Successfully created: ${successCount} users`);
    console.log(`⚠️ Already existed: ${skipCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log(`📊 Total processed: ${tandfUsers.length} users`);

    if (successCount > 0) {
      console.log('\n📝 Login credentials for new T&F users:');
      tandfUsers.forEach(user => {
        console.log(`${user.name}: ${user.email} / ${user.password}`);
      });
    }

  } catch (error) {
    console.error('❌ Error creating T&F users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTandFUsers();